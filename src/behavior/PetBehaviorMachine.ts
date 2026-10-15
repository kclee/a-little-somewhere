import type { PetModel, PetState, Point, WorldSize } from '../core/types';
import { clampFloorPoint, getMovementBounds } from '../core/RoomGeometry';

type RandomSource = () => number;

const WALK_SPEED = 48;
const JOG_SPEED = WALK_SPEED * 5;
const ATTENTION_SECONDS = 1.15;
const WALL_WAG_SECONDS = 2.5;
const JOG_DISTANCE = 150;

export class PetBehaviorMachine {
  private stateTimeRemaining = 1.3;
  private movementTarget: Point | null = null;

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
        this.movementTarget = null;
        pet.intent = 'autonomous';
        this.chooseAutonomousState(pet, world);
      } else {
        const speed = pet.state === 'jog' ? JOG_SPEED : WALK_SPEED;
        const frameSpeed = Math.min(speed, distance / Math.max(deltaSeconds, 0.001));
        pet.velocityX = (dx / distance) * frameSpeed;
        pet.velocityY = (dy / distance) * frameSpeed;
        if (Math.abs(dx) > 1) pet.facing = dx < 0 ? -1 : 1;
      }
      return;
    }
    this.stateTimeRemaining -= deltaSeconds;

    if (pet.state === 'walk') {
      pet.velocityX = pet.facing * WALK_SPEED;
      pet.velocityY = 0;
      const nextX = pet.position.x + pet.velocityX * deltaSeconds;
      const bounds = getMovementBounds(world);
      if (nextX < bounds.minX + 4 || nextX > bounds.maxX - 4) {
        pet.facing = pet.facing === 1 ? -1 : 1;
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
    this.movementTarget = point;
    pet.intent = 'moveTo';
    const distance = Math.hypot(point.x - pet.position.x, point.y - pet.position.y);
    if (Math.abs(point.x - pet.position.x) > 1) pet.facing = point.x < pet.position.x ? -1 : 1;
    this.enterState(distance >= JOG_DISTANCE ? 'jog' : 'walk', Number.POSITIVE_INFINITY, pet);
  }

  public lookAtWall(pet: PetModel): void {
    this.cancelMovement(pet);
    this.enterState('wallWag', WALL_WAG_SECONDS, pet);
  }

  private cancelMovement(pet: PetModel): void {
    this.movementTarget = null;
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

