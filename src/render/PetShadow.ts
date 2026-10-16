import type { PetState } from '../core/types';
import { isFrontMaltesePose, type MaltesePose } from './MalteseSpriteSet';

const REAR_SPRITE_SIZE = 1254;
const SIT_CONTACT_OFFSET_X = 138 / REAR_SPRITE_SIZE;
// The rear pose's front paw reaches the 1175px anchor, while the other paws
// contact the floor around 1110px. Center the shadow within that footprint.
const SIT_CONTACT_OFFSET_Y = -30 / REAR_SPRITE_SIZE;
// The front sprite's two paws end around source y=452, above its y=480
// feet anchor. Its shadow needs to follow the artwork, not the idle FSM label.
const FRONT_CONTACT_OFFSET_Y = (452 - 480) / 512;
const STANDING_RADIUS_X = 0.3;
const STANDING_RADIUS_Y = 0.12;
const SIT_RADIUS_X = 0.29;
const SIT_RADIUS_Y = 0.075;

export interface PetShadowLayout {
  offsetX: number;
  offsetY: number;
  radiusX: number;
  radiusY: number;
}

export function shouldDrawPetShadow(state: PetState, pose?: MaltesePose): boolean {
  return state !== 'floorRest' && state !== 'floorSleep' && state !== 'floorWake'
    && pose !== 'lyingAwake' && pose !== 'lyingAsleep';
}

export function getPetShadowLayout(
  state: PetState,
  spriteSize: number,
  pose?: MaltesePose,
): PetShadowLayout {
  const sitting = state === 'sit' || state === 'wallWag';
  const front = state === 'idle' && pose !== undefined && isFrontMaltesePose(pose);
  return {
    // The supplied rear poses share a ground-contact center 138 source pixels
    // right of their canvas center. Keep the shadow in world space so the dog
    // and shadow remain independently stable during the tail animation.
    offsetX: sitting ? spriteSize * SIT_CONTACT_OFFSET_X : 0,
    offsetY: sitting
      ? spriteSize * SIT_CONTACT_OFFSET_Y
      : front ? 2 + spriteSize * FRONT_CONTACT_OFFSET_Y : 2,
    radiusX: spriteSize * (sitting ? SIT_RADIUS_X : STANDING_RADIUS_X),
    radiusY: spriteSize * (sitting ? SIT_RADIUS_Y : STANDING_RADIUS_Y),
  };
}

