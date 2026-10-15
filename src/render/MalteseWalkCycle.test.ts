import { describe, expect, it } from 'vitest';
import { WALK_SHEET } from '../walk-cycle/WalkCycleModel';
import {
  getWalkCycleScale,
  STATIC_POSE_REFERENCE_HEIGHT,
  WALK_CYCLE_REFERENCE_HEIGHT,
  getWalkFrameIndex,
  shouldMirrorWalkCycle,
} from './MalteseWalkCycle';

describe('Maltese walk-cycle rendering helpers', () => {
  it('advances four frames at the preview speed and loops cleanly', () => {
    expect(getWalkFrameIndex(0)).toBe(0);
    expect(getWalkFrameIndex(1 / 6)).toBe(1);
    expect(getWalkFrameIndex(2 / 6)).toBe(2);
    expect(getWalkFrameIndex(3 / 6)).toBe(3);
    expect(getWalkFrameIndex(4 / 6)).toBe(0);
  });

  it('mirrors only when the dog walks left', () => {
    expect(shouldMirrorWalkCycle(-1)).toBe(true);
    expect(shouldMirrorWalkCycle(1)).toBe(false);
  });

  it('uses a stable scale and the preview feet anchor', () => {
    expect(getWalkCycleScale(210)).toBeCloseTo(
      (210 / 512) * (STATIC_POSE_REFERENCE_HEIGHT / WALK_CYCLE_REFERENCE_HEIGHT),
    );
    expect(WALK_SHEET.feetAnchor).toEqual({ x: 271.5, y: 607 });
  });
});

