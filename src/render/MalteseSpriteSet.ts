import type { PetModel } from '../core/types';

export type MaltesePose = 'front' | 'frontHappy' | 'frontSleepy' | 'lyingAwake' | 'lyingAsleep'
  | 'sideLeft' | 'sideRight' | 'back' | 'attention';

interface SourceCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MalteseSpriteDefinition {
  file: string;
  canvasSize: number;
  anchor: readonly [x: number, y: number];
  crop: SourceCrop;
}

const SHARED_FEET_ANCHOR = [0.5, 0.9375] as const;
// The expression art is 1254px, with visible paws at y≈1109. Its virtual
// canvas and anchor place those paws on the same ground line as front.png.
const EXPRESSION_FEET_ANCHOR = [643 / 1280, 1179 / 1280] as const;
const EXPRESSION_CROP = { x: 220, y: 120, width: 850, height: 1010 } as const;
// Both lying images are pixel-aligned. Their opaque bounds are x≈124–1130,
// y≈244–1131 on a 1254px canvas; the belly and paws rest on the shared line.
const LYING_FEET_ANCHOR = [627 / 1254, 1131 / 1254] as const;
const LYING_CROP = { x: 120, y: 240, width: 1015, height: 897 } as const;
export const LYING_SCALE = 0.89;

export function getMaltesePoseScale(pose: MaltesePose): number {
  return pose === 'lyingAwake' || pose === 'lyingAsleep' ? LYING_SCALE : 1;
}

// The original crops retain their shared 512px coordinate system and exclude
// isolated generation specks; expression crops preserve their own larger art.
export const MALTESE_SPRITES: Record<MaltesePose, MalteseSpriteDefinition> = {
  front: {
    file: 'maltese_front.png',
    canvasSize: 512,
    anchor: SHARED_FEET_ANCHOR,
    crop: { x: 88, y: 48, width: 336, height: 414 },
  },
  frontHappy: {
    file: 'maltese_front_happy.png',
    canvasSize: 1280,
    anchor: EXPRESSION_FEET_ANCHOR,
    crop: EXPRESSION_CROP,
  },
  frontSleepy: {
    file: 'maltese_front_sleepy.png',
    canvasSize: 1280,
    anchor: EXPRESSION_FEET_ANCHOR,
    crop: EXPRESSION_CROP,
  },
  lyingAwake: {
    file: 'maltese_lying_awake_clean.png',
    canvasSize: 1254,
    anchor: LYING_FEET_ANCHOR,
    crop: LYING_CROP,
  },
  lyingAsleep: {
    file: 'maltese_lying_asleep_clean.png',
    canvasSize: 1254,
    anchor: LYING_FEET_ANCHOR,
    crop: LYING_CROP,
  },
  sideLeft: {
    file: 'maltese_side_left.png',
    canvasSize: 512,
    anchor: SHARED_FEET_ANCHOR,
    crop: { x: 72, y: 48, width: 408, height: 424 },
  },
  sideRight: {
    file: 'maltese_side_right.png',
    canvasSize: 512,
    anchor: SHARED_FEET_ANCHOR,
    crop: { x: 72, y: 52, width: 420, height: 416 },
  },
  back: {
    file: 'maltese_back.png',
    canvasSize: 512,
    anchor: SHARED_FEET_ANCHOR,
    crop: { x: 48, y: 48, width: 416, height: 444 },
  },
  attention: {
    file: 'maltese_attention.png',
    canvasSize: 512,
    anchor: SHARED_FEET_ANCHOR,
    crop: { x: 64, y: 48, width: 348, height: 448 },
  },
};

export function selectMaltesePose(
  pet: Pick<PetModel, 'state' | 'facing' | 'intent'>,
  donutPose: 'seated' | 'lyingAwake' | 'lyingAsleep' | null = null,
): MaltesePose {
  if (pet.state === 'floorRest' || pet.state === 'floorWake') return 'lyingAwake';
  if (pet.state === 'floorSleep') return 'lyingAsleep';
  if (pet.state === 'walk' || pet.state === 'jog') return pet.facing === -1 ? 'sideLeft' : 'sideRight';
  if (pet.state === 'sit' || pet.state === 'wallWag') return 'back';
  if (pet.state === 'attention') return 'attention';
  if (pet.state === 'cameraHappyBefore' || pet.state === 'cameraHappyAfter') return 'frontHappy';
  if (donutPose === 'lyingAwake' || donutPose === 'lyingAsleep') return donutPose;
  if (pet.intent === 'playWithFrog') return 'frontHappy';
  return 'front';
}

export function isFrontMaltesePose(pose: MaltesePose): boolean {
  return pose === 'front' || pose === 'frontHappy' || pose === 'frontSleepy'
    || pose === 'lyingAwake' || pose === 'lyingAsleep';
}

export function shouldMirrorMaltesePose(pose: MaltesePose, facing: -1 | 1): boolean {
  return pose === 'attention' && facing === -1;
}

export class MalteseSpriteSet {
  private readonly images = new Map<MaltesePose, HTMLImageElement>();

  public constructor(baseUrl = document.baseURI) {
    for (const [pose, definition] of Object.entries(MALTESE_SPRITES) as [
      MaltesePose,
      MalteseSpriteDefinition,
    ][]) {
      const image = new Image();
      image.decoding = 'async';
      image.src = new URL(`assets/pets/maltese/${definition.file}`, baseUrl).href;
      this.images.set(pose, image);
    }
  }

  public get(pose: MaltesePose): HTMLImageElement | null {
    const image = this.images.get(pose);
    return image?.complete && image.naturalWidth > 0 ? image : null;
  }
}

