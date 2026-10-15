import { describe, expect, it } from 'vitest';
import { PetBehaviorMachine } from '../behavior/PetBehaviorMachine';
import { clampFloorPoint } from '../core/RoomGeometry';
import { getDonutRestPoint, getScenePropLayout } from '../render/SceneProps';
import { PetSimulation, REST_SLEEP_SECONDS, REST_WAKE_SECONDS } from './PetSimulation';

function makeSimulation(width = 1000, height = 800): PetSimulation {
  const simulation = new PetSimulation(new PetBehaviorMachine(() => 0));
  simulation.resize(width, height);
  return simulation;
}

function reachRest(simulation: PetSimulation): void {
  simulation.restAtDonut(getDonutRestPoint(simulation.world));
  for (let frame = 0; frame < 150 && simulation.pet.intent === 'donutMove'; frame += 1) {
    simulation.update(0.1);
  }
  expect(simulation.pet.intent).toBe('restAtDonut');
}

describe('donut resting', () => {
  it('chooses a padded center target inside the valid floor on desktop and mobile', () => {
    for (const world of [{ width: 1000, height: 800 }, { width: 390, height: 767 }]) {
      const bed = getScenePropLayout(world).cushion;
      const point = getDonutRestPoint(world);
      expect(point.x).toBe(bed.x);
      expect(Math.abs(point.y - bed.y)).toBeLessThan(bed.height * 0.1);
      expect(clampFloorPoint(point, world)).toEqual(point);
    }
  });

  it('uses Walk or Dash to reach the bed, then rests and sleeps there indefinitely', () => {
    const near = makeSimulation();
    const far = makeSimulation();
    far.pet.position.x = 80;
    const target = getDonutRestPoint(near.world);
    near.restAtDonut(target);
    far.restAtDonut(target);
    expect(near.pet.state).toBe('walk');
    expect(far.pet.state).toBe('jog');
    for (const simulation of [near, far]) {
      for (let frame = 0; frame < 150 && simulation.pet.intent === 'donutMove'; frame += 1) simulation.update(0.1);
      expect(simulation.pet.position).toEqual(target);
      expect(simulation.pet.state).toBe('idle');
      expect(simulation.pet.intent).toBe('restAtDonut');
      expect(simulation.restPhase).toBe('resting');
      for (let frame = 0; frame < (REST_SLEEP_SECONDS - 0.2) / 0.1; frame += 1) simulation.update(0.1);
      expect(simulation.pet.intent).toBe('restAtDonut');
      expect(simulation.restPhase).toBe('resting');
      expect(simulation.pet.position).toEqual(target);
      for (let frame = 0; frame < 300; frame += 1) simulation.update(0.1);
      expect(simulation.restPhase).toBe('sleeping');
      expect(simulation.pet.intent).toBe('restAtDonut');
      expect(simulation.pet.position).toEqual(target);
    }
  });

  it('keeps the dog asleep until a meaningful input', () => {
    const simulation = makeSimulation(390, 767);
    reachRest(simulation);
    for (let frame = 0; frame < 300; frame += 1) simulation.update(0.1);
    expect(simulation.restPhase).toBe('sleeping');
    expect(simulation.pet.intent).toBe('restAtDonut');
  });

  it('keeps a single destination when the bed is clicked repeatedly en route', () => {
    const simulation = makeSimulation();
    simulation.pet.position.x = 80;
    const target = getDonutRestPoint(simulation.world);
    simulation.restAtDonut(target);
    simulation.update(0.2);
    const positionAfterStart = { ...simulation.pet.position };
    simulation.restAtDonut(target);
    expect(simulation.pet.intent).toBe('donutMove');
    expect(simulation.pet.position).toEqual(positionAfterStart);
    for (let frame = 0; frame < 150 && simulation.pet.intent === 'donutMove'; frame += 1) simulation.update(0.1);
    expect(simulation.pet.position).toEqual(target);
    expect(simulation.pet.intent).toBe('restAtDonut');
  });

  it('wakes before carrying out floor, wall, and pet clicks', () => {
    const floor = makeSimulation();
    reachRest(floor);
    floor.moveTo({ x: 100, y: floor.pet.position.y });
    expect(floor.restPhase).toBe('waking');
    expect(floor.pet.state).toBe('idle');
    floor.update(REST_WAKE_SECONDS + 0.02);
    expect(floor.pet.intent).toBe('moveTo');
    expect(['walk', 'jog']).toContain(floor.pet.state);

    const wall = makeSimulation();
    reachRest(wall);
    wall.lookAtWall({ x: 800, y: 20 });
    expect(wall.restPhase).toBe('waking');
    wall.update(REST_WAKE_SECONDS + 0.02);
    expect(wall.pet.intent).toBe('wallMove');

    const pet = makeSimulation();
    reachRest(pet);
    pet.interact({ x: 50, y: 50 });
    expect(pet.restPhase).toBe('waking');
    pet.update(REST_WAKE_SECONDS + 0.02);
    expect(pet.pet.intent).toBe('autonomous');
    expect(pet.pet.state).toBe('attention');
  });
});
