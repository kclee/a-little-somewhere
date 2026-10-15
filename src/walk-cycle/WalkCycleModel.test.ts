import { describe, expect, it } from 'vitest';
import {
  MAX_WALK_FPS,
  MIN_WALK_FPS,
  WALK_FRAME_COUNT,
  WalkCycleModel,
  getFeetJitter,
} from './WalkCycleModel';

describe('WalkCycleModel', () => {
  it('advances and wraps frames at the configured speed', () => {
    const model = new WalkCycleModel();
    model.setFps(4);

    expect(model.update(0.24)).toBe(false);
    expect(model.frameIndex).toBe(0);
    expect(model.update(0.01)).toBe(true);
    expect(model.frameIndex).toBe(1);

    for (let index = 1; index < WALK_FRAME_COUNT; index += 1) model.update(0.25);
    expect(model.frameIndex).toBe(0);
  });

  it('pauses and wraps during manual frame stepping', () => {
    const model = new WalkCycleModel();
    model.previousFrame();
    expect(model.playing).toBe(false);
    expect(model.frameIndex).toBe(3);

    model.nextFrame();
    expect(model.frameIndex).toBe(0);
  });

  it('clamps animation speed to the supported range', () => {
    const model = new WalkCycleModel();
    model.setFps(-20);
    expect(model.fps).toBe(MIN_WALK_FPS);
    model.setFps(40);
    expect(model.fps).toBe(MAX_WALK_FPS);
  });

  it('reports the measured one-pixel feet baseline jitter', () => {
    expect(getFeetJitter()).toBe(1);
  });
});
