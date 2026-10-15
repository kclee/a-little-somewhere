export const WALK_FRAME_COUNT = 4;
export const MIN_WALK_FPS = 2;
export const MAX_WALK_FPS = 12;
export const DEFAULT_WALK_FPS = 6;

export const WALK_SHEET = {
  width: 2172,
  height: 724,
  frameWidth: 543,
  frameHeight: 724,
  feetAnchor: { x: 271.5, y: 607 },
} as const;

export const WALK_FRAME_AUDIT = [
  { frame: 1, minX: 34, maxX: 529, minY: 183, feetY: 606, artifactPixels: 54 },
  { frame: 2, minX: 47, maxX: 516, minY: 184, feetY: 606, artifactPixels: 54 },
  { frame: 3, minX: 31, maxX: 516, minY: 188, feetY: 607, artifactPixels: 69 },
  { frame: 4, minX: 42, maxX: 510, minY: 186, feetY: 607, artifactPixels: 52 },
] as const;

export class WalkCycleModel {
  public frameIndex = 0;
  public playing = true;
  public fps = DEFAULT_WALK_FPS;
  private accumulatedSeconds = 0;

  public update(deltaSeconds: number): boolean {
    if (!this.playing || deltaSeconds <= 0) return false;

    this.accumulatedSeconds += Math.min(deltaSeconds, 0.25);
    const frameDuration = 1 / this.fps;
    let changed = false;

    while (this.accumulatedSeconds >= frameDuration) {
      this.accumulatedSeconds -= frameDuration;
      this.frameIndex = (this.frameIndex + 1) % WALK_FRAME_COUNT;
      changed = true;
    }

    return changed;
  }

  public togglePlaying(): void {
    this.playing = !this.playing;
  }

  public previousFrame(): void {
    this.playing = false;
    this.accumulatedSeconds = 0;
    this.frameIndex = (this.frameIndex - 1 + WALK_FRAME_COUNT) % WALK_FRAME_COUNT;
  }

  public nextFrame(): void {
    this.playing = false;
    this.accumulatedSeconds = 0;
    this.frameIndex = (this.frameIndex + 1) % WALK_FRAME_COUNT;
  }

  public setFps(value: number): void {
    this.fps = Math.min(Math.max(Math.round(value), MIN_WALK_FPS), MAX_WALK_FPS);
    this.accumulatedSeconds = 0;
  }
}

export function getFeetJitter(): number {
  const baselines = WALK_FRAME_AUDIT.map((frame) => frame.feetY);
  return Math.max(...baselines) - Math.min(...baselines);
}
