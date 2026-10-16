import { describe, expect, it } from 'vitest';
import {
  CAMERA_GREETING_CONFIG,
  PetBehaviorMachine,
  getCameraGreetingDestination,
  getCameraHappyBeforeDuration,
} from '../behavior/PetBehaviorMachine';
import { getMovementBounds } from '../core/RoomGeometry';
import { getCameraGreetingHearts, getCameraGreetingLayout, isPointOnCameraGreeting } from '../render/CameraGreeting';
import { selectMaltesePose } from '../render/MalteseSpriteSet';
import { getDonutRestPoint, getHouseVisitPoint } from '../render/SceneProps';
import { PetSimulation } from './PetSimulation';

type GreetingPhase = 'cameraHappyBefore' | 'cameraPop' | 'cameraCloseup' | 'cameraPopOut' | 'cameraHappyAfter';

function setup(cameraRandom = () => 0) {
  const behavior = new PetBehaviorMachine(() => 0, cameraRandom);
  const simulation = new PetSimulation(behavior);
  simulation.resize(390, 767);
  return { behavior, simulation };
}

function advance(simulation: PetSimulation, seconds: number, step = 0.05): void {
  for (let i = 0; i < Math.ceil(seconds / step); i += 1) simulation.update(step);
}

function reachPhase(simulation: PetSimulation, phase: GreetingPhase): void {
  for (let i = 0; i < 400 && simulation.pet.state !== phase; i += 1) simulation.update(0.05);
  expect(simulation.pet.state).toBe(phase);
}

function finishGreeting(simulation: PetSimulation): void {
  for (let i = 0; i < 500 && simulation.isCameraGreetingActive(); i += 1) simulation.update(0.05);
  expect(simulation.isCameraGreetingActive()).toBe(false);
}

function reachAutomaticGreeting(simulation: PetSimulation): void {
  for (let i = 0; i < 60 && !simulation.isCameraGreetingActive(); i += 1) simulation.update(0.25);
  expect(simulation.isCameraGreetingActive()).toBe(true);
}

