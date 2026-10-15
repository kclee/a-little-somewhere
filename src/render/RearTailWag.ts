export type RearTailWagPose = 'neutral' | 'left' | 'right';

interface SourceCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RearTailWagSpriteDefinition {
  file: string;
  canvasSize: 1254;
  anchor: readonly [x: number, y: number];
  crop: SourceCrop;
}

// All three supplied frames use the same source canvas. The shared crop and
// feet anchor intentionally remain fixed so the body does not shift as the
// tail changes shape.
const SHARED_REAR_CROP = { x: 130, y: 130, width: 1030, height: 1060 } as const;
const SHARED_REAR_FEET_ANCHOR = [0.5, 1175 / 1254] as const;

export const REAR_TAIL_WAG_SPRITES: Record<
  RearTailWagPose,
  RearTailWagSpriteDefinition
> = {
  neutral: {
    file: 'maltese_back_neutral.png',
    canvasSize: 1254,
    anchor: SHARED_REAR_FEET_ANCHOR,
    crop: SHARED_REAR_CROP,
  },
  left: {
    file: 'maltese_back_tail_left.png',
    canvasSize: 1254,
    anchor: SHARED_REAR_FEET_ANCHOR,
    crop: SHARED_REAR_CROP,
  },
  right: {
    file: 'maltese_back_tail_right.png',
    canvasSize: 1254,
    anchor: SHARED_REAR_FEET_ANCHOR,
    crop: SHARED_REAR_CROP,
  },
};

export const REAR_TAIL_WAG_START_SECONDS = 0.65;
export const REAR_TAIL_WAG_FRAME_SECONDS = 0.16;

const REAR_TAIL_WAG_SEQUENCE: readonly RearTailWagPose[] = [
  'neutral',
  'left',
  'neutral',
  'right',
  'neutral',
];
export const REAR_TAIL_WAG_CYCLE_SECONDS = REAR_TAIL_WAG_SEQUENCE.length * REAR_TAIL_WAG_FRAME_SECONDS;

export function getRearTailWagPose(stateElapsed: number): RearTailWagPose {
  const animationElapsed = stateElapsed - REAR_TAIL_WAG_START_SECONDS;
  if (animationElapsed < 0) return 'neutral';

  const frameIndex = Math.floor(animationElapsed / REAR_TAIL_WAG_FRAME_SECONDS);
  return REAR_TAIL_WAG_SEQUENCE[frameIndex] ?? 'neutral';
}

export interface LoadedRearTailWagFrame {
  image: HTMLImageElement;
  definition: RearTailWagSpriteDefinition;
}

export class RearTailWagSpriteSet {
  private readonly images = new Map<RearTailWagPose, HTMLImageElement>();

  public constructor(baseUrl = document.baseURI) {
    for (const [pose, definition] of Object.entries(REAR_TAIL_WAG_SPRITES) as [
      RearTailWagPose,
      RearTailWagSpriteDefinition,
    ][]) {
      const image = new Image();
      image.decoding = 'async';
      image.src = new URL(`assets/pets/maltese/${definition.file}`, baseUrl).href;
      this.images.set(pose, image);
    }
  }

  public getFrame(stateElapsed: number): LoadedRearTailWagFrame | null {
    // Avoid switching from the old fallback pose partway through a Sit while
    // the remaining animation frames are still loading.
    if (![...this.images.values()].every(isLoadedImage)) return null;

    const pose = getRearTailWagPose(stateElapsed);
    return {
      image: this.images.get(pose)!,
      definition: REAR_TAIL_WAG_SPRITES[pose],
    };
  }
}

function isLoadedImage(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth > 0;
}
