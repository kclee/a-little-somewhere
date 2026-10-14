import { PetBehaviorMachine } from '../behavior/PetBehaviorMachine';
import type { PetModel, Point, WorldSize } from '../core/types';

const FLOOR_LEVEL = 0.78;
const EDGE_PADDING = 58;

export class PetSimulation {
  public readonly pet: PetModel = {
    position: { x: 180, y: 360 },
    velocityX: 0,
    facing: 1,
    state: 'idle',
    stateElapsed: 0,
  };

  public readonly world: WorldSize = { width: 360, height: 640 };
  public elapsed = 0;

  public constructor(private readonly behavior = new PetBehaviorMachine()) {}

  public resize(width: number, height: number): void {
    const previousWidth = this.world.width;
    const relativeX = previousWidth > 0 ? this.pet.position.x / previousWidth : 0.5;
    this.world.width = Math.max(1, width);
    this.world.height = Math.max(1, height);
    this.pet.position.x = this.clampX(relativeX * this.world.width);
    this.pet.position.y = this.world.height * FLOOR_LEVEL;
  }

  public update(deltaSeconds: number): void {
    const safeDelta = Math.min(Math.max(deltaSeconds, 0), 0.1);
    this.elapsed += safeDelta;
    this.behavior.update(safeDelta, this.pet, this.world);
    this.pet.position.x = this.clampX(this.pet.position.x + this.pet.velocityX * safeDelta);
    this.pet.position.y = this.world.height * FLOOR_LEVEL;
  }

  public interact(point: Point): void {
    this.behavior.focusOn(point, this.pet);
  }

  private clampX(x: number): number {
    const min = Math.min(EDGE_PADDING, this.world.width / 2);
    const max = Math.max(min, this.world.width - EDGE_PADDING);
    return Math.min(Math.max(x, min), max);
  }
}

