import { describe, expect, it } from 'vitest';
import type { PetModel } from '../core/types';
import { MALTESE_SPRITES, selectMaltesePose, shouldMirrorMaltesePose } from './MalteseSpriteSet';

const pet = (
  state: PetModel['state'], facing: PetModel['facing'] = 1,
  intent: PetModel['intent'] = 'autonomous',
): Pick<PetModel, 'state' | 'facing' | 'intent'> => ({
  state,
  facing,
  intent,
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

  it('limits the new expressions to frog play and donut sleep', () => {
    expect(selectMaltesePose(pet('idle', 1, 'restAtDonut'))).toBe('front');
    expect(selectMaltesePose(pet('idle', 1, 'restAtDonut'), true)).toBe('frontSleepy');
    expect(selectMaltesePose(pet('idle', 1, 'playWithFrog'))).toBe('frontHappy');
    expect(selectMaltesePose(pet('walk', 1, 'frogMove'))).toBe('sideRight');
    expect(selectMaltesePose(pet('attention', 1, 'playWithFrog'))).toBe('attention');
    expect(selectMaltesePose(pet('idle', 1, 'insideHouse'))).toBe('front');
  });

  it('retains the shared feet anchor for the original poses', () => {
    for (const pose of ['front', 'sideLeft', 'sideRight', 'back', 'attention'] as const) {
      const definition = MALTESE_SPRITES[pose];
      expect(definition.canvasSize).toBe(512);
      expect(definition.anchor).toEqual([0.5, 0.9375]);
    }
  });

  it('normalizes expression feet to the original front paw line', () => {
    const originalPaw = (452 - MALTESE_SPRITES.front.anchor[1] * 512) / 512;
    for (const pose of ['frontHappy', 'frontSleepy'] as const) {
      const definition = MALTESE_SPRITES[pose];
      const expressionPaw = (1109 - definition.anchor[1] * definition.canvasSize) / definition.canvasSize;
      expect(Math.abs(expressionPaw - originalPaw)).toBeLessThan(0.004);
      expect(definition.crop.x).toBeLessThan(245);
      expect(definition.crop.y).toBeLessThan(145);
      expect(definition.crop.x + definition.crop.width).toBeGreaterThan(1042);
      expect(definition.crop.y + definition.crop.height).toBeGreaterThan(1109);
    }
  });
});