describe('camera greeting schedule', () => {
  it('starts only after the initial pose hold and chooses a 2–4 minute first window', () => {
    const { behavior, simulation } = setup(() => 0);
    for (let i = 0; i < 40; i += 1) simulation.update(0.25, true);
    expect(behavior.cameraScheduleRemaining).toBeNull();
    simulation.update(0.25);
    expect(behavior.cameraScheduleRemaining).toBe(CAMERA_GREETING_CONFIG.firstMinSeconds - 0.25);
    advance(simulation, 119, 0.25);
    expect(simulation.isCameraGreetingActive()).toBe(false);
    advance(simulation, 1.25, 0.25);
    reachAutomaticGreeting(simulation);
  });

  it('uses the upper window bound and schedules the next interval from completion', () => {
    const { behavior, simulation } = setup(() => 1);
    simulation.update(0.25);
    expect(behavior.cameraScheduleRemaining).toBe(CAMERA_GREETING_CONFIG.firstMinSeconds
      + CAMERA_GREETING_CONFIG.firstRangeSeconds - 0.25);
    advance(simulation, 239, 0.25);
    expect(simulation.isCameraGreetingActive()).toBe(false);
    advance(simulation, 1, 0.25);
    reachAutomaticGreeting(simulation);
    expect(behavior.cameraHearts).toBe(3);
    finishGreeting(simulation);
    expect(behavior.cameraScheduleRemaining).toBe(CAMERA_GREETING_CONFIG.subsequentMinSeconds
      + CAMERA_GREETING_CONFIG.subsequentRangeSeconds);
    expect(behavior.cameraScheduleIsDue).toBe(false);
    advance(simulation, 479, 0.25);
    expect(simulation.isCameraGreetingActive()).toBe(false);
    advance(simulation, 1.25, 0.25);
    reachAutomaticGreeting(simulation);
  });

  it('defers a due greeting through floor, donut, and house sleep without waking the dog', () => {
    for (const place of ['floor', 'donut', 'house'] as const) {
      const { behavior, simulation } = setup(() => 0);
      simulation.update(0.25); // Start the first window in normal gameplay.
      if (place === 'floor') simulation.previewFloorSleep('asleep');
      if (place === 'donut') simulation.restAtDonut(getDonutRestPoint(simulation.world));
      if (place === 'house') {
        simulation.visitHouse(getHouseVisitPoint(simulation.world));
        for (let i = 0; i < 100 && simulation.pet.intent !== 'insideHouse'; i += 1) simulation.update(0.25);
        simulation.completeHouseEntry();
      }
      advance(simulation, 125, 0.25);
      expect(behavior.cameraScheduleIsDue).toBe(true);
      expect(simulation.isCameraGreetingActive()).toBe(false);
      if (place === 'floor') {
        expect(simulation.pet.state).toBe('floorSleep');
        simulation.previewFloorSleep('off');
      } else {
        expect(simulation.restPhase).toBe('sleeping');
        simulation.interact({ x: 300, y: 500 });
      }
      reachAutomaticGreeting(simulation);
    }
  });

  it('keeps debug previews separate from the automatic countdown', () => {
    const { behavior, simulation } = setup(() => 0.5);
    simulation.update(0.25);
    const remaining = behavior.cameraScheduleRemaining!;
    simulation.previewCameraGreeting('run');
    expect(simulation.isCameraGreetingActive()).toBe(true);
    advance(simulation, 2);
    expect(behavior.cameraScheduleRemaining).toBe(remaining);
    simulation.previewCameraGreeting('resume');
    expect(simulation.isCameraGreetingActive()).toBe(false);
    expect(behavior.cameraScheduleRemaining).toBe(remaining);
  });

  it('advances the schedule during frog drag but defers the greeting until the drag ends', () => {
    const { behavior, simulation } = setup(() => 0);
    simulation.update(0.25);
    simulation.beginFrogDrag();
    advance(simulation, 125, 0.25);
    expect(behavior.cameraScheduleIsDue).toBe(true);
    expect(simulation.isCameraGreetingActive()).toBe(false);
    simulation.cancelFrogDrag();
    reachAutomaticGreeting(simulation);
  });

  it('reschedules safely after cancellation and does not reroll on repeated cleanup', () => {
    const { behavior, simulation } = setup(() => 0);
    simulation.update(0.25);
    advance(simulation, 121, 0.25);
    reachAutomaticGreeting(simulation);
    simulation.cancelCameraGreeting();
    expect(behavior.cameraScheduleRemaining).toBe(CAMERA_GREETING_CONFIG.subsequentMinSeconds);
    simulation.cancelCameraGreeting();
    simulation.resize(1000, 700);
    expect(behavior.cameraScheduleRemaining).toBe(CAMERA_GREETING_CONFIG.subsequentMinSeconds);
    expect(simulation.isCameraGreetingActive()).toBe(false);
  });

  it('lets a debug preview satisfy an already-due greeting instead of duplicating it', () => {
    const { behavior, simulation } = setup(() => 0);
    simulation.update(0.25);
    simulation.previewFloorSleep('asleep');
    advance(simulation, 125, 0.25);
    expect(behavior.cameraScheduleIsDue).toBe(true);
    simulation.previewFloorSleep('off');
    simulation.previewCameraGreeting('run');
    expect(behavior.cameraScheduleIsDue).toBe(false);
    finishGreeting(simulation);
    expect(behavior.cameraScheduleRemaining).toBe(CAMERA_GREETING_CONFIG.subsequentMinSeconds);
  });

  it('does not fast-forward into a greeting after a suspended-tab frame gap', () => {
    const { behavior, simulation } = setup(() => 0);
    simulation.update(0.25);
    const before = behavior.cameraScheduleRemaining!;
    simulation.update(900);
    expect(behavior.cameraScheduleRemaining).toBeCloseTo(before - 0.25);
    expect(simulation.isCameraGreetingActive()).toBe(false);
  });
});

