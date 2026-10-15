import { describe, expect, it } from 'vitest';
import {
  getRearTailWagPose,
  REAR_TAIL_WAG_FRAME_SECONDS,
  REAR_TAIL_WAG_SPRITES,
  REAR_TAIL_WAG_START_SECONDS,
} from './RearTailWag';

describe('rear-view tail wag rendering helpers', () => {
  it('plays one subtle wag after the Sit pose settles, then remains neutral', () => {
    const frame = (index: number) =>
      REAR_TAIL_WAG_START_SECONDS + REAR_TAIL_WAG_FRAME_SECONDS * (index + 0.5);

    expect(getRearTailWagPose(0)).toBe('neutral');
    expect(getRearTailWagPose(frame(0))).toBe('neutral');
    expect(getRearTailWagPose(frame(1))).toBe('left');
    expect(getRearTailWagPose(frame(2))).toBe('neutral');
    expect(getRearTailWagPose(frame(3))).toBe('right');
    expect(getRearTailWagPose(frame(4))).toBe('neutral');
    expect(getRearTailWagPose(frame(5))).toBe('neutral');
  });

  it('uses identical canvas, crop, and feet-anchor metadata for every frame', () => {
    const definitions = Object.values(REAR_TAIL_WAG_SPRITES);
    expect(definitions.map(({ canvasSize }) => canvasSize)).toEqual([1254, 1254, 1254]);
    expect(new Set(definitions.map(({ crop }) => JSON.stringify(crop))).size).toBe(1);
    expect(new Set(definitions.map(({ anchor }) => JSON.stringify(anchor))).size).toBe(1);
  });
});
