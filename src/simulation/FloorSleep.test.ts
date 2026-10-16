import { describe, expect, it } from 'vitest';
import { FLOOR_SLEEP_CONFIG, PetBehaviorMachine, isFloorSleepState } from '../behavior/PetBehaviorMachine';
import { getDonutRestPoint, getHouseVisitPoint } from '../render/SceneProps';
import { PetSimulation } from './PetSimulation';

function setup(values: number[] = [0.99, 0, 0]) {
  const random = () => values.shift() ?? 0.99;
  const simulation = new PetSimulation(new PetBehaviorMachine(random));
  simulation.resize(390, 767);
  return simulation;
}

function advance(simulation: PetSimulation, seconds: number): void {
  for (let i = 0; i < Math.ceil(seconds / 0.05); i += 1) simulation.update(0.05);
}

function reachFloorSleep(simulation: PetSimulation): void {
  advance(simulation, 1.4);
  expect(simulation.pet.state).toBe('floorRest');
  advance(simulation, FLOOR_SLEEP_CONFIG.awakeMinSeconds + 0.1);
  expect(simulation.pet.state).toBe('floorSleep');
}

describe('autonomous floor sleep', () => {
  it('selects a floor nap at the configured 8% threshold', () => {
    expect(FLOOR_SLEEP_CONFIG.chanceAfterIdle).toBe(0.08);
    const below = setup([0.919]);
    const eligible = setup([0.92, 0]);
    advance(below, 1.4);
    advance(eligible, 1.4);
    expect(below.pet.state).toBe('sit');
    expect(eligible.pet.state).toBe('floorRest');
  });
  it('lies awake, sleeps, wakes awake, and resumes autonomy without changing position', () => {
    const simulation = setup();
    const position = { ...simulation.pet.position };
    advance(simulation, 1.4);
    expect(simulation.pet.state).toBe('floorRest');
    expect(simulation.pet.position).toEqual(position);
    expect(simulation.restPhase).toBe('none');
    advance(simulation, FLOOR_SLEEP_CONFIG.awakeMinSeconds + 0.1);
    expect(simulation.pet.state).toBe('floorSleep');
    advance(simulation, FLOOR_SLEEP_CONFIG.asleepMinSeconds + 0.1);
    expect(simulation.pet.state).toBe('floorWake');
    advance(simulation, FLOOR_SLEEP_CONFIG.wakeSeconds + 0.1);
    expect(simulation.pet.state).toBe('idle');
    expect(simulation.pet.position).toEqual(position);
    expect([simulation.pet.velocityX, simulation.pet.velocityY]).toEqual([0, 0]);
    advance(simulation, 20);
    expect(isFloorSleepState(simulation.pet.state)).toBe(false);
  });

  it.each(['floor', 'wall', 'dog', 'frog', 'donut', 'house'] as const)(
    'lets one %s interaction interrupt floor sleep and execute directly', (action) => {
      const simulation = setup();
      reachFloorSleep(simulation);
      const point = { x: simulation.pet.position.x + 100, y: simulation.pet.position.y - 30 };
      if (action === 'floor') simulation.moveTo(point);
      if (action === 'wall') simulation.lookAtWall(point);
      if (action === 'dog') simulation.interact(point);
      if (action === 'frog') simulation.playWithFrog(point);
      if (action === 'donut') simulation.restAtDonut(getDonutRestPoint(simulation.world));
      if (action === 'house') simulation.visitHouse(getHouseVisitPoint(simulation.world));
      expect(isFloorSleepState(simulation.pet.state)).toBe(false);
      expect(simulation.restPhase).toBe(action === 'donut' || action === 'house' ? 'entering' : 'none');
      if (action === 'dog') expect(simulation.pet.state).toBe('attention');
      else if (action === 'wall') expect(['walk', 'jog', 'wallWag']).toContain(simulation.pet.state);
      else expect(['walk', 'jog', 'idle']).toContain(simulation.pet.state);
    },
  );

  it('does not enter floor sleep during frog play or persistent donut rest', () => {
    const simulation = setup();
    simulation.playWithFrog({ ...simulation.pet.position });
    advance(simulation, 3);
    expect(simulation.pet.intent).toBe('playWithFrog');
    expect(simulation.pet.state).toBe('idle');

    const donut = setup();
    donut.restAtDonut(getDonutRestPoint(donut.world));
    for (let i = 0; i < 300 && donut.restPhase === 'entering'; i += 1) donut.update(0.05);
    expect(donut.restPhase).toBe('resting');
    advance(donut, 60);
    expect(donut.restPhase).toBe('sleeping');
    expect(donut.pet.intent).toBe('restAtDonut');
    expect(donut.pet.state).toBe('idle');
  });

  it('keeps house entry protected and house sleep persistent', () => {
    const simulation = setup();
    simulation.visitHouse(getHouseVisitPoint(simulation.world));
    advance(simulation, 0.5);
    expect(isFloorSleepState(simulation.pet.state)).toBe(false);
    for (let i = 0; i < 300 && simulation.pet.intent === 'houseMove'; i += 1) simulation.update(0.05);
    expect(simulation.isHouseSequenceActive()).toBe(true);
    simulation.moveTo({ x: 100, y: 600 });
    expect(simulation.isHouseSequenceActive()).toBe(true);
    simulation.completeHouseEntry();
    advance(simulation, 60);
    expect(simulation.restPhase).toBe('sleeping');
    expect(simulation.pet.state).toBe('idle');
    expect(simulation.pet.intent).toBe('insideHouse');
  });

  it('allows a development preview to switch artwork without stacking timers', () => {
    const simulation = setup();
    simulation.previewFloorSleep('awake');
    advance(simulation, 20);
    expect(simulation.pet.state).toBe('floorRest');
    simulation.previewFloorSleep('asleep');
    advance(simulation, 20);
    expect(simulation.pet.state).toBe('floorSleep');
    simulation.previewFloorSleep('off');
    expect(simulation.pet.state).toBe('idle');
    simulation.previewFloorSleep('cycle');
    expect(simulation.pet.state).toBe('floorRest');
    advance(simulation, FLOOR_SLEEP_CONFIG.awakeMinSeconds
      + FLOOR_SLEEP_CONFIG.awakeRangeSeconds + 0.1);
    expect(simulation.pet.state).toBe('floorSleep');
  });
});
