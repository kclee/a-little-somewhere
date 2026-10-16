import { describe, expect, it } from 'vitest';
import type { PetModel, WorldSize } from '../core/types';
import { getMovementBounds } from '../core/RoomGeometry';
import { PetBehaviorMachine, sampleAutonomousWalkDestination } from './PetBehaviorMachine';

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
    { label: 'mobile', size: { width: 366, height: 767 } },
    { label: 'desktop', size: { width: 1000, height: 800 } },
  ])('samples the upper, middle, and lower $label walking floor without leaving bounds', ({ size }) => {
    const bounds = getMovementBounds(size);
    let seed = 42;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const position = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
    const thirds = [0, 0, 0];
    for (let index = 0; index < 300; index += 1) {
      const destination = sampleAutonomousWalkDestination(position, size, random);
      expect(destination.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(destination.x).toBeLessThanOrEqual(bounds.maxX);
      expect(destination.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(destination.y).toBeLessThanOrEqual(bounds.maxY);
      expect(Math.hypot(destination.x - position.x, destination.y - position.y)).toBeGreaterThan(40);
      const third = Math.min(2, Math.floor(3 * (destination.y - bounds.minY) / (bounds.maxY - bounds.minY)));
      thirds[third] = (thirds[third] ?? 0) + 1;
    }
    expect(thirds.every((count) => count > 50)).toBe(true);
  });

  it('walks diagonally toward an upper-floor destination at normal speed', () => {
    const pet = makePet();
    const bounds = getMovementBounds(world);
    pet.position = { x: 130, y: bounds.maxY - 15 };
    const values = [0.5, 0.85, 0.05, 0.5];
    const behavior = new PetBehaviorMachine(() => values.shift() ?? 0.5);
    behavior.update(1.4, pet, world);
    behavior.update(0.1, pet, world);
    expect(pet.state).toBe('walk');
    expect(pet.velocityX).toBeGreaterThan(0);
    expect(pet.velocityY).toBeLessThan(0);
    expect(Math.hypot(pet.velocityX, pet.velocityY)).toBeCloseTo(48);
  });

  it('preserves facing during a mostly vertical autonomous walk', () => {
    const pet = makePet();
    const bounds = getMovementBounds(world);
    pet.position = { x: 200, y: bounds.maxY - 15 };
    pet.facing = -1;
    const values = [0.5, 0.51, 0, 0.5];
    const behavior = new PetBehaviorMachine(() => values.shift() ?? 0.5);
    behavior.update(1.4, pet, world);
    for (let frame = 0; frame < 8; frame += 1) {
      behavior.update(0.1, pet, world);
      pet.position.x += pet.velocityX * 0.1;
      pet.position.y += pet.velocityY * 0.1;
      expect(pet.facing).toBe(-1);
    }
    expect(pet.position.y).toBeLessThan(bounds.maxY - 20);
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
    pet.position = { x: 100, y: getMovementBounds(world).minY };
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

