import { describe, expect, it } from 'vitest';
import type { PetModel, WorldSize } from '../core/types';
import { PetBehaviorMachine } from './PetBehaviorMachine';

const makePet = (): PetModel => ({
  position: { x: 150, y: 200 },
  velocityX: 0,
  velocityY: 0,
  intent: 'autonomous',
  facing: 1,
  state: 'idle',
  stateElapsed: 0,
});

const world: WorldSize = { width: 400, height: 600 };

describe('PetBehaviorMachine', () => {
  it('stops and faces an interaction point', () => {
    const pet = makePet();
    pet.velocityX = 48;
    const behavior = new PetBehaviorMachine(() => 0);

    behavior.focusOn({ x: 20, y: 100 }, pet);

    expect(pet.state).toBe('attention');
    expect(pet.facing).toBe(-1);
    expect(pet.velocityX).toBe(0);
  });

  it('resumes autonomous behavior after attention', () => {
    const pet = makePet();
    const behavior = new PetBehaviorMachine(() => 0);
    behavior.focusOn({ x: 350, y: 100 }, pet);

    behavior.update(1.2, pet, world);

    expect(pet.state).toBe('idle');
  });

  it('can choose walking and set a direction', () => {
    const values = [0.5, 0.9, 0.2];
    const behavior = new PetBehaviorMachine(() => values.shift() ?? 0);
    const pet = makePet();

    behavior.update(1.4, pet, world);
    behavior.update(0.1, pet, world);

    expect(pet.state).toBe('walk');
    expect(pet.facing).toBe(1);
    expect(pet.velocityX).toBeGreaterThan(0);
  });

  it('chooses occasional destination-based jogging', () => {
    const pet = makePet();
    const behavior = new PetBehaviorMachine(() => 0.84);
    behavior.update(1.4, pet, world);
    expect(pet.state).toBe('jog');
  });

  it('uses walking instead of jogging when no meaningful run fits', () => {
    const pet = makePet();
    pet.position.x = 100;
    const behavior = new PetBehaviorMachine(() => 0.75);
    behavior.update(1.4, pet, { width: 200, height: 600 });
    expect(pet.state).toBe('walk');
  });

  it('plans an autonomous jog away from a nearby boundary', () => {
    const pet = makePet();
    pet.position.x = 338;
    const behavior = new PetBehaviorMachine(() => 0.75);
    behavior.update(1.4, pet, world);
    expect(pet.state).toBe('jog');
    expect(pet.facing).toBe(-1);
    behavior.update(0.1, pet, world);
    expect(pet.velocityX).toBeLessThan(0);
  });

  it.each([
    { edge: 'left', startX: 58, facing: -1 as const, inward: 1 as const },
    { edge: 'right', startX: 342, facing: 1 as const, inward: -1 as const },
  ])('turns once and walks inward from the $edge edge', ({ startX, facing, inward }) => {
    const pet = makePet();
    pet.state = 'walk';
    pet.position.x = startX;
    pet.facing = facing;
    const behavior = new PetBehaviorMachine(() => 0);
    const directions: number[] = [];

    for (let frame = 0; frame < 20; frame += 1) {
      behavior.update(0.05, pet, world);
      directions.push(pet.facing);
      pet.position.x += pet.velocityX * 0.05;
    }

    expect(directions).toEqual(Array(20).fill(inward));
    expect((pet.position.x - startX) * inward).toBeGreaterThan(40);
  });

  it.each([
    { startX: 110, facing: -1 as const, inward: 1 as const },
    { startX: 290, facing: 1 as const, inward: -1 as const },
  ])('turns before an autonomous walk clips the sprite at x=$startX', ({ startX, facing, inward }) => {
    const pet = makePet();
    pet.state = 'walk';
    pet.position.x = startX;
    pet.facing = facing;
    const behavior = new PetBehaviorMachine(() => 0);

    behavior.update(0.1, pet, world);

    expect(pet.facing).toBe(inward);
    expect(pet.velocityX * inward).toBeGreaterThan(0);
  });

  it('moves to a target, allows redirection, and resumes autonomy', () => {
    const pet = makePet();
    const behavior = new PetBehaviorMachine(() => 0);
    behavior.moveTo({ x: 350, y: 300 }, pet);
    expect(pet.state).toBe('jog');
    behavior.update(0.1, pet, world);
    expect(pet.velocityX).toBeGreaterThan(0);
    expect(pet.velocityY).toBeGreaterThan(0);
    behavior.moveTo({ x: 100, y: 220 }, pet);
    behavior.update(0.1, pet, world);
    expect(pet.velocityX).toBeLessThan(0);
    pet.position = { x: 100, y: 468 };
    behavior.update(0.1, pet, world);
    expect(pet.intent).toBe('autonomous');
    expect(pet.state).toBe('attention');
  });

  it('holds position during wall reaction, then returns to autonomy', () => {
    const pet = makePet();
    const behavior = new PetBehaviorMachine(() => 0);
    behavior.moveTo({ x: 320, y: 300 }, pet);
    behavior.lookAtWall({ x: 150, y: 10 }, pet, world);
    behavior.update(1, pet, world);
    expect(pet.state).toBe('wallWag');
    expect([pet.velocityX, pet.velocityY]).toEqual([0, 0]);
    behavior.update(1.6, pet, world);
    expect(pet.state).toBe('idle');
  });

  it('holds floor-arrival Attention through autonomous timer expiry, then resumes', () => {
    const pet = makePet();
    pet.position = { x: 150, y: 468 };
    const behavior = new PetBehaviorMachine(() => 0);
    behavior.moveTo({ x: 180, y: 468 }, pet);
    pet.position.x = 180;
    behavior.update(0.1, pet, world);
    expect(pet.state).toBe('attention');
    expect(pet.intent).toBe('autonomous');
    behavior.update(1.6, pet, world);
    expect(pet.state).toBe('attention');
    behavior.update(0.2, pet, world);
    expect(pet.state).toBe('idle');
  });

  it('replaces a pending wall reaction when a new floor click redirects movement', () => {
    const pet = makePet();
    pet.position = { x: 150, y: 468 };
    const behavior = new PetBehaviorMachine(() => 0);
    behavior.lookAtWall({ x: 340, y: 40 }, pet, world);
    expect(pet.intent).toBe('wallMove');
    behavior.moveTo({ x: 100, y: 468 }, pet);
    pet.position.x = 100;
    behavior.update(0.1, pet, world);
    expect(pet.state).toBe('attention');
    expect(pet.intent).toBe('autonomous');
  });
});

