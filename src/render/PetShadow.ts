import type { PetState } from '../core/types';

const STATIC_SPRITE_SIZE = 512;
const SIT_CONTACT_OFFSET_X = 56 / STATIC_SPRITE_SIZE;

export interface PetShadowLayout {
  offsetX: number;
  offsetY: number;
  radiusX: number;
  radiusY: number;
}

export function getPetShadowLayout(state: PetState, spriteSize: number): PetShadowLayout {
  return {
    offsetX: state === 'sit' ? spriteSize * SIT_CONTACT_OFFSET_X : 0,
    offsetY: 2,
    radiusX: spriteSize * (state === 'sit' ? 0.25 : 0.3),
    radiusY: spriteSize * 0.12,
  };
}