describe('camera greeting sequence and input lock', () => {
  it.each([0, 0.4, 0.99])('chooses 1–3 hearts deterministically from a seeded value %s', (value) => {
    const { behavior, simulation } = setup(() => value);
    simulation.previewCameraGreeting('run');
    const expected = value === 0 ? 1 : value === 0.4 ? 2 : 3;
    expect(behavior.cameraHearts).toBe(expected);
    reachPhase(simulation, 'cameraHappyBefore');
    expect(selectMaltesePose(simulation.pet)).toBe('frontHappy');
    expect(getCameraHappyBeforeDuration(expected)).toBeCloseTo(
      CAMERA_GREETING_CONFIG.heartStartSeconds
      + (expected - 1) * CAMERA_GREETING_CONFIG.heartGapSeconds
      + CAMERA_GREETING_CONFIG.heartDurationSeconds
      + CAMERA_GREETING_CONFIG.happyBeforeTailSeconds,
    );
    reachPhase(simulation, 'cameraPop');
    expect(getCameraGreetingHearts(simulation.pet, 150, expected, false)).toEqual([]);
  });

  it('approaches the same valid foreground anchor, preserves happy feet, and unlocks after completion', () => {
    const { simulation } = setup(() => 0);
    const destination = getCameraGreetingDestination(simulation.world);
    const bounds = getMovementBounds(simulation.world);
    expect(destination.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(destination.x).toBeLessThanOrEqual(bounds.maxX);
    expect(destination.y).toBeGreaterThanOrEqual(bounds.minY);
    expect(destination.y).toBeLessThanOrEqual(bounds.maxY);
    simulation.previewCameraGreeting('run');
    reachPhase(simulation, 'cameraHappyBefore');
    expect(simulation.pet.position).toEqual(destination);
    expect([simulation.pet.velocityX, simulation.pet.velocityY]).toEqual([0, 0]);
    const feet = { ...simulation.pet.position };
    reachPhase(simulation, 'cameraCloseup');
    reachPhase(simulation, 'cameraHappyAfter');
    expect(selectMaltesePose(simulation.pet)).toBe('frontHappy');
    expect(simulation.pet.position).toEqual(feet);
    finishGreeting(simulation);
    expect(simulation.pet.intent).toBe('autonomous');
    simulation.moveTo({ x: 100, y: 500 });
    expect(simulation.pet.intent).toBe('moveTo');
  });

  it.each(['approach', 'cameraHappyBefore', 'cameraPop', 'cameraCloseup', 'cameraPopOut', 'cameraHappyAfter'] as const)(
    'ignores gameplay commands throughout %s without queuing them', (phase) => {
      const { simulation } = setup(() => 0);
      simulation.previewCameraGreeting('run');
      if (phase !== 'approach') reachPhase(simulation, phase);
      const before = { state: simulation.pet.state, intent: simulation.pet.intent,
        position: { ...simulation.pet.position }, rest: simulation.restPhase };
      const point = { x: 100, y: 500 };
      simulation.moveTo(point);
      simulation.lookAtWall(point);
      simulation.interact(point);
      simulation.playWithFrog(point);
      simulation.restAtDonut(getDonutRestPoint(simulation.world));
      simulation.visitHouse(getHouseVisitPoint(simulation.world));
      simulation.beginFrogDrag();
      simulation.dropFrog(point);
      expect({ state: simulation.pet.state, intent: simulation.pet.intent,
        position: simulation.pet.position, rest: simulation.restPhase }).toEqual(before);
      finishGreeting(simulation);
      expect(simulation.restPhase).toBe('none');
      expect(simulation.pet.intent).toBe('autonomous');
    },
  );

  it('cancels on scene/lifecycle cleanup and debug Resume, restoring input', () => {
    const { behavior, simulation } = setup(() => 0);
    simulation.previewCameraGreeting('run');
    reachPhase(simulation, 'cameraHappyBefore');
    simulation.cancelCameraGreeting(); // Scene switch or page visibility cleanup.
    expect(simulation.isCameraGreetingActive()).toBe(false);
    expect(behavior.cameraHearts).toBe(0);
    simulation.moveTo({ x: 100, y: 500 });
    expect(simulation.pet.intent).toBe('moveTo');
    simulation.previewCameraGreeting('closeup');
    expect(simulation.isCameraGreetingActive()).toBe(true);
    simulation.previewCameraGreeting('resume');
    expect(simulation.isCameraGreetingActive()).toBe(false);
    expect(behavior.cameraHearts).toBe(0);
  });

  it('does not preview during floor naps or persistent donut sleep', () => {
    const { simulation } = setup();
    simulation.previewFloorSleep('asleep');
    simulation.previewCameraGreeting('run');
    expect(simulation.pet.state).toBe('floorSleep');
    simulation.previewFloorSleep('off');
    simulation.restAtDonut(getDonutRestPoint(simulation.world));
    advance(simulation, 10, 0.25);
    expect(simulation.restPhase).toBe('sleeping');
    simulation.previewCameraGreeting('run');
    expect(simulation.pet.intent).toBe('restAtDonut');
  });
});

describe('camera greeting presentation', () => {
  it('spawns 1–3 filled-heart frames in order, with overlap and 800 ms lifetimes', () => {
    const { simulation } = setup();
    const pet = simulation.pet;
    pet.state = 'cameraHappyBefore';
    pet.stateElapsed = CAMERA_GREETING_CONFIG.heartStartSeconds + 0.1;
    const first = getCameraGreetingHearts(pet, 150, 3, false);
    expect(first).toHaveLength(1);
    pet.stateElapsed += CAMERA_GREETING_CONFIG.heartGapSeconds;
    const overlapping = getCameraGreetingHearts(pet, 150, 3, false);
    expect(overlapping).toHaveLength(2);
    expect(overlapping[0]!.y).toBeLessThan(first[0]!.y);
    expect(overlapping[0]!.x).not.toBe(overlapping[1]!.x);
    pet.stateElapsed += CAMERA_GREETING_CONFIG.heartGapSeconds;
    expect(getCameraGreetingHearts(pet, 150, 3, false)).toHaveLength(3);
    pet.stateElapsed = getCameraHappyBeforeDuration(3) - 0.02;
    expect(getCameraGreetingHearts(pet, 150, 3, false)).toEqual([]);
    pet.state = 'cameraPop';
    expect(getCameraGreetingHearts(pet, 150, 3, false)).toEqual([]);
  });

  it('keeps hearts still for reduced motion and keeps the approved close-up within mobile/desktop view', () => {
    const { simulation } = setup();
    simulation.pet.state = 'cameraHappyBefore';
    simulation.pet.stateElapsed = 0.2;
    const first = getCameraGreetingHearts(simulation.pet, 150, 1, true)[0]!;
    simulation.pet.stateElapsed = 0.5;
    const later = getCameraGreetingHearts(simulation.pet, 150, 1, true)[0]!;
    expect(later.y).toBe(first.y);
    expect(later.opacity).toBe(1);
    for (const world of [{ width: 390, height: 767 }, { width: 1200, height: 700 }]) {
      const layout = getCameraGreetingLayout(world);
      expect(layout.y).toBeGreaterThan(0);
      expect(layout.y + layout.size).toBeLessThanOrEqual(world.height + layout.size * 0.05);
      expect(isPointOnCameraGreeting({ x: world.width / 2, y: layout.y + layout.size / 2 }, world)).toBe(true);
    }
  });
});
