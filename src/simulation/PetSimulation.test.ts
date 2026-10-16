import { describe, expect, it } from 'vitest';
import { PetBehaviorMachine } from '../behavior/PetBehaviorMachine';
import { FLOOR_START_RATIO, getFloorStartY, getMovementBounds } from '../core/RoomGeometry';
import { PetSimulation } from './PetSimulation';

describe('PetSimulation', () => {
  it('holds the front-facing startup pose until the initial hints finish', () => {
    const simulation = new PetSimulation(new PetBehaviorMachine(() => 0.5));
    simulation.resize(390, 767);
    const start = { ...simulation.pet.position };
    expect(simulation.pet.state).toBe('idle');
    for (let frame = 0; frame < 32; frame += 1) simulation.update(0.25, true);
    expect(simulation.pet.position).toEqual(start);
    expect(simulation.pet.state).toBe('idle');
    expect(simulation.pet.stateElapsed).toBe(0);
    for (let frame = 0; frame < 6; frame += 1) simulation.update(0.25);
    expect(simulation.pet.state).toBe('walk');
  });

  it('allows a directed move to interrupt the startup hold', () => {
    const simulation = new PetSimulation();
    simulation.resize(390, 767);
    const startX = simulation.pet.position.x;
    simulation.moveTo({ x: startX + 70, y: simulation.pet.position.y });
    simulation.update(0.1, true);
    expect(simulation.pet.position.x).toBeGreaterThan(startX);
  });

  it('keeps the pet within room bounds when resized', () => {
    const simulation = new PetSimulation();
    simulation.pet.position.x = 999;

    simulation.resize(320, 700);

    expect(simulation.pet.position.x).toBeGreaterThanOrEqual(80);
    expect(simulation.pet.position.x).toBeLessThanOrEqual(240);
    expect(simulation.pet.position.y).toBeCloseTo(546);
  });

  it('clamps unusually large frame deltas', () => {
    const simulation = new PetSimulation();
    simulation.update(5);

    expect(simulation.elapsed).toBeCloseTo(0.25);
  });

  it('clamps floor destinations and reaches them without snapping back to the original ground line', () => {
    const simulation = new PetSimulation();
    simulation.resize(390, 767);
    simulation.moveTo({ x: 1000, y: 1000 });
    expect(simulation.pet.intent).toBe('moveTo');
    for (let index = 0; index < 150 && simulation.pet.intent === 'moveTo'; index += 1) simulation.update(0.1);
    expect(simulation.pet.position.x).toBeCloseTo(310);
    expect(simulation.pet.position.y).toBeCloseTo(725);
    expect(simulation.pet.intent).toBe('autonomous');
  });

  it('can actually reach the newly exposed upper mobile floor', () => {
    const simulation = new PetSimulation(new PetBehaviorMachine(() => 0));
    simulation.resize(366, 767);
    const upperFloor = getMovementBounds(simulation.world).minY;
    expect(upperFloor).toBeLessThan(
      simulation.world.height * FLOOR_START_RATIO + Math.min(165, simulation.world.height * 0.2),
    );
    expect(upperFloor).toBeGreaterThan(getFloorStartY(simulation.world));
    simulation.moveTo({ x: 110, y: upperFloor });
    for (let frame = 0; frame < 180 && simulation.pet.intent === 'moveTo'; frame += 1) {
      simulation.update(0.1);
    }
    expect(simulation.pet.position.y).toBeCloseTo(upperFloor);
    expect(simulation.pet.state).toBe('attention');
  });

  it('autonomously travels into the upper mobile floor without a directed click', () => {
    const values = [0.5, 0.8, 0, 0.5];
    const simulation = new PetSimulation(new PetBehaviorMachine(() => values.shift() ?? 0.5));
    simulation.resize(366, 767);
    const startY = simulation.pet.position.y;
    for (let frame = 0; frame < 14; frame += 1) simulation.update(0.1);
    expect(simulation.pet.state).toBe('walk');
    expect(simulation.pet.intent).toBe('autonomous');
    for (let frame = 0; frame < 20; frame += 1) simulation.update(0.1);
    expect(simulation.pet.position.y).toBeLessThan(startY - 45);
    expect(simulation.pet.position.y).toBeGreaterThanOrEqual(getMovementBounds(simulation.world).minY);
    expect(Math.hypot(simulation.pet.velocityX, simulation.pet.velocityY)).toBeCloseTo(48);
  });

  it('lets a directed floor request override an autonomous walk without changing directed speed', () => {
    const simulation = new PetSimulation(new PetBehaviorMachine(() => 0.5));
    simulation.resize(1000, 800);
    for (let frame = 0; frame < 14; frame += 1) simulation.update(0.1);
    expect(simulation.pet.state).toBe('walk');
    simulation.update(0.1);
    const start = { ...simulation.pet.position };
    const target = { x: start.x + 100, y: start.y };
    simulation.moveTo(target);
    expect(simulation.pet.intent).toBe('moveTo');
    simulation.update(0.1);
    expect(simulation.pet.position.x - start.x).toBeCloseTo(4.8);
    expect(simulation.pet.position.y).toBeCloseTo(start.y);
    expect(simulation.pet.state).toBe('walk');
  });

  it('skips movement for a nearby wall click and still holds pet attention', () => {
    const simulation = new PetSimulation();
    simulation.resize(390, 767);
    const original = { ...simulation.pet.position };
    simulation.lookAtWall({ x: original.x + 5, y: 20 });
    simulation.update(0.5);
    expect(simulation.pet.position).toEqual(original);
    simulation.interact({ x: 10, y: 10 });
    simulation.update(0.5);
    expect(simulation.pet.position).toEqual(original);
  });

  it('maps a wall click to a clamped floor X while preserving the current Y', () => {
    const simulation = new PetSimulation(new PetBehaviorMachine(() => 0));
    simulation.resize(390, 767);
    const startY = simulation.pet.position.y;
    simulation.lookAtWall({ x: 1000, y: 5 });
    expect(simulation.pet.intent).toBe('wallMove');
    for (let frame = 0; frame < 120 && simulation.pet.intent === 'wallMove'; frame += 1) {
      simulation.update(0.1);
      expect(simulation.pet.position.y).toBeCloseTo(startY);
    }
    expect(simulation.pet.position.x).toBeCloseTo(310);
    expect(simulation.pet.state).toBe('wallWag');
    for (let frame = 0; frame < 24; frame += 1) simulation.update(0.1);
    expect(simulation.pet.state).toBe('wallWag');
    for (let frame = 0; frame < 2; frame += 1) simulation.update(0.1);
    expect(simulation.pet.state).toBe('idle');
  });

  it('lets a new click interrupt a wall move or arrival wag immediately', () => {
    const simulation = new PetSimulation(new PetBehaviorMachine(() => 0));
    simulation.resize(390, 767);
    simulation.lookAtWall({ x: 310, y: 0 });
    simulation.update(0.1);
    simulation.moveTo({ x: 58, y: simulation.pet.position.y });
    expect(simulation.pet.intent).toBe('moveTo');
    for (let frame = 0; frame < 120 && simulation.pet.intent === 'moveTo'; frame += 1) simulation.update(0.1);
    expect(simulation.pet.state).toBe('attention');
    simulation.lookAtWall({ x: simulation.pet.position.x, y: 0 });
    expect(simulation.pet.state).toBe('wallWag');
    simulation.moveTo({ x: 300, y: simulation.pet.position.y });
    expect(simulation.pet.intent).toBe('moveTo');
    expect(['walk', 'jog']).toContain(simulation.pet.state);
  });

  it('moves a directed jog farther than a walk in either direction over the same elapsed time', () => {
    for (const direction of [-1, 1]) {
      const walk = new PetSimulation();
      const jog = new PetSimulation();
      walk.resize(1000, 800);
      jog.resize(1000, 800);
      const startX = walk.pet.position.x;
      const y = walk.pet.position.y;
      walk.moveTo({ x: startX + direction * 120, y });
      jog.moveTo({ x: startX + direction * 300, y });
      expect(walk.pet.state).toBe('walk');
      expect(jog.pet.state).toBe('jog');

      for (let frame = 0; frame < 60; frame += 1) {
        walk.update(1 / 60);
        jog.update(1 / 60);
      }

      const walkDistance = Math.abs(walk.pet.position.x - startX);
      const jogDistance = Math.abs(jog.pet.position.x - startX);
      expect(walkDistance).toBeCloseTo(48);
      expect(jogDistance).toBeCloseTo(240);
      expect(jogDistance / walkDistance).toBeCloseTo(5);
    }
  });

  it('keeps jog displacement independent of frame subdivision', () => {
    const coarse = new PetSimulation();
    const fine = new PetSimulation();
    for (const simulation of [coarse, fine]) {
      simulation.resize(1000, 800);
      simulation.moveTo({ x: 800, y: simulation.pet.position.y });
    }
    for (let frame = 0; frame < 10; frame += 1) coarse.update(0.1);
    for (let frame = 0; frame < 20; frame += 1) fine.update(0.05);
    expect(coarse.pet.position.x).toBeCloseTo(fine.pet.position.x);
  });

  it('preserves the dash distance during ordinary slow frames', () => {
    const simulation = new PetSimulation();
    simulation.resize(1000, 800);
    const startX = simulation.pet.position.x;
    simulation.moveTo({ x: 800, y: simulation.pet.position.y });
    for (let frame = 0; frame < 5; frame += 1) simulation.update(0.2);
    expect(simulation.pet.position.x - startX).toBeCloseTo(240);
    expect(simulation.pet.state).toBe('jog');
  });

  it('uses the faster displacement for occasional autonomous jogs too', () => {
    const walk = new PetSimulation(new PetBehaviorMachine(() => 0.5));
    const jog = new PetSimulation(new PetBehaviorMachine(() => 0.75));
    for (const simulation of [walk, jog]) {
      simulation.resize(1000, 800);
      for (let frame = 0; frame < 14; frame += 1) simulation.update(0.1);
    }
    expect(walk.pet.state).toBe('walk');
    expect(jog.pet.state).toBe('jog');
    const walkStart = { ...walk.pet.position };
    const jogStart = { ...jog.pet.position };
    for (let frame = 0; frame < 10; frame += 1) {
      walk.update(0.1);
      jog.update(0.1);
    }
    const walkDistance = Math.hypot(walk.pet.position.x - walkStart.x, walk.pet.position.y - walkStart.y);
    const jogDistance = Math.hypot(jog.pet.position.x - jogStart.x, jog.pet.position.y - jogStart.y);
    expect(walkDistance).toBeCloseTo(48);
    expect(jogDistance).toBeCloseTo(240);
  });

  it('keeps an autonomous desktop dash active until its planned destination', () => {
    const values = [0.75, 0.75, 0.5, 0];
    const simulation = new PetSimulation(new PetBehaviorMachine(() => values.shift() ?? 0));
    simulation.resize(1000, 800);
    for (let frame = 0; frame < 14; frame += 1) simulation.update(0.1);
    const startX = simulation.pet.position.x;
    expect(simulation.pet.state).toBe('jog');
    expect(simulation.pet.intent).toBe('autonomous');
    for (let frame = 0; frame < 12; frame += 1) simulation.update(0.1);
    expect(simulation.pet.state).toBe('jog');
    expect(simulation.pet.position.x - startX).toBeCloseTo(288);
    for (let frame = 0; frame < 8; frame += 1) simulation.update(0.1);
    expect(simulation.pet.state).toBe('idle');
    expect(simulation.pet.position.x - startX).toBeCloseTo(420);
  });

  it('keeps a long click-directed dash active for the entire unobstructed route', () => {
    const simulation = new PetSimulation(new PetBehaviorMachine(() => 0));
    simulation.resize(1200, 800);
    const targetX = 1100;
    simulation.moveTo({ x: targetX, y: simulation.pet.position.y });
    expect(simulation.pet.state).toBe('jog');
    for (let frame = 0; frame < 20; frame += 1) {
      simulation.update(0.1);
      expect(simulation.pet.state).toBe('jog');
    }
    expect(simulation.pet.position.x).toBeCloseTo(1080);
    for (let frame = 0; frame < 5 && simulation.pet.intent === 'moveTo'; frame += 1) {
      simulation.update(0.1);
    }
    expect(Math.abs(simulation.pet.position.x - targetX)).toBeLessThanOrEqual(3);
    expect(simulation.pet.intent).toBe('autonomous');
    expect(simulation.pet.state).toBe('attention');
  });

  it('shortens an autonomous dash at mobile bounds without bouncing', () => {
    const values = [0.75, 0.75, 0.5, 0];
    const simulation = new PetSimulation(new PetBehaviorMachine(() => values.shift() ?? 0));
    simulation.resize(390, 767);
    for (let frame = 0; frame < 14; frame += 1) simulation.update(0.1);
    expect(simulation.pet.state).toBe('jog');
    const startX = simulation.pet.position.x;
    for (let frame = 0; frame < 20; frame += 1) {
      simulation.update(0.1);
      expect(simulation.pet.position.x).toBeLessThanOrEqual(310);
      expect(simulation.pet.position.x).toBeGreaterThanOrEqual(startX);
    }
    expect(simulation.pet.position.x).toBeCloseTo(310);
    expect(simulation.pet.state).toBe('idle');
  });

  it('redirects repeated floor clicks during a jog without stale timer transitions', () => {
    const simulation = new PetSimulation(new PetBehaviorMachine(() => 0));
    simulation.resize(1000, 800);
    simulation.moveTo({ x: 800, y: simulation.pet.position.y });
    simulation.update(0.1);
    expect(simulation.pet.state).toBe('jog');
    simulation.moveTo({ x: 200, y: simulation.pet.position.y });
    simulation.update(0.1);
    expect(simulation.pet.state).toBe('jog');
    expect(simulation.pet.velocityX).toBeLessThan(0);
    const nearTarget = simulation.pet.position.x - 40;
    simulation.moveTo({ x: nearTarget, y: simulation.pet.position.y });
    expect(simulation.pet.state).toBe('walk');
    for (let frame = 0; frame < 15 && simulation.pet.intent === 'moveTo'; frame += 1) simulation.update(0.1);
    expect(Math.abs(simulation.pet.position.x - nearTarget)).toBeLessThanOrEqual(3);
    expect(simulation.pet.state).toBe('attention');
  });
});

