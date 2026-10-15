import { clampFloorPoint } from '../core/RoomGeometry';
import type { PetModel, Point, WorldSize } from '../core/types';
import { FROG_PLAY_SECONDS } from '../behavior/PetBehaviorMachine';
import { getScenePropLayout, type FrogVisual } from '../render/SceneProps';
import { clampFrogFloorPoint, resolveFrogDrop, type FrogDrop } from './FrogDrop';

export const FROG_EMERGENCE_SECONDS = 0.85;

export class FrogPlayController {
  private floorPosition: Point | null = null;
  private emergenceElapsed = 0;
  private playElapsed = 0;
  private playDelay = 0;
  private emerging = false;
  private wasPlaying = false;
  private previousWorld: WorldSize | null = null;
  private dragPosition: Point | null = null;
  private dragOrigin: Point | null = null;
  private grabOffset: Point = { x: 0, y: 0 };
  private playPetPosition: Point | null = null;

  public resize(world: WorldSize): void {
    if (this.previousWorld && this.floorPosition) {
      this.floorPosition = clampFrogFloorPoint({
        x: this.floorPosition.x * world.width / this.previousWorld.width,
        y: this.floorPosition.y * world.height / this.previousWorld.height,
      }, world);
    }
    if (this.previousWorld && this.dragPosition) {
      this.dragPosition = {
        x: this.dragPosition.x * world.width / this.previousWorld.width,
        y: this.dragPosition.y * world.height / this.previousWorld.height,
      };
      this.grabOffset = {
        x: this.grabOffset.x * world.width / this.previousWorld.width,
        y: this.grabOffset.y * world.height / this.previousWorld.height,
      };
    }
    if (this.previousWorld && this.dragOrigin) {
      this.dragOrigin = clampFrogFloorPoint({
        x: this.dragOrigin.x * world.width / this.previousWorld.width,
        y: this.dragOrigin.y * world.height / this.previousWorld.height,
      }, world);
    }
    this.previousWorld = { ...world };
  }

  public beginDrag(pointer: Point, world: WorldSize): void {
    if (this.dragPosition) return;
    const visual = this.getVisual(world);
    if (this.wasPlaying) this.endPlay(world);
    this.wasPlaying = false;
    this.dragOrigin = this.floorPosition ? { ...this.floorPosition } : null;
    this.grabOffset = { x: pointer.x - visual.x, y: pointer.y - visual.baseline };
    this.dragPosition = { x: visual.x, y: visual.baseline };
  }

  public moveDrag(pointer: Point, world: WorldSize): void {
    if (!this.dragPosition) return;
    const frog = getScenePropLayout(world).frog;
    this.dragPosition = {
      x: Math.max(frog.width / 2, Math.min(world.width - frog.width / 2, pointer.x - this.grabOffset.x)),
      y: Math.max(frog.height / 2, Math.min(world.height - frog.height / 2, pointer.y - this.grabOffset.y)),
    };
  }

  public drop(pointer: Point, world: WorldSize): FrogDrop | null {
    if (!this.dragPosition) return null;
    const result = resolveFrogDrop(pointer, this.grabOffset, world);
    this.floorPosition = result.position;
    this.clearDrag();
    return result;
  }

  public cancelDrag(): void {
    if (!this.dragPosition) return;
    this.floorPosition = this.dragOrigin;
    this.clearDrag();
  }

  public isDragging(): boolean {
    return this.dragPosition !== null;
  }

  public getApproachPoint(world: WorldSize, petX: number): Point {
    const layout = getScenePropLayout(world);
    if (!this.floorPosition) {
      const compact = world.width < 560;
      return clampFloorPoint({
        x: layout.house.x - layout.house.width * (compact ? 1 : 1.1),
        y: compact ? layout.house.baseline + layout.house.height * 0.5 : layout.house.baseline + 12,
      }, world);
    }
    // Leave enough space to tap the frog again without hitting the pet first.
    const offset = Math.max(52, layout.frog.width * 0.72);
    const direction = petX <= this.floorPosition.x ? -1 : 1;
    return clampFloorPoint({
      x: this.floorPosition.x + direction * offset,
      y: this.floorPosition.y,
    }, world);
  }

