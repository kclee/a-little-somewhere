import { DEFAULT_WALK_FPS, WALK_FRAME_COUNT, WALK_SHEET } from '../walk-cycle/WalkCycleModel';

const DISPLAY_REFERENCE_SIZE = 512;

// Measured from the alpha bounds, excluding transparent canvas padding and
// isolated generation specks. Scaling around the feet anchor keeps the ground
// point fixed while matching the median apparent height of the static poses.
export const STATIC_POSE_REFERENCE_HEIGHT = 399;
export const WALK_CYCLE_REFERENCE_HEIGHT = 422;
export const WALK_CYCLE_SIZE_NORMALIZATION =
  STATIC_POSE_REFERENCE_HEIGHT / WALK_CYCLE_REFERENCE_HEIGHT;

export function getWalkFrameIndex(
  stateElapsed: number,
  framesPerSecond = DEFAULT_WALK_FPS,
): number {
  const safeElapsed = Math.max(0, stateElapsed);
  const safeFps = Math.max(1, framesPerSecond);
  return Math.floor(safeElapsed * safeFps) % WALK_FRAME_COUNT;
}

export function shouldMirrorWalkCycle(facing: -1 | 1): boolean {
  return facing === -1;
}

export function getWalkCycleScale(spriteSize: number): number {
  return (spriteSize / DISPLAY_REFERENCE_SIZE) * WALK_CYCLE_SIZE_NORMALIZATION;
}

export class MalteseWalkCycle {
  private readonly image: HTMLImageElement;

  public constructor(baseUrl = document.baseURI) {
    this.image = new Image();
    this.image.decoding = 'async';
    this.image.src = new URL('assets/pets/maltese/maltese-walk-cycle.png', baseUrl).href;
  }

  public getImage(): HTMLImageElement | null {
    return this.image.complete && this.image.naturalWidth > 0 ? this.image : null;
  }

  public getSourceX(stateElapsed: number): number {
    return getWalkFrameIndex(stateElapsed) * WALK_SHEET.frameWidth;
  }
}

