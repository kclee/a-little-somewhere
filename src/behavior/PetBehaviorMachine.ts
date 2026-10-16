import type { PetModel, PetState, Point, WorldSize } from '../core/types';
import { clampFloorPoint, getMovementBounds } from '../core/RoomGeometry';

type RandomSource = () => number;

const WALK_SPEED = 48;
const JOG_SPEED = WALK_SPEED * 5;
const ATTENTION_SECONDS = 1.15;
const ARRIVAL_ATTENTION_SECONDS = 1.75;
const WALL_WAG_SECONDS = 2.5;
export const FROG_PLAY_SECONDS = 4.8;
const JOG_DISTANCE = 150;
const WALL_NEAR_DISTANCE = 10;
const AUTONOMOUS_FACING_DEADZONE = 8;
export const FLOOR_SLEEP_CONFIG = {
  chanceAfterIdle: 0.08,
  awakeMinSeconds: 3,
  awakeRangeSeconds: 2,
  asleepMinSeconds: 8,
  asleepRangeSeconds: 7,
  wakeSeconds: 1,
  cooldownSeconds: 45,
} as const;
export const CAMERA_GREETING_CONFIG = {
  firstMinSeconds: 120,
  firstRangeSeconds: 120,
  subsequentMinSeconds: 300,
  subsequentRangeSeconds: 180,
  heartStartSeconds: 0.06,
  heartDurationSeconds: 0.8,
  heartGapSeconds: 0.3,
  happyBeforeTailSeconds: 0.1,
  popSeconds: 0.16,
  closeupSeconds: 2.6,
  popOutSeconds: 0.16,
  happyAfterSeconds: 0.68,
} as const;

export function getCameraHappyBeforeDuration(heartCount: number): number {
  return CAMERA_GREETING_CONFIG.heartStartSeconds
    + (Math.max(1, heartCount) - 1) * CAMERA_GREETING_CONFIG.heartGapSeconds
    + CAMERA_GREETING_CONFIG.heartDurationSeconds
    + CAMERA_GREETING_CONFIG.happyBeforeTailSeconds;
}
type ArrivalAction = 'attention' | 'wallWag' | 'donutRest' | 'frogPlay' | 'houseVisit' | 'cameraGreeting';

export function isCameraGreetingState(state: PetState): boolean {
  return state === 'cameraHappyBefore' || state === 'cameraPop'
    || state === 'cameraCloseup' || state === 'cameraPopOut' || state === 'cameraHappyAfter';
}

export function getCameraGreetingDestination(world: WorldSize): Point {
  const bounds = getMovementBounds(world);
  return { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY - 12 };
}

export function isFloorSleepState(state: PetState): boolean {
  return state === 'floorRest' || state === 'floorSleep' || state === 'floorWake';
}

export function sampleAutonomousWalkDestination(
  position: Point,
  world: WorldSize,
  random: RandomSource,
): Point {
  const bounds = getMovementBounds(world);
  const minimumDistance = Math.min(55, Math.hypot(
    bounds.maxX - bounds.minX, bounds.maxY - bounds.minY,
  ) * 0.22);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const point = {
      x: bounds.minX + random() * (bounds.maxX - bounds.minX),
      y: bounds.minY + random() * (bounds.maxY - bounds.minY),
    };
    if (Math.hypot(point.x - position.x, point.y - position.y) >= minimumDistance) return point;
  }

  // A pathological or repeated random value should not produce a walk in place.
  const x = position.x - bounds.minX > bounds.maxX - position.x ? bounds.minX : bounds.maxX;
  const y = position.y - bounds.minY > bounds.maxY - position.y ? bounds.minY : bounds.maxY;
  return { x, y };
}

export class PetBehaviorMachine {
  private stateTimeRemaining = 1.3;
  private movementTarget: Point | null = null;
  private walkTarget: Point | null = null;
  private arrivalAction: ArrivalAction | null = null;
  private floorSleepCooldown = 0;
  private cameraScheduleStarted = false;
  private cameraSecondsUntilDue: number | null = null;
  private cameraGreetingDue = false;
  private cameraGreetingOrigin: 'automatic' | 'preview' | null = null;
  private cameraHeartCount = 0;

  public constructor(
    private readonly random: RandomSource = Math.random,
    private readonly cameraRandom: RandomSource = Math.random,
  ) {}

