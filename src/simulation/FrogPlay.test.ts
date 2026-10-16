import { describe, expect, it } from 'vitest';
import { PetBehaviorMachine } from '../behavior/PetBehaviorMachine';
import { getInteractionTarget } from '../input/InteractionTarget';
import { getScenePropLayout } from '../render/SceneProps';
import { getFrogFloorBounds } from './FrogDrop';
import { FrogPlayController, FROG_EMERGENCE_SECONDS } from './FrogPlayController';
import { PetSimulation } from './PetSimulation';

function setup(width = 1000, height = 800) {
  const simulation = new PetSimulation(new PetBehaviorMachine(() => 0));
  simulation.resize(width, height);
  const frog = new FrogPlayController();
  frog.resize(simulation.world);
  return { simulation, frog };
}

function tick(simulation: PetSimulation, frog: FrogPlayController, seconds: number): void {
  const frames = Math.round(seconds / 0.05);
  for (let frame = 0; frame < frames; frame += 1) {
    simulation.update(0.05);
    frog.update(0.05, simulation.pet, simulation.world);
  }
}

function arrive(simulation: PetSimulation, frog: FrogPlayController): void {
  simulation.playWithFrog(frog.getApproachPoint(simulation.world, simulation.pet.position.x));
  for (let frame = 0; frame < 300 && simulation.pet.intent === 'frogMove'; frame += 1) tick(simulation, frog, 0.05);
  expect(simulation.pet.intent).toBe('playWithFrog');
}

