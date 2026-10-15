import { describe, expect, it } from 'vitest';
import type { PetModel } from '../core/types';
import { MALTESE_SPRITES, selectMaltesePose, shouldMirrorMaltesePose } from './MalteseSpriteSet';

const pet = (state: PetModel['state'], facing: PetModel['facing'] = 1): Pick<PetModel, 'state' | 'facing'> => ({
  state,
  facing,
});

describe('Maltese sprite selection', () => {
  it('maps autonomous states to static poses without treating them as animation frames', () => {
    expect(selectMaltesePose(pet('idle'))).toBe('front');
    expect(selectMaltesePose(pet('sit'))).toBe('back');
    expect(selectMaltesePose(pet('walk', -1))).toBe('sideLeft');
    expect(selectMaltesePose(pet('walk', 1))).toBe('sideRight');
  });

  it('uses the dedicated attention pose and mirrors only for left-side attention', () => {
    expect(selectMaltesePose(pet('attention', -1))).toBe('attention');
    expect(shouldMirrorMaltesePose('attention', -1)).toBe(true);
    expect(shouldMirrorMaltesePose('attention', 1)).toBe(false);
    expect(shouldMirrorMaltesePose('sideLeft', -1)).toBe(false);
  });

  it('retains the shared feet anchor for every pose', () => {
    for (const definition of Object.values(MALTESE_SPRITES)) {
      expect(definition.canvasSize).toBe(512);
      expect(definition.anchor).toEqual([0.5, 0.9375]);
    }
  });
});

