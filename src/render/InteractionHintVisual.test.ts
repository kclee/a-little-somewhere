import { describe, expect, it, vi } from 'vitest';
import type { PetModel } from '../core/types';
import { drawInteractionHands, getHintHandPoint, hintFade, hintGestureOffset } from './InteractionHintVisual';

const pet = { position: { x: 190, y: 590 } } as PetModel;
const frog = { x: 310, baseline: 640 };
const world = { width: 390, height: 767 };

describe('hand hint geometry', () => {
  it('follows the real pet and frog positions without modifying them', () => {
    const petBefore = { ...pet.position };
    const frogBefore = { ...frog };
    const dogHand = getHintHandPoint('pet', world, pet, frog);
    const frogHand = getHintHandPoint('frog', world, pet, frog);
    expect(dogHand.x).toBeGreaterThan(pet.position.x);
    expect(frogHand.x).toBeGreaterThan(frog.x);
    expect(getHintHandPoint('pet', world, { ...pet, position: { x: pet.position.x + 30, y: pet.position.y } }, frog).x)
      .toBeCloseTo(dogHand.x + 30);
    expect(getHintHandPoint('frog', world, pet, { ...frog, x: frog.x - 20 }).x)
      .toBeCloseTo(frogHand.x - 20);
    expect(pet.position).toEqual(petBefore);
    expect(frog).toEqual(frogBefore);
  });

  it('uses distinct two-tap and sideways-drag gestures with smooth fades', () => {
    expect(hintFade(0)).toBe(0);
    expect(hintFade(0.5)).toBe(1);
    expect(hintFade(1)).toBe(0);
    const tap = (progress: number) => hintGestureOffset({ target: 'donut', gesture: 'tap', progress });
    const drag = (progress: number) => hintGestureOffset({ target: 'frog', gesture: 'drag', progress });
    expect(tap(0.125).y).toBeGreaterThan(5);
    expect(tap(0.625).y).toBeGreaterThan(5);
    expect(tap(0.375).y).toBe(0);
    expect(drag(0).x).toBe(17);
    expect(drag(0.72).x).toBeCloseTo(-18);
    expect(drag(1).x).toBeCloseTo(0);
  });

  it('restores the Canvas transform and alpha after drawing multiple hands', () => {
    const context = {
      save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(),
      closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(), arc: vi.fn(), roundRect: vi.fn(),
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    drawInteractionHands(context, world, pet, frog, [
      { target: 'frog', gesture: 'drag', progress: 0.5 },
      { target: 'donut', gesture: 'tap', progress: 0.5 },
    ]);
    expect(context.save).toHaveBeenCalled();
    expect(context.save).toHaveBeenCalledTimes(vi.mocked(context.restore).mock.calls.length);
    expect(context.translate).toHaveBeenCalledWith(...Object.values(getHintHandPoint('frog', world, pet, frog)));
  });
});
