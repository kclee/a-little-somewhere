import { describe, expect, it } from 'vitest';
import type { PetModel, WorldSize } from '../core/types';
import { PetBehaviorMachine } from './PetBehaviorMachine';

const makePet = (): PetModel => ({
  position: { x: 150, y: 200 },
  velocityX: 0,
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
});