  public update(deltaSeconds: number, pet: PetModel, world: WorldSize): void {
    this.floorSleepCooldown = Math.max(0, this.floorSleepCooldown - deltaSeconds);
    this.updateCameraSchedule(deltaSeconds, pet);
    pet.stateElapsed += deltaSeconds;
    if (this.movementTarget) {
      // A resize may have changed the valid floor area mid-dash.
      this.movementTarget = clampFloorPoint(this.movementTarget, world);
      const dx = this.movementTarget.x - pet.position.x;
      const dy = this.movementTarget.y - pet.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 3) {
        pet.position = { ...this.movementTarget };
        this.movementTarget = null;
        const arrivalAction = this.arrivalAction;
        this.arrivalAction = null;
        pet.intent = arrivalAction === 'donutRest' ? 'restAtDonut'
          : arrivalAction === 'frogPlay' ? 'playWithFrog'
            : arrivalAction === 'houseVisit' ? 'insideHouse'
              : arrivalAction === 'cameraGreeting' ? 'cameraGreeting' : 'autonomous';
        if (arrivalAction === 'attention') this.enterState('attention', ARRIVAL_ATTENTION_SECONDS, pet);
        else if (arrivalAction === 'wallWag') this.enterState('wallWag', WALL_WAG_SECONDS, pet);
        else if (arrivalAction === 'donutRest') this.enterState('idle', Number.POSITIVE_INFINITY, pet);
        else if (arrivalAction === 'frogPlay') this.enterState('idle', FROG_PLAY_SECONDS, pet);
        else if (arrivalAction === 'houseVisit') this.enterState('idle', Number.POSITIVE_INFINITY, pet);
        else if (arrivalAction === 'cameraGreeting') {
          this.enterState('cameraHappyBefore', getCameraHappyBeforeDuration(this.cameraHeartCount), pet);
        }
        else this.chooseAutonomousState(pet, world);
      } else {
        const speed = pet.state === 'jog' ? JOG_SPEED : WALK_SPEED;
        const frameSpeed = Math.min(speed, distance / Math.max(deltaSeconds, 0.001));
        pet.velocityX = (dx / distance) * frameSpeed;
        pet.velocityY = (dy / distance) * frameSpeed;
        if (Math.abs(dx) > (this.arrivalAction ? 1 : AUTONOMOUS_FACING_DEADZONE)) {
          pet.facing = dx < 0 ? -1 : 1;
        }
      }
      return;
    }
    if (pet.intent === 'insideHouse' || pet.intent === 'restAtDonut') {
      pet.velocityX = 0;
      pet.velocityY = 0;
      return;
    }
    if (pet.intent === 'frogDrag') {
      pet.velocityX = 0;
      pet.velocityY = 0;
      return;
    }
    if (pet.intent === 'playWithFrog') {
      this.stateTimeRemaining -= deltaSeconds;
      pet.velocityX = 0;
      pet.velocityY = 0;
      if (this.stateTimeRemaining <= 0) {
        pet.intent = 'autonomous';
        this.chooseAutonomousState(pet, world);
      }
      return;
    }
    this.stateTimeRemaining -= deltaSeconds;

    if (isCameraGreetingState(pet.state)) {
      pet.velocityX = 0;
      pet.velocityY = 0;
      if (this.stateTimeRemaining <= 0) {
        if (pet.state === 'cameraHappyBefore') this.enterState('cameraPop', CAMERA_GREETING_CONFIG.popSeconds, pet);
        else if (pet.state === 'cameraPop') this.enterState('cameraCloseup', CAMERA_GREETING_CONFIG.closeupSeconds, pet);
        else if (pet.state === 'cameraCloseup') this.enterState('cameraPopOut', CAMERA_GREETING_CONFIG.popOutSeconds, pet);
        else if (pet.state === 'cameraPopOut') {
          this.enterState('cameraHappyAfter', CAMERA_GREETING_CONFIG.happyAfterSeconds, pet);
        } else {
          this.finishCameraGreeting();
          pet.intent = 'autonomous';
          this.enterState('idle', 1.2, pet);
        }
      }
      return;
    }

