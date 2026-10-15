import { describe, expect, it } from 'vitest';
import { getPetShadowLayout } from './PetShadow';

describe('pet shadow layout', () => {
  it('keeps standing states on the shared world-space ground line', () => {
    for (const state of ['idle', 'walk', 'jog', 'attention'] as const) {
      expect(getPetShadowLayout(state, 210).offsetY).toBe(2);
    }
  });

  it('brings only the idle front-sprite shadow up to its visible paws', () => {
    for (const size of [150, 210]) {
      const front = getPetShadowLayout('idle', size, 'front');
      const previous = getPetShadowLayout('idle', size);
      expect(front.offsetY).toBeCloseTo(2 + size * ((452 - 480) / 512));
      expect(front.offsetY).toBeLessThan(previous.offsetY);
      expect(front.offsetX).toBe(previous.offsetX);
      expect(front.radiusX).toBe(previous.radiusX);
      expect(front.radiusY).toBe(previous.radiusY);
      expect(getPetShadowLayout('idle', size, 'sideRight')).toEqual(previous);
      expect(getPetShadowLayout('idle', size, 'frontHappy')).toEqual(front);
      expect(getPetShadowLayout('idle', size, 'frontSleepy')).toEqual(front);
      expect(getPetShadowLayout('attention', size, 'attention').offsetY).toBe(2);
    }
  });

  it('moves the sit shadow beneath its measured contact area', () => {
    expect(getPetShadowLayout('sit', 210).offsetX).toBeCloseTo((138 / 1254) * 210);
    expect(getPetShadowLayout('sit', 210).offsetY).toBeCloseTo((-30 / 1254) * 210);
    expect(getPetShadowLayout('wallWag', 210)).toEqual(getPetShadowLayout('sit', 210));
    expect(getPetShadowLayout('sit', 210, 'back')).toEqual(getPetShadowLayout('sit', 210));
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