  public update(deltaSeconds: number, pet: PetModel, world: WorldSize): void {
    if (this.dragPosition) return;
    const playing = pet.intent === 'playWithFrog';
    if (playing && !this.wasPlaying) this.beginPlay(world);
    if (!playing && this.wasPlaying) this.endPlay(world);
    this.wasPlaying = playing;
    if (!playing) return;

    this.playPetPosition = { ...pet.position };
    this.playElapsed += deltaSeconds;
    if (this.emerging) {
      this.emergenceElapsed = Math.min(FROG_EMERGENCE_SECONDS, this.emergenceElapsed + deltaSeconds);
      if (this.emergenceElapsed >= FROG_EMERGENCE_SECONDS) this.emerging = false;
    }
  }

  public getVisual(world: WorldSize): FrogVisual {
    if (this.dragPosition) return {
      x: this.dragPosition.x, baseline: this.dragPosition.y, scaleX: 1.04, scaleY: 1.04, held: true,
    };
    const layout = getScenePropLayout(world);
    const home = { x: layout.frog.x, y: layout.frog.baseline };
    if (!this.floorPosition) return { x: home.x, baseline: home.y };

    if (this.emerging) {
      const progress = this.emergenceElapsed / FROG_EMERGENCE_SECONDS;
      const eased = progress * progress * (3 - 2 * progress);
      return {
        x: home.x + (this.floorPosition.x - home.x) * eased,
        baseline: home.y + (this.floorPosition.y - home.y) * eased - Math.sin(progress * Math.PI) * 13,
        rotation: Math.sin(progress * Math.PI * 2) * 0.08,
        playing: this.wasPlaying,
      };
    }

    if (this.wasPlaying && this.playElapsed >= this.playDelay) {
      const phase = (this.playElapsed - this.playDelay) * Math.PI * 2 * 1.55;
      const bounce = Math.abs(Math.sin(phase));
      const elapsed = this.playElapsed - this.playDelay;
      const remaining = FROG_PLAY_SECONDS - this.playElapsed;
      const towardPaws = Math.min(smoothstep(elapsed / 0.45), smoothstep(remaining / 0.45));
      const nearPaws = this.playPetPosition ? {
        x: this.playPetPosition.x + (this.floorPosition.x >= this.playPetPosition.x ? 1 : -1)
          * Math.max(44, layout.frog.width * 0.65),
        y: this.playPetPosition.y + layout.frog.height * 0.27,
      } : this.floorPosition;
      return {
        x: this.floorPosition.x + (nearPaws.x - this.floorPosition.x) * towardPaws + Math.sin(phase) * 3.5,
        baseline: this.floorPosition.y + (nearPaws.y - this.floorPosition.y) * towardPaws - bounce * 8,
        rotation: Math.sin(phase) * 0.14,
        scaleX: 1 + bounce * 0.035,
        scaleY: 1 - bounce * 0.045,
        playing: true,
      };
    }
    return { x: this.floorPosition.x, baseline: this.floorPosition.y };
  }

  public isOnFloor(): boolean {
    return this.floorPosition !== null && !this.emerging;
  }

  private beginPlay(world: WorldSize): void {
    this.playElapsed = 0;
    this.emergenceElapsed = 0;
    this.emerging = this.floorPosition === null;
    this.playDelay = this.emerging ? FROG_EMERGENCE_SECONDS : 0;
    if (this.emerging) {
      const layout = getScenePropLayout(world);
      const compact = world.width < 560;
      this.floorPosition = clampFrogFloorPoint({
        // Desktop has room beside the house; mobile has room in front of it.
        x: layout.house.x - layout.house.width * (compact ? 0.43 : 0.77),
        y: compact
          ? layout.house.baseline + layout.house.height * 0.5 + layout.frog.height * 0.4
          : layout.house.baseline + layout.frog.height * 0.65,
      }, world);
    }
  }

  private endPlay(world: WorldSize): void {
    if (this.emerging) {
      const visual = this.getVisual(world);
      this.floorPosition = clampFrogFloorPoint({ x: visual.x, y: visual.baseline }, world);
      this.emerging = false;
    }
    this.playElapsed = 0;
    this.playDelay = 0;
    this.playPetPosition = null;
  }

  private clearDrag(): void {
    this.dragPosition = null;
    this.dragOrigin = null;
    this.grabOffset = { x: 0, y: 0 };
    this.emerging = false;
    this.wasPlaying = false;
    this.playElapsed = 0;
    this.playDelay = 0;
    this.playPetPosition = null;
  }
}

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