    if (isFloorSleepState(pet.state)) {
      pet.velocityX = 0;
      pet.velocityY = 0;
      if (this.stateTimeRemaining <= 0) {
        if (pet.state === 'floorRest') {
          this.enterState('floorSleep', FLOOR_SLEEP_CONFIG.asleepMinSeconds
            + this.random() * FLOOR_SLEEP_CONFIG.asleepRangeSeconds, pet);
        } else if (pet.state === 'floorSleep') {
          this.enterState('floorWake', FLOOR_SLEEP_CONFIG.wakeSeconds, pet);
        } else {
          this.enterState('idle', 1.2, pet);
        }
      }
      return;
    }

    if (pet.state === 'walk') {
      this.walkTarget = clampFloorPoint(
        this.walkTarget ?? sampleAutonomousWalkDestination(pet.position, world, this.random),
        world,
      );
      let dx = this.walkTarget.x - pet.position.x;
      let dy = this.walkTarget.y - pet.position.y;
      let distance = Math.hypot(dx, dy);
      if (distance <= 3) {
        this.walkTarget = sampleAutonomousWalkDestination(pet.position, world, this.random);
        dx = this.walkTarget.x - pet.position.x;
        dy = this.walkTarget.y - pet.position.y;
        distance = Math.hypot(dx, dy);
      }
      const frameSpeed = distance > 0
        ? Math.min(WALK_SPEED, distance / Math.max(deltaSeconds, 0.001)) : 0;
      pet.velocityX = distance > 0 ? (dx / distance) * frameSpeed : 0;
      pet.velocityY = distance > 0 ? (dy / distance) * frameSpeed : 0;
      if (Math.abs(dx) > AUTONOMOUS_FACING_DEADZONE) pet.facing = dx < 0 ? -1 : 1;
    } else {
      pet.velocityX = 0;
      pet.velocityY = 0;
    }

