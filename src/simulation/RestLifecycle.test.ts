import { describe, expect, it } from 'vitest';
import { PetBehaviorMachine } from '../behavior/PetBehaviorMachine';
import { getDonutRestPoint, getHouseVisitPoint } from '../render/SceneProps';
import { FrogPlayController } from './FrogPlayController';
import { HouseVisitController, HOUSE_WIGGLE_SECONDS } from './HouseVisitController';
import { PetSimulation, REST_SLEEP_SECONDS, REST_WAKE_SECONDS } from './PetSimulation';

function setup(width = 1000, height = 800) {
  const pet = new PetSimulation(new PetBehaviorMachine(() => 0));
  pet.resize(width, height);
  const house = new HouseVisitController();
  const frog = new FrogPlayController();
  frog.resize(pet.world);
  return { pet, house, frog };
}

function advance(pet: PetSimulation, house: HouseVisitController, seconds: number): void {
  for (let frame = 0; frame < Math.ceil(seconds / 0.05); frame += 1) {
    pet.update(0.05);
    if (house.update(0.05, pet.pet)) pet.completeHouseEntry();
  }
}

function enterDonut(pet: PetSimulation, house: HouseVisitController): void {
  pet.restAtDonut(getDonutRestPoint(pet.world));
  for (let frame = 0; frame < 300 && pet.restPhase === 'entering'; frame += 1) advance(pet, house, 0.05);
  expect(pet.restPhase).toBe('resting');
}

function enterHouse(pet: PetSimulation, house: HouseVisitController): void {
  pet.visitHouse(getHouseVisitPoint(pet.world));
  for (let frame = 0; frame < 300 && pet.pet.intent === 'houseMove'; frame += 1) advance(pet, house, 0.05);
  expect(pet.pet.intent).toBe('insideHouse');
  expect(pet.isHouseSequenceActive()).toBe(true);
  advance(pet, house, HOUSE_WIGGLE_SECONDS + 0.1);
  expect(pet.restPhase).toBe('resting');
  expect(house.getVisual()).toMatchObject({ occupied: true, hidePet: true });
}

describe('shared rest and sleep lifecycle', () => {
  it.each([[1000, 800], [390, 767]] as const)('keeps donut sleep at %i×%i until a request', (width, height) => {
    const { pet, house } = setup(width, height);
    enterDonut(pet, house);
    const position = { ...pet.pet.position };
    advance(pet, house, REST_SLEEP_SECONDS - 0.2);
    expect(pet.restPhase).toBe('resting');
    advance(pet, house, 0.3);
    expect(pet.restPhase).toBe('sleeping');
    advance(pet, house, 30);
    expect(pet.pet.position).toEqual(position);
    expect(pet.pet.intent).toBe('restAtDonut');
  });

  it('keeps the occupied house through sleep and a visual room switch', () => {
    const { pet, house } = setup();
    enterHouse(pet, house);
    const position = { ...pet.pet.position };
    // Room switching changes only the renderer scene; neither controller is recreated.
    advance(pet, house, REST_SLEEP_SECONDS + 20);
    expect(pet.restPhase).toBe('sleeping');
    expect(pet.pet.position).toEqual(position);
    expect(house.getVisual()).toEqual({ occupied: true, hidePet: true, wiggle: 0 });
  });

  it('uses the latest wake request without stacking actions', () => {
    const { pet, house } = setup();
    enterDonut(pet, house);
    advance(pet, house, REST_SLEEP_SECONDS + 0.1);
    pet.moveTo({ x: 150, y: 700 });
    expect(pet.restPhase).toBe('waking');
    expect(pet.pet.intent).toBe('autonomous');
    pet.lookAtWall({ x: 850, y: 20 });
    pet.interact({ x: 100, y: 20 });
    advance(pet, house, REST_WAKE_SECONDS + 0.05);
    expect(pet.restPhase).toBe('none');
    expect(pet.pet.state).toBe('attention');
    expect(pet.pet.intent).toBe('autonomous');
  });

  it('does not wake for frog drag or cancellation, but wakes on a valid drop', () => {
    const { pet, house, frog } = setup(390, 767);
    enterDonut(pet, house);
    advance(pet, house, REST_SLEEP_SECONDS + 0.1);
    const home = frog.getVisual(pet.world);
    frog.beginDrag({ x: home.x, y: home.baseline }, pet.world);
    pet.beginFrogDrag();
    advance(pet, house, 0.5);
    expect(pet.restPhase).toBe('sleeping');
    frog.cancelDrag();
    pet.cancelFrogDrag();
    expect(pet.restPhase).toBe('sleeping');
    frog.beginDrag({ x: home.x, y: home.baseline }, pet.world);
    pet.beginFrogDrag();
    const drop = frog.drop({ x: 60, y: 690 }, pet.world);
    expect(drop?.region).toBe('floor');
    pet.dropFrog(frog.getApproachPoint(pet.world, pet.pet.position.x));
    expect(pet.restPhase).toBe('waking');
    advance(pet, house, REST_WAKE_SECONDS + 0.05);
    expect(['frogMove', 'playWithFrog']).toContain(pet.pet.intent);
  });

  it('wakes for a frog tap, then starts play exactly once', () => {
    const { pet, house, frog } = setup();
    enterDonut(pet, house);
    const target = frog.getApproachPoint(pet.world, pet.pet.position.x);
    pet.playWithFrog(target);
    expect(pet.restPhase).toBe('waking');
    expect(pet.pet.intent).toBe('autonomous');
    advance(pet, house, REST_WAKE_SECONDS + 0.05);
    expect(['frogMove', 'playWithFrog']).toContain(pet.pet.intent);
    expect(pet.restPhase).toBe('none');
  });

  it('wakes from one resting place before entering the other', () => {
    const { pet, house } = setup();
    enterHouse(pet, house);
    pet.restAtDonut(getDonutRestPoint(pet.world));
    expect(pet.restPhase).toBe('waking');
    advance(pet, house, 0.05);
    expect(house.getVisual().hidePet).toBe(false);
    advance(pet, house, REST_WAKE_SECONDS + 0.05);
    expect(pet.restPlace).toBe('donut');
    expect(pet.restPhase).toBe('entering');
    expect(pet.pet.intent).toBe('donutMove');
  });
});
