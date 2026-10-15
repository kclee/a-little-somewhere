import { PetBehaviorMachine } from '../behavior/PetBehaviorMachine';
import { clampFloorPoint, DEFAULT_GROUND_RATIO } from '../core/RoomGeometry';
import type { PetModel, Point, WorldSize } from '../core/types';

export class PetSimulation {
  public readonly pet: PetModel = {
    position: { x: 180, y: 360 },
    velocityX: 0,
    velocityY: 0,
    intent: 'autonomous',
    facing: 1,
    state: 'idle',
    stateElapsed: 0,
  };

  public readonly world: WorldSize = { width: 360, height: 640 };
  public elapsed = 0;
  private hasSized = false;

  public constructor(private readonly behavior = new PetBehaviorMachine()) {}

  public resize(width: number, height: number): void {
    const relativeX = this.pet.position.x / this.world.width;
    const relativeY = this.hasSized ? this.pet.position.y / this.world.height : DEFAULT_GROUND_RATIO;
    this.world.width = Math.max(1, width);
    this.world.height = Math.max(1, height);
    this.pet.position = clampFloorPoint(
      { x: relativeX * this.world.width, y: relativeY * this.world.height }, this.world,
    );
    this.hasSized = true;
  }

  public update(deltaSeconds: number): void {
    // Preserve real-time travel during short frame stalls, while still
    // bounding large jumps when a suspended tab resumes.
    const safeDelta = Math.min(Math.max(deltaSeconds, 0), 0.25);
    this.elapsed += safeDelta;
    this.behavior.update(safeDelta, this.pet, this.world);
    this.pet.position = clampFloorPoint({
      x: this.pet.position.x + this.pet.velocityX * safeDelta,
      y: this.pet.position.y + this.pet.velocityY * safeDelta,
    }, this.world);
  }

  public interact(point: Point): void {
    this.behavior.focusOn(point, this.pet);
  }

  public moveTo(point: Point): void {
    this.behavior.moveTo(clampFloorPoint(point, this.world), this.pet);
  }

  public lookAtWall(point: Point): void {
    this.behavior.lookAtWall(point, this.pet, this.world);
  }
}

