import type { PetModel, PetState, Point, WorldSize } from '../core/types';

type RandomSource = () => number;

const EDGE_PADDING = 62;
const WALK_SPEED = 48;
const ATTENTION_SECONDS = 1.15;

export class PetBehaviorMachine {
  private stateTimeRemaining = 1.3;

  public constructor(private readonly random: RandomSource = Math.random) {}

  public update(deltaSeconds: number, pet: PetModel, world: WorldSize): void {
    pet.stateElapsed += deltaSeconds;
    this.stateTimeRemaining -= deltaSeconds;

    if (pet.state === 'walk') {
      pet.velocityX = pet.facing * WALK_SPEED;
      const nextX = pet.position.x + pet.velocityX * deltaSeconds;
      if (nextX < EDGE_PADDING || nextX > world.width - EDGE_PADDING) {
        pet.facing = pet.facing === 1 ? -1 : 1;
        pet.velocityX = pet.facing * WALK_SPEED;
      }
    } else {
      pet.velocityX = 0;
    }

    if (this.stateTimeRemaining <= 0) {
      this.chooseAutonomousState(pet);
    }
  }

  public focusOn(point: Point, pet: PetModel): void {
    pet.facing = point.x < pet.position.x ? -1 : 1;
    this.enterState('attention', ATTENTION_SECONDS, pet);
  }

  private chooseAutonomousState(pet: PetModel): void {
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

    this.enterState('sit', 1.8 + this.random() * 2.8, pet);
  }

  private enterState(state: PetState, duration: number, pet: PetModel): void {
    pet.state = state;
    pet.stateElapsed = 0;
    pet.velocityX = 0;
    this.stateTimeRemaining = duration;
  }
}

