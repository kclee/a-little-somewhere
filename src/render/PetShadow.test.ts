import { describe, expect, it } from 'vitest';
import { getPetShadowLayout } from './PetShadow';

describe('pet shadow layout', () => {
  it('keeps every state on the shared world-space ground line', () => {
    for (const state of ['idle', 'walk', 'sit', 'attention'] as const) {
      expect(getPetShadowLayout(state, 210).offsetY).toBe(2);
    }
  });

  it('moves the sit shadow beneath its measured contact area', () => {
    expect(getPetShadowLayout('sit', 210).offsetX).toBeCloseTo((138 / 1254) * 210);
  });

  it('gives Sit a flatter, wider footprint than its previous compact shadow', () => {
    const shadow = getPetShadowLayout('sit', 210);
    expect(shadow.radiusX).toBeCloseTo(210 * 0.29);
    expect(shadow.radiusY).toBeCloseTo(210 * 0.075);
  });

  it('leaves the sufficiently centered poses unchanged', () => {
    expect(getPetShadowLayout('idle', 210).offsetX).toBe(0);
    expect(getPetShadowLayout('walk', 210).offsetX).toBe(0);
    expect(getPetShadowLayout('attention', 210).offsetX).toBe(0);
  });
});

