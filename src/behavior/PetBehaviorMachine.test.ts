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
    expect(pet.state).toBe('idle');
  });

  it('holds position during wall reaction, then returns to autonomy', () => {
    const pet = makePet();
    const behavior = new PetBehaviorMachine(() => 0);
    behavior.moveTo({ x: 320, y: 300 }, pet);
    behavior.lookAtWall(pet);
    behavior.update(1, pet, world);
    expect(pet.state).toBe('wallWag');
    expect([pet.velocityX, pet.velocityY]).toEqual([0, 0]);
    behavior.update(1.6, pet, world);
    expect(pet.state).toBe('idle');
  });
});

