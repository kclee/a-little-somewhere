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
type ArrivalAction = 'attention' | 'wallWag' | 'donutRest' | 'frogPlay' | 'houseVisit';

export class PetBehaviorMachine {
  private stateTimeRemaining = 1.3;
  private movementTarget: Point | null = null;
  private arrivalAction: ArrivalAction | null = null;

  public constructor(private readonly random: RandomSource = Math.random) {}

  public update(deltaSeconds: number, pet: PetModel, world: WorldSize): void {
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
            : arrivalAction === 'houseVisit' ? 'insideHouse' : 'autonomous';
        if (arrivalAction === 'attention') this.enterState('attention', ARRIVAL_ATTENTION_SECONDS, pet);
        else if (arrivalAction === 'wallWag') this.enterState('wallWag', WALL_WAG_SECONDS, pet);
        else if (arrivalAction === 'donutRest') this.enterState('idle', Number.POSITIVE_INFINITY, pet);
        else if (arrivalAction === 'frogPlay') this.enterState('idle', FROG_PLAY_SECONDS, pet);
        else if (arrivalAction === 'houseVisit') this.enterState('idle', Number.POSITIVE_INFINITY, pet);
        else this.chooseAutonomousState(pet, world);
      } else {
        const speed = pet.state === 'jog' ? JOG_SPEED : WALK_SPEED;
        const frameSpeed = Math.min(speed, distance / Math.max(deltaSeconds, 0.001));
        pet.velocityX = (dx / distance) * frameSpeed;
        pet.velocityY = (dy / distance) * frameSpeed;
        if (Math.abs(dx) > 1) pet.facing = dx < 0 ? -1 : 1;
      }
      return;
    }
    if (pet.intent === 'insideHouse' || pet.intent === 'restAtDonut') {
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

    if (pet.state === 'walk') {
      pet.velocityX = pet.facing * WALK_SPEED;
      pet.velocityY = 0;
      const nextX = pet.position.x + pet.velocityX * deltaSeconds;
      const bounds = getMovementBounds(world);
      // Autonomous walks turn before the sprite clips the room edge. Only
      // reverse while moving outward; otherwise the edge band causes a flip
      // on every frame and leaves the pet walking in place.
      const turnInset = Math.min(50, world.width * 0.12);
      const turnLeft = pet.facing === -1 && nextX <= bounds.minX + turnInset;
      const turnRight = pet.facing === 1 && nextX >= bounds.maxX - turnInset;
      if (turnLeft || turnRight) {
        pet.facing = turnLeft ? 1 : -1;
        pet.velocityX = pet.facing * WALK_SPEED;
      }
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

  private startMovement(
    point: Point,
    pet: PetModel,
    intent: 'moveTo' | 'wallMove' | 'donutMove' | 'frogMove' | 'houseMove',
    arrivalAction: ArrivalAction,
  ): void {
    this.movementTarget = point;
    this.arrivalAction = arrivalAction;
    pet.intent = intent;
    const distance = Math.hypot(point.x - pet.position.x, point.y - pet.position.y);
    if (Math.abs(point.x - pet.position.x) > 1) pet.facing = point.x < pet.position.x ? -1 : 1;
    this.enterState(distance >= JOG_DISTANCE ? 'jog' : 'walk', Number.POSITIVE_INFINITY, pet);
  }

  private cancelMovement(pet: PetModel): void {
    this.movementTarget = null;
    this.arrivalAction = null;
    pet.intent = 'autonomous';
  }

  private chooseAutonomousState(pet: PetModel, world: WorldSize): void {
    const roll = this.random();
    if (roll < 0.4) {
      this.enterState('idle', 1.4 + this.random() * 2.2, pet);
      return;
    }

    if (roll < 0.72) {
      pet.facing = this.random() < 0.5 ? -1 : 1;
      this.enterState('walk', 1.8 + this.random() * 2.3, pet);
      return;
    }

    if (roll < 0.86) {
      const destination = this.planJogDestination(pet, world);
      if (destination) {
        this.movementTarget = destination;
        pet.facing = destination.x < pet.position.x ? -1 : 1;
        this.enterState('jog', Number.POSITIVE_INFINITY, pet);
      } else {
        // Very narrow floor: a short walk looks better than a tiny dash.
        pet.facing = this.random() < 0.5 ? -1 : 1;
        this.enterState('walk', 1.8 + this.random() * 2.3, pet);
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
    return { x: pet.position.x + direction * Math.min(availableDistance, preferredDistance), y: pet.position.y };
  }

  private enterState(state: PetState, duration: number, pet: PetModel): void {
    pet.state = state;
    pet.stateElapsed = 0;
    pet.velocityX = 0;
    pet.velocityY = 0;
    this.stateTimeRemaining = duration;
  }
}

