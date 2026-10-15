import { describe, expect, it } from 'vitest';
import { PetBehaviorMachine } from '../behavior/PetBehaviorMachine';
import { clampFloorPoint } from '../core/RoomGeometry';
import { getHouseVisitPoint, getScenePropLayout } from '../render/SceneProps';
import { FrogPlayController } from './FrogPlayController';
import { HOUSE_WIGGLE_SECONDS, HouseVisitController } from './HouseVisitController';
import { PetSimulation, REST_SLEEP_SECONDS, REST_WAKE_SECONDS } from './PetSimulation';

function setup(width = 1000, height = 800) {
  const simulation = new PetSimulation(new PetBehaviorMachine(() => 0));
  simulation.resize(width, height);
  const visit = new HouseVisitController();
  return { simulation, visit };
}

function tick(simulation: PetSimulation, visit: HouseVisitController, seconds: number): void {
  for (let frame = 0; frame < Math.round(seconds / 0.05); frame += 1) {
    simulation.update(0.05);
    if (visit.update(0.05, simulation.pet)) simulation.completeHouseEntry();
  }
}

function arrive(simulation: PetSimulation, visit: HouseVisitController): void {
  simulation.visitHouse(getHouseVisitPoint(simulation.world));
  for (let frame = 0; frame < 300 && simulation.pet.intent === 'houseMove'; frame += 1) {
    tick(simulation, visit, 0.05);
  }
  expect(simulation.pet.intent).toBe('insideHouse');
}

describe('pet-house visit', () => {
  it('chooses a reachable entrance point on desktop and mobile', () => {
    for (const [width, height] of [[1000, 800], [390, 767]] as const) {
      const { simulation } = setup(width, height);
      const house = getScenePropLayout(simulation.world).house;
      const point = getHouseVisitPoint(simulation.world);
      expect(point.x).toBeLessThan(house.x);
      expect(clampFloorPoint(point, simulation.world)).toEqual(point);
    }
  });

  it('hides the normal pet for the wiggle, then keeps the occupied house through sleep', () => {
    const { simulation, visit } = setup();
    arrive(simulation, visit);
    const arrivalPosition = { ...simulation.pet.position };
    expect(visit.getVisual()).toMatchObject({ hidePet: true, occupied: false });
    tick(simulation, visit, HOUSE_WIGGLE_SECONDS / 2);
    expect(Math.abs(visit.getVisual().wiggle)).toBeLessThan(0.014);
    tick(simulation, visit, HOUSE_WIGGLE_SECONDS);
    expect(visit.getVisual()).toEqual({ occupied: true, hidePet: true, wiggle: 0 });
    expect(simulation.restPhase).toBe('resting');
    tick(simulation, visit, REST_SLEEP_SECONDS + 20);
    expect(simulation.pet.intent).toBe('insideHouse');
    expect(simulation.restPhase).toBe('sleeping');
    expect(simulation.pet.position).toEqual(arrivalPosition);
    expect(visit.getVisual()).toEqual({ occupied: true, hidePet: true, wiggle: 0 });
  });

  it('ignores repeated house clicks during approach and the entry wiggle', () => {
    const { simulation, visit } = setup(390, 767);
    const target = getHouseVisitPoint(simulation.world);
    simulation.visitHouse(target);
    tick(simulation, visit, 0.2);
    const current = { ...simulation.pet.position };
    simulation.visitHouse(target);
    expect(simulation.pet.position).toEqual(current);
    for (let frame = 0; frame < 300 && simulation.pet.intent === 'houseMove'; frame += 1) tick(simulation, visit, 0.05);
    expect(simulation.isHouseSequenceActive()).toBe(true);
    simulation.visitHouse(target);
    tick(simulation, visit, HOUSE_WIGGLE_SECONDS + 0.1);
    expect(simulation.isHouseSequenceActive()).toBe(false);
    expect(simulation.restPhase).toBe('resting');
  });

  it('ignores floor, wall, pet, and frog input during entry, then accepts a wake request', () => {
    for (const action of ['floor', 'wall', 'pet', 'frog'] as const) {
      const { simulation, visit } = setup();
      simulation.visitHouse(getHouseVisitPoint(simulation.world));
      tick(simulation, visit, 0.1);
      const approachPosition = { ...simulation.pet.position };
      if (action === 'floor') simulation.moveTo({ x: 200, y: 700 });
      if (action === 'wall') simulation.lookAtWall({ x: 300, y: 20 });
      if (action === 'pet') simulation.interact({ x: 100, y: 100 });
      if (action === 'frog') simulation.playWithFrog({ x: 300, y: 700 });
      expect(simulation.pet.intent).toBe('houseMove');
      expect(simulation.pet.position).toEqual(approachPosition);
      arrive(simulation, visit);
      expect(visit.getVisual().occupied).toBe(false);
      const original = { ...simulation.pet.position };
      if (action === 'floor') simulation.moveTo({ x: 200, y: original.y });
      if (action === 'wall') simulation.lookAtWall({ x: 300, y: 20 });
      if (action === 'pet') simulation.interact({ x: 100, y: 100 });
      if (action === 'frog') simulation.playWithFrog({ x: 300, y: original.y });
      expect(simulation.pet.position).toEqual(original);
      visit.update(0.05, simulation.pet);
      expect(visit.getVisual().occupied).toBe(false);
      expect(simulation.pet.intent).toBe('insideHouse');
      tick(simulation, visit, HOUSE_WIGGLE_SECONDS);
      expect(visit.getVisual().occupied).toBe(true);
      simulation.moveTo({ x: 200, y: original.y });
      expect(simulation.restPhase).toBe('waking');
      tick(simulation, visit, REST_WAKE_SECONDS + 0.1);
      expect(visit.getVisual()).toEqual({ occupied: false, hidePet: false, wiggle: 0 });
      expect(simulation.pet.intent).toBe('moveTo');
    }
  });

  it('does not move or reset the frog while the house action runs', () => {
    const { simulation, visit } = setup();
    const frog = new FrogPlayController();
    frog.resize(simulation.world);
    const home = frog.getVisual(simulation.world);
    frog.beginDrag({ x: home.x, y: home.baseline }, simulation.world);
    frog.drop({ x: 250, y: 690 }, simulation.world);
    const floor = frog.getVisual(simulation.world);
    arrive(simulation, visit);
    tick(simulation, visit, 2);
    expect(frog.getVisual(simulation.world)).toEqual(floor);
    // Changing only a room scene configuration does not update either controller.
    expect(visit.getVisual().occupied).toBe(true);
  });
});
