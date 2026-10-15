import { PetBehaviorMachine } from '../behavior/PetBehaviorMachine';
import { clampFloorPoint, DEFAULT_GROUND_RATIO } from '../core/RoomGeometry';
import type { PetModel, Point, WorldSize } from '../core/types';

export type RestPhase = 'none' | 'entering' | 'resting' | 'sleeping' | 'waking';
export type RestPlace = 'donut' | 'house';
export const REST_SLEEP_SECONDS = 4;
export const REST_WAKE_SECONDS = 0.18;

type PetAction = {
  kind: 'attention' | 'move' | 'wall' | 'donut' | 'house' | 'frog';
  point: Point;
};

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
  public restPhase: RestPhase = 'none';
  public restPlace: RestPlace | null = null;
  private hasSized = false;
  private draggingFrog = false;
  private restElapsed = 0;
  private pendingAction: PetAction | null = null;

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
    if (this.restPhase === 'waking' && !this.draggingFrog) {
      this.restElapsed += safeDelta;
      if (this.restElapsed >= REST_WAKE_SECONDS) {
        const action = this.pendingAction;
        this.clearRest();
        if (action) this.executeAction(action);
      }
    }
    if (this.draggingFrog && this.restPhase === 'none') return;
    this.behavior.update(safeDelta, this.pet, this.world);
    this.pet.position = clampFloorPoint({
      x: this.pet.position.x + this.pet.velocityX * safeDelta,
      y: this.pet.position.y + this.pet.velocityY * safeDelta,
    }, this.world);
    if (this.restPhase === 'entering' && this.restPlace === 'donut' && this.pet.intent === 'restAtDonut') {
      this.restPhase = 'resting';
      this.restElapsed = 0;
    } else if (this.restPhase === 'resting') {
      this.restElapsed += safeDelta;
      if (this.restElapsed >= REST_SLEEP_SECONDS) this.restPhase = 'sleeping';
    }
  }

  public interact(point: Point): void {
    this.performOrWake({ kind: 'attention', point });
  }

  public moveTo(point: Point): void {
    this.performOrWake({ kind: 'move', point });
  }

  public restAtDonut(point: Point): void {
    if (this.restPhase === 'entering' && this.restPlace === 'donut') return;
    this.performOrWake({ kind: 'donut', point });
  }

  public playWithFrog(point: Point): void {
    this.performOrWake({ kind: 'frog', point });
  }

  public visitHouse(point: Point): void {
    this.performOrWake({ kind: 'house', point });
  }

  public completeHouseEntry(): void {
    if (this.restPhase !== 'entering' || this.restPlace !== 'house' || this.pet.intent !== 'insideHouse') return;
    this.restPhase = 'resting';
    this.restElapsed = 0;
  }

  public beginFrogDrag(): void {
    if (this.isHouseSequenceActive()) return;
    this.draggingFrog = true;
    if (!this.isResting() && this.restPhase !== 'waking') {
      this.clearRest();
      this.behavior.pauseForFrogDrag(this.pet);
    }
  }

  public dropFrog(point: Point): void {
    if (!this.draggingFrog) return;
    this.draggingFrog = false;
    this.playWithFrog(point);
  }

  public cancelFrogDrag(): void {
    if (!this.draggingFrog) return;
    this.draggingFrog = false;
    if (!this.isResting() && this.restPhase !== 'waking') this.behavior.resumeAfterFrogDrag(this.pet);
  }

  public lookAtWall(point: Point): void {
    this.performOrWake({ kind: 'wall', point });
  }

  public isHouseSequenceActive(): boolean {
    return this.restPlace === 'house' && this.restPhase === 'entering';
  }

  public isResting(): boolean {
    return this.restPhase === 'resting' || this.restPhase === 'sleeping';
  }

  public isRestingAt(place: RestPlace): boolean {
    return this.isResting() && this.restPlace === place;
  }

  private performOrWake(action: PetAction): void {
    if (this.isHouseSequenceActive()) return;
    if (this.isResting()) {
      this.pendingAction = action;
      this.restPhase = 'waking';
      this.restElapsed = 0;
      this.behavior.exitRest(this.pet);
      return;
    }
    if (this.restPhase === 'waking') {
      // Last request wins while the dog visibly exits its resting place.
      this.pendingAction = action;
      return;
    }
    if (this.restPhase === 'entering') this.clearRest();
    this.executeAction(action);
  }

  private executeAction(action: PetAction): void {
    const point = action.kind === 'attention' ? action.point : clampFloorPoint(action.point, this.world);
    if (action.kind === 'attention') this.behavior.focusOn(point, this.pet);
    else if (action.kind === 'move') this.behavior.moveTo(point, this.pet);
    else if (action.kind === 'wall') this.behavior.lookAtWall(action.point, this.pet, this.world);
    else if (action.kind === 'frog') this.behavior.playWithFrog(point, this.pet);
    else if (action.kind === 'donut') {
      this.restPlace = 'donut';
      this.restPhase = 'entering';
      this.behavior.restAtDonut(point, this.pet);
    } else if (action.kind === 'house') {
      this.restPlace = 'house';
      this.restPhase = 'entering';
      this.behavior.visitHouse(point, this.pet);
    }
  }

  private clearRest(): void {
    this.restPhase = 'none';
    this.restPlace = null;
    this.restElapsed = 0;
    this.pendingAction = null;
  }
}

