import { describe, expect, it } from 'vitest';
import type { PetModel, WorldSize } from '../core/types';
import { getFloorStartY } from '../core/RoomGeometry';
import { getDonutRestPoint, getScenePropLayout } from '../render/SceneProps';
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

  it('does not hit the invisible outside pet while it rests inside the house', () => {
    expect(getInteractionTarget(
      { x: pet.position.x, y: pet.position.y - 45 }, pet, world, undefined, false,
    )).toBe('floor');
  });

  it('reserves prop areas without triggering floor movement', () => {
    const props = getScenePropLayout(world);
    expect(getInteractionTarget({ x: props.frog.x, y: props.frog.baseline }, pet, world)).toBe('frog');
    expect(getInteractionTarget({ x: props.cushion.x, y: props.cushion.y }, pet, world)).toBe('cushion');
    expect(getInteractionTarget({
      x: props.cushion.x + props.cushion.width / 2 + 4,
      y: props.cushion.y,
    }, pet, world)).toBe('floor');
  });

  it('follows the single frog hit area after it leaves the house', () => {
    const props = getScenePropLayout(world);
    const moved = { x: 265, y: 670 };
    expect(getInteractionTarget(moved, pet, world, moved)).toBe('frog');
    expect(getInteractionTarget({ x: props.frog.x, y: props.frog.baseline }, pet, world, moved)).toBe('house');
  });

  it('keeps pet clicks ahead of donut clicks while resting in its center', () => {
    const restPoint = getDonutRestPoint(world);
    const restingPet: PetModel = { ...pet, position: restPoint, intent: 'restAtDonut', state: 'idle' };
    expect(getInteractionTarget({ x: restPoint.x, y: restPoint.y - 55 }, restingPet, world)).toBe('pet');
    const bed = getScenePropLayout(world).cushion;
    expect(getInteractionTarget({ x: bed.x, y: bed.y + bed.height * 0.3 }, restingPet, world)).toBe('cushion');
  });

  it('distinguishes empty wall and floor', () => {
    expect(getInteractionTarget({ x: 20, y: 200 }, pet, world)).toBe('wall');
    expect(getInteractionTarget({ x: 20, y: 700 }, pet, world)).toBe('floor');
    expect(getInteractionTarget({ x: 20, y: getFloorStartY(world) + 4 }, pet, world)).toBe('floor');
  });
});
