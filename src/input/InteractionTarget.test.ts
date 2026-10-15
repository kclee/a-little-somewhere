import { describe, expect, it } from 'vitest';
import type { PetModel, WorldSize } from '../core/types';
import { getScenePropLayout } from '../render/SceneProps';
import { getInteractionTarget } from './InteractionTarget';

const world: WorldSize = { width: 390, height: 767 };
const pet: PetModel = {
  position: { x: 190, y: 598 }, velocityX: 0, velocityY: 0,
  intent: 'autonomous', facing: 1, state: 'idle', stateElapsed: 0,
};

describe('interaction targeting', () => {
  it('gives the pet priority over props and the floor', () => {
    expect(getInteractionTarget({ x: pet.position.x, y: pet.position.y - 45 }, pet, world)).toBe('pet');
  });

  it('reserves prop areas without triggering floor movement', () => {
    const props = getScenePropLayout(world);
    expect(getInteractionTarget({ x: props.frog.x, y: props.frog.baseline }, pet, world)).toBe('frog');
    expect(getInteractionTarget({ x: props.cushion.x, y: props.cushion.y }, pet, world)).toBe('cushion');
  });

  it('distinguishes empty wall and floor', () => {
    expect(getInteractionTarget({ x: 20, y: 200 }, pet, world)).toBe('wall');
    expect(getInteractionTarget({ x: 20, y: 700 }, pet, world)).toBe('floor');
  });
});