describe('frog play', () => {
  it('starts inside the house and approaches its entrance on desktop and mobile', () => {
    for (const size of [[1000, 800], [390, 767]]) {
      const { simulation, frog } = setup(size[0], size[1]);
      const layout = getScenePropLayout(simulation.world);
      expect(frog.getVisual(simulation.world)).toMatchObject({ x: layout.frog.x, baseline: layout.frog.baseline });
      expect(frog.isOnFloor()).toBe(false);
      const point = frog.getApproachPoint(simulation.world, simulation.pet.position.x);
      expect(point.x).toBeLessThan(layout.house.x);
      expect(point.y).toBeGreaterThan(simulation.world.height * 0.58);
    }
  });

  it('emerges once on arrival, plays for about five seconds, then remains on the floor', () => {
    const { simulation, frog } = setup();
    const homeX = frog.getVisual(simulation.world).x;
    arrive(simulation, frog);
    expect(simulation.pet.state).toBe('idle');
    tick(simulation, frog, FROG_EMERGENCE_SECONDS / 2);
    const mid = frog.getVisual(simulation.world);
    expect(mid.x).toBeLessThan(homeX);
    expect(mid.x).toBeGreaterThan(getScenePropLayout(simulation.world).house.x - 200);
    tick(simulation, frog, 1);
    expect(frog.isOnFloor()).toBe(true);
    expect(simulation.pet.intent).toBe('playWithFrog');
    tick(simulation, frog, 3.4);
    expect(simulation.pet.intent).toBe('autonomous');
    const floor = frog.getVisual(simulation.world);
    expect(floor.x).toBeLessThan(homeX);
    const layout = getScenePropLayout(simulation.world);
    expect(floor.x + layout.frog.width / 2).toBeLessThan(layout.house.x - layout.house.width / 2);
    expect(floor.rotation).toBeUndefined();

    const nextTarget = frog.getApproachPoint(simulation.world, simulation.pet.position.x);
    expect(Math.abs(nextTarget.x - floor.x)).toBeLessThan(100);
    arrive(simulation, frog);
    expect(frog.isOnFloor()).toBe(true);
  });

  it('ignores repeated frog clicks during play rather than restarting its timer', () => {
    const { simulation, frog } = setup(390, 767);
    arrive(simulation, frog);
    tick(simulation, frog, 2);
    simulation.playWithFrog(frog.getApproachPoint(simulation.world, simulation.pet.position.x));
    tick(simulation, frog, 2.85);
    expect(simulation.pet.intent).toBe('autonomous');
  });

  it('places the frog in front of the house on a narrow screen', () => {
    const { simulation, frog } = setup(390, 767);
    arrive(simulation, frog);
    tick(simulation, frog, 5);
    const layout = getScenePropLayout(simulation.world);
    const floor = frog.getVisual(simulation.world);
    expect(floor.baseline).toBeGreaterThan(layout.house.baseline + layout.house.height / 2);
    expect(floor.x).toBeLessThan(layout.house.x);
    arrive(simulation, frog);
    expect(getInteractionTarget(
      { x: floor.x, y: floor.baseline }, simulation.pet, simulation.world,
      { x: floor.x, y: floor.baseline },
    )).toBe('frog');
  });

  it('allows floor, wall, and pet clicks to interrupt approach or play', () => {
    for (const action of ['floor', 'wall', 'pet'] as const) {
      const { simulation, frog } = setup();
      simulation.playWithFrog(frog.getApproachPoint(simulation.world, simulation.pet.position.x));
      if (action !== 'floor') arrive(simulation, frog);
      if (action === 'floor') simulation.moveTo({ x: 100, y: simulation.pet.position.y });
      if (action === 'wall') simulation.lookAtWall({ x: 800, y: 20 });
      if (action === 'pet') simulation.interact({ x: 100, y: 100 });
      tick(simulation, frog, 0.05);
      expect(simulation.pet.intent).not.toBe('frogMove');
      expect(simulation.pet.intent).not.toBe('playWithFrog');
      expect(frog.getVisual(simulation.world).playing).toBeUndefined();
      if (action !== 'floor') expect(frog.isOnFloor()).toBe(true);
    }
  });

  it('keeps the same frog through a scene change or resize, but resets on reload', () => {
    const { simulation, frog } = setup();
    arrive(simulation, frog);
    tick(simulation, frog, 5);
    const before = frog.getVisual(simulation.world);
    expect(frog.getVisual(simulation.world)).toEqual(before); // scene selection does not touch the controller
    simulation.resize(390, 767);
    frog.resize(simulation.world);
    expect(frog.isOnFloor()).toBe(true);
    expect(frog.getVisual(simulation.world).x).toBeLessThan(390);
    const fresh = new FrogPlayController();
    expect(fresh.getVisual(simulation.world).x).toBe(getScenePropLayout(simulation.world).frog.x);
    expect(fresh.isOnFloor()).toBe(false);
  });

  it('drags one frog with a grab offset, drops once, then sends the dog to play', () => {
    const { simulation, frog } = setup();
    const home = frog.getVisual(simulation.world);
    const grab = { x: home.x + 8, y: home.baseline - 5 };
    frog.beginDrag(grab, simulation.world);
    simulation.beginFrogDrag();
    const petPosition = { ...simulation.pet.position };
    tick(simulation, frog, 1);
    expect(simulation.pet.position).toEqual(petPosition);
    expect(simulation.pet.intent).toBe('frogDrag');
    frog.moveDrag({ x: 250, y: 700 }, simulation.world);
    expect(frog.getVisual(simulation.world)).toMatchObject({ x: 242, baseline: 705, scaleX: 1.04 });
    const drop = frog.drop({ x: 250, y: 700 }, simulation.world);
    expect(drop?.region).toBe('floor');
    expect(frog.drop({ x: 250, y: 700 }, simulation.world)).toBeNull();
    simulation.dropFrog(frog.getApproachPoint(simulation.world, simulation.pet.position.x));
    expect(simulation.pet.intent).toBe('frogMove');
    expect(simulation.pet.state).toBe('jog');
    for (let frame = 0; frame < 300 && simulation.pet.intent === 'frogMove'; frame += 1) tick(simulation, frog, 0.05);
    expect(simulation.pet.intent).toBe('playWithFrog');
  });

  it('cancels a drag without triggering play or leaving a floating frog', () => {
    const { simulation, frog } = setup();
    const home = frog.getVisual(simulation.world);
    frog.beginDrag({ x: home.x, y: home.baseline }, simulation.world);
    simulation.beginFrogDrag();
    frog.moveDrag({ x: 300, y: 100 }, simulation.world);
    frog.cancelDrag();
    simulation.cancelFrogDrag();
    expect(frog.isDragging()).toBe(false);
    expect(frog.getVisual(simulation.world)).toMatchObject(home);
    expect(simulation.pet.intent).toBe('autonomous');
    expect(simulation.pet.state).toBe('idle');
  });

  it('restores a floor frog after cancellation and supersedes an old approach target', () => {
    const { simulation, frog } = setup();
    const home = frog.getVisual(simulation.world);
    frog.beginDrag({ x: home.x, y: home.baseline }, simulation.world);
    simulation.beginFrogDrag();
    const first = frog.drop({ x: 220, y: 700 }, simulation.world);
    simulation.dropFrog(frog.getApproachPoint(simulation.world, simulation.pet.position.x));
    expect(simulation.pet.intent).toBe('frogMove');

    const floor = frog.getVisual(simulation.world);
    expect(first?.position).toEqual({ x: floor.x, y: floor.baseline });
    frog.beginDrag({ x: floor.x, y: floor.baseline }, simulation.world);
    simulation.beginFrogDrag();
    const pausedPet = { ...simulation.pet.position };
    tick(simulation, frog, 0.5);
    expect(simulation.pet.position).toEqual(pausedPet);
    frog.moveDrag({ x: 800, y: 700 }, simulation.world);
    frog.cancelDrag();
    simulation.cancelFrogDrag();
    expect(frog.getVisual(simulation.world)).toMatchObject({ x: floor.x, baseline: floor.baseline });
    expect(simulation.pet.intent).toBe('autonomous');
    tick(simulation, frog, 0.1);
    expect(simulation.pet.position).toEqual(pausedPet);
  });

  it('keeps an upper-floor drop in place while the dog approaches it', () => {
    for (const [width, height] of [[1000, 800], [390, 767]] as const) {
      const { simulation, frog } = setup(width, height);
      const home = frog.getVisual(simulation.world);
      const upperY = getFrogFloorBounds(simulation.world).minY + 18;
      frog.beginDrag({ x: home.x, y: home.baseline }, simulation.world);
      simulation.beginFrogDrag();
      const drop = frog.drop({ x: width * 0.3, y: upperY }, simulation.world);
      expect(drop?.position?.y).toBe(upperY);
      simulation.dropFrog(frog.getApproachPoint(simulation.world, simulation.pet.position.x));
      for (let frame = 0; frame < 300 && simulation.pet.intent === 'frogMove'; frame += 1) tick(simulation, frog, 0.05);
      expect(simulation.pet.intent).toBe('playWithFrog');
      tick(simulation, frog, 1);
      const playing = frog.getVisual(simulation.world);
      expect(playing.playing).toBe(true);
      expect(playing.baseline).toBeGreaterThan(upperY - 10);
      expect(playing.baseline).toBeLessThan(upperY + 35);
      expect(Math.abs(playing.x - simulation.pet.position.x)).toBeLessThan(90);
      tick(simulation, frog, 4);
      const settled = frog.getVisual(simulation.world);
      expect(settled.playing).toBeUndefined();
      expect(settled.baseline).toBe(upperY);
      simulation.resize(width * 0.9, height * 0.9);
      frog.resize(simulation.world);
      expect(frog.getVisual(simulation.world).baseline).toBeCloseTo(upperY * 0.9);
    }
  });

  it('supersedes an active frog action when dragged again and restores the house drop flow', () => {
    const { simulation, frog } = setup();
    arrive(simulation, frog);
    tick(simulation, frog, 1);
    const current = frog.getVisual(simulation.world);
    frog.beginDrag({ x: current.x, y: current.baseline }, simulation.world);
    simulation.beginFrogDrag();
    expect(simulation.pet.intent).toBe('frogDrag');
    const house = getScenePropLayout(simulation.world).house;
    expect(frog.drop({ x: house.x, y: house.baseline }, simulation.world)?.region).toBe('house');
    expect(frog.isOnFloor()).toBe(false);
    simulation.dropFrog(frog.getApproachPoint(simulation.world, simulation.pet.position.x));
    expect(['frogMove', 'playWithFrog']).toContain(simulation.pet.intent);
    for (let frame = 0; frame < 300 && simulation.pet.intent === 'frogMove'; frame += 1) tick(simulation, frog, 0.05);
    expect(simulation.pet.intent).toBe('playWithFrog');
    tick(simulation, frog, 1);
    expect(frog.isOnFloor()).toBe(true);
  });
});
