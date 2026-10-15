import { describe, expect, it } from 'vitest';
import { getPetShadowLayout } from './PetShadow';

describe('pet shadow layout', () => {
  it('keeps every state on the shared world-space ground line', () => {
    for (const state of ['idle', 'walk', 'sit', 'attention'] as const) {
      expect(getPetShadowLayout(state, 210).offsetY).toBe(2);
    }
  });

  it('moves the sit shadow beneath its measured contact area', () => {
    expect(getPetShadowLayout('sit', 210).offsetX).toBeCloseTo((56 / 512) * 210);
  });

  it('leaves the sufficiently centered poses unchanged', () => {
    expect(getPetShadowLayout('idle', 210).offsetX).toBe(0);
    expect(getPetShadowLayout('walk', 210).offsetX).toBe(0);
    expect(getPetShadowLayout('attention', 210).offsetX).toBe(0);
  });
});