    if (this.stateTimeRemaining <= 0) {
      this.chooseAutonomousState(pet, world);
    }
  }

  public focusOn(point: Point, pet: PetModel): void {
    this.cancelMovement(pet);
    pet.facing = point.x < pet.position.x ? -1 : 1;
    this.enterState('attention', ATTENTION_SECONDS, pet);
  }

  public moveTo(point: Point, pet: PetModel): void {
    this.startMovement(point, pet, 'moveTo', 'attention');
  }

  public restAtDonut(point: Point, pet: PetModel): void {
    if (pet.intent === 'donutMove' || pet.intent === 'restAtDonut') return;
    this.startMovement(point, pet, 'donutMove', 'donutRest');
  }

  public playWithFrog(point: Point, pet: PetModel): void {
    if (pet.intent === 'frogMove' || pet.intent === 'playWithFrog') return;
    if (Math.hypot(point.x - pet.position.x, point.y - pet.position.y) <= 18) {
      this.cancelMovement(pet);
      pet.intent = 'playWithFrog';
      this.enterState('idle', FROG_PLAY_SECONDS, pet);
      return;
    }
    this.startMovement(point, pet, 'frogMove', 'frogPlay');
  }

  public visitHouse(point: Point, pet: PetModel): void {
    if (pet.intent === 'houseMove' || pet.intent === 'insideHouse') return;
    this.startMovement(point, pet, 'houseMove', 'houseVisit');
  }

  public exitRest(pet: PetModel): void {
    if (pet.intent !== 'insideHouse' && pet.intent !== 'restAtDonut') return;
    pet.intent = 'autonomous';
    this.enterState('idle', 1.2, pet);
  }

  public pauseForFrogDrag(pet: PetModel): void {
    this.cancelMovement(pet);
    pet.intent = 'frogDrag';
    this.enterState('idle', Number.POSITIVE_INFINITY, pet);
  }

  public resumeAfterFrogDrag(pet: PetModel): void {
    if (pet.intent !== 'frogDrag') return;
    pet.intent = 'autonomous';
    this.enterState('idle', 1.2, pet);
  }

  public lookAtWall(point: Point, pet: PetModel, world: WorldSize): void {
    const target = clampFloorPoint({ x: point.x, y: pet.position.y }, world);
    if (Math.abs(target.x - pet.position.x) <= WALL_NEAR_DISTANCE) {
      this.cancelMovement(pet);
      this.enterState('wallWag', WALL_WAG_SECONDS, pet);
      return;
    }
    this.startMovement(target, pet, 'wallMove', 'wallWag');
  }

  // Used only by the opt-in development preview; normal naps enter through
  // chooseAutonomousState and follow their finite timings.
  public previewFloorSleep(state: 'awake' | 'asleep' | 'cycle' | 'off', pet: PetModel): void {
    if (state === 'off') {
      if (isFloorSleepState(pet.state)) this.enterState('idle', 1.2, pet);
      return;
    }
    this.cancelMovement(pet);
    if (state === 'cycle') {
      this.enterState('floorRest', FLOOR_SLEEP_CONFIG.awakeMinSeconds
        + this.random() * FLOOR_SLEEP_CONFIG.awakeRangeSeconds, pet);
    } else {
      this.enterState(state === 'awake' ? 'floorRest' : 'floorSleep', Number.POSITIVE_INFINITY, pet);
    }
  }

  public previewCameraGreeting(mode: 'run' | 'closeup' | 'resume', pet: PetModel, world: WorldSize): void {
    if (mode === 'resume') {
      this.cancelCameraGreeting(pet);
      return;
    }
    this.cancelCameraGreeting(pet);
    // If a scheduled greeting is already due, a debug preview satisfies it
    // instead of producing a second greeting immediately afterward.
    this.startCameraGreeting(pet, world, this.cameraGreetingDue ? 'automatic' : 'preview', mode === 'closeup');
  }

  public cancelCameraGreeting(pet: PetModel): void {
    if (!this.isCameraGreetingActive(pet)) return;
    this.finishCameraGreeting();
    this.cancelMovement(pet);
    this.enterState('idle', 1.2, pet);
  }

  public isCameraGreetingActive(pet: PetModel): boolean {
    return pet.intent === 'cameraGreeting' || isCameraGreetingState(pet.state);
  }

  public get cameraHearts(): number {
    return this.cameraHeartCount;
  }

  public get cameraScheduleRemaining(): number | null {
    return this.cameraSecondsUntilDue;
  }

  public get cameraScheduleIsDue(): boolean {
    return this.cameraGreetingDue;
  }

  private startCameraGreeting(
    pet: PetModel, world: WorldSize,
    origin: 'automatic' | 'preview', showCloseup: boolean,
  ): void {
    this.cancelMovement(pet);
    this.cameraGreetingOrigin = origin;
    this.cameraHeartCount = 1 + Math.min(2, Math.floor(Math.max(0, this.cameraRandom()) * 3));
    if (origin === 'automatic') this.cameraGreetingDue = false;
    if (showCloseup) {
      pet.intent = 'cameraGreeting';
      this.enterState('cameraCloseup', Number.POSITIVE_INFINITY, pet);
    } else {
      this.startMovement(getCameraGreetingDestination(world), pet, 'cameraGreeting', 'cameraGreeting');
    }
  }

  private finishCameraGreeting(): void {
    if (this.cameraGreetingOrigin === 'automatic') {
      this.cameraSecondsUntilDue = this.sampleCameraInterval(false);
      this.cameraGreetingDue = false;
    }
    this.cameraGreetingOrigin = null;
    this.cameraHeartCount = 0;
  }

  private updateCameraSchedule(deltaSeconds: number, pet: PetModel): void {
    if (!this.cameraScheduleStarted) {
      if (pet.intent !== 'autonomous' || pet.state !== 'idle') return;
      this.cameraScheduleStarted = true;
      this.cameraSecondsUntilDue = this.sampleCameraInterval(true);
    }
    // Manual previews do not consume or reroll the automatic schedule.
    if (this.cameraGreetingOrigin !== null || this.cameraGreetingDue) return;
    this.cameraSecondsUntilDue = Math.max(0, (this.cameraSecondsUntilDue ?? 0) - deltaSeconds);
    this.cameraGreetingDue = this.cameraSecondsUntilDue === 0;
  }

  private sampleCameraInterval(first: boolean): number {
    const min = first ? CAMERA_GREETING_CONFIG.firstMinSeconds : CAMERA_GREETING_CONFIG.subsequentMinSeconds;
    const range = first ? CAMERA_GREETING_CONFIG.firstRangeSeconds : CAMERA_GREETING_CONFIG.subsequentRangeSeconds;
    return min + Math.min(1, Math.max(0, this.cameraRandom())) * range;
  }

  private startMovement(
    point: Point,
    pet: PetModel,
    intent: 'moveTo' | 'wallMove' | 'donutMove' | 'frogMove' | 'houseMove' | 'cameraGreeting',
    arrivalAction: ArrivalAction,
  ): void {
    this.walkTarget = null;
    this.movementTarget = point;
    this.arrivalAction = arrivalAction;
    pet.intent = intent;
    const distance = Math.hypot(point.x - pet.position.x, point.y - pet.position.y);
    if (Math.abs(point.x - pet.position.x) > 1) pet.facing = point.x < pet.position.x ? -1 : 1;
    this.enterState(distance >= JOG_DISTANCE ? 'jog' : 'walk', Number.POSITIVE_INFINITY, pet);
  }

  private cancelMovement(pet: PetModel): void {
    this.movementTarget = null;
    this.walkTarget = null;
    this.arrivalAction = null;
    pet.intent = 'autonomous';
  }

  private chooseAutonomousState(pet: PetModel, world: WorldSize): void {
    if (pet.intent === 'autonomous' && pet.state === 'idle' && this.cameraGreetingDue) {
      this.startCameraGreeting(pet, world, 'automatic', false);
      return;
    }
    const roll = this.random();
    // A rare nap can begin only after a quiet idle period. The existing Walk
    // and Dash roll ranges are unchanged; the nap replaces only a little Sit.
    if (pet.intent === 'autonomous' && pet.state === 'idle'
      && this.floorSleepCooldown === 0 && roll >= 1 - FLOOR_SLEEP_CONFIG.chanceAfterIdle) {
      this.enterState('floorRest', FLOOR_SLEEP_CONFIG.awakeMinSeconds
        + this.random() * FLOOR_SLEEP_CONFIG.awakeRangeSeconds, pet);
      return;
    }
    if (roll < 0.4) {
      this.enterState('idle', 1.4 + this.random() * 2.2, pet);
      return;
    }

    if (roll < 0.72) {
      this.enterAutonomousWalk(pet, world);
      return;
    }

    if (roll < 0.86) {
      const destination = this.planJogDestination(pet, world);
      if (destination) {
        this.movementTarget = destination;
        if (Math.abs(destination.x - pet.position.x) > AUTONOMOUS_FACING_DEADZONE) {
          pet.facing = destination.x < pet.position.x ? -1 : 1;
        }
        this.enterState('jog', Number.POSITIVE_INFINITY, pet);
      } else {
        // Very narrow floor: a short walk looks better than a tiny dash.
        this.enterAutonomousWalk(pet, world);
      }
      return;
    }

    this.enterState('sit', 1.8 + this.random() * 2.8, pet);
  }

  private planJogDestination(pet: PetModel, world: WorldSize): Point | null {
    const bounds = getMovementBounds(world);
    const leftDistance = pet.position.x - bounds.minX;
    const rightDistance = bounds.maxX - pet.position.x;
    // Permit a shorter dash on mobile, but walk if even its longest route is tiny.
    const minimumDistance = Math.min(JOG_SPEED * 0.65, Math.max(95, world.width * 0.28));
    if (Math.max(leftDistance, rightDistance) < minimumDistance) return null;

    const roomierDirection: -1 | 1 = rightDistance >= leftDistance ? 1 : -1;
    let direction: -1 | 1 = roomierDirection;
    if (this.random() >= 0.8) direction = roomierDirection === 1 ? -1 : 1;
    if ((direction === -1 ? leftDistance : rightDistance) < minimumDistance) {
      direction = direction === 1 ? -1 : 1;
    }
    const availableDistance = direction === -1 ? leftDistance : rightDistance;
    const preferredDistance = Math.max(JOG_SPEED * 1.2, world.width * (0.38 + this.random() * 0.08));
    return {
      x: pet.position.x + direction * Math.min(availableDistance, preferredDistance),
      y: bounds.minY + this.random() * (bounds.maxY - bounds.minY),
    };
  }

  private enterAutonomousWalk(pet: PetModel, world: WorldSize): void {
    this.walkTarget = sampleAutonomousWalkDestination(pet.position, world, this.random);
    this.enterState('walk', 1.8 + this.random() * 2.3, pet);
  }

  private enterState(state: PetState, duration: number, pet: PetModel): void {
    if (isFloorSleepState(pet.state) && !isFloorSleepState(state)) {
      this.floorSleepCooldown = FLOOR_SLEEP_CONFIG.cooldownSeconds;
    }
    if (state !== 'walk') this.walkTarget = null;
    pet.state = state;
    pet.stateElapsed = 0;
    pet.velocityX = 0;
    pet.velocityY = 0;
    this.stateTimeRemaining = duration;
  }
}

