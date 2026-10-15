import type { PetState } from '../core/types';

const REAR_SPRITE_SIZE = 1254;
const SIT_CONTACT_OFFSET_X = 138 / REAR_SPRITE_SIZE;
// The rear pose's front paw reaches the 1175px anchor, while the other paws
// contact the floor around 1110px. Center the shadow within that footprint.
const SIT_CONTACT_OFFSET_Y = -30 / REAR_SPRITE_SIZE;
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

export function getPetShadowLayout(state: PetState, spriteSize: number): PetShadowLayout {
  const sitting = state === 'sit' || state === 'wallWag';
  return {
    // The supplied rear poses share a ground-contact center 138 source pixels
    // right of their canvas center. Keep the shadow in world space so the dog
    // and shadow remain independently stable during the tail animation.
    offsetX: sitting ? spriteSize * SIT_CONTACT_OFFSET_X : 0,
    offsetY: sitting ? spriteSize * SIT_CONTACT_OFFSET_Y : 2,
    radiusX: spriteSize * (sitting ? SIT_RADIUS_X : STANDING_RADIUS_X),
    radiusY: spriteSize * (sitting ? SIT_RADIUS_Y : STANDING_RADIUS_Y),
  };
}

