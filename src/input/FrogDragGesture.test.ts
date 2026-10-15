import { describe, expect, it } from 'vitest';
import { FrogDragGesture } from './FrogDragGesture';

describe('frog drag gesture', () => {
  it('preserves a small-movement tap', () => {
    const gesture = new FrogDragGesture();
    expect(gesture.begin(7, { x: 100, y: 100 })).toBe(true);
    expect(gesture.move(7, { x: 105, y: 104 })).toBe('none');
    expect(gesture.finish(7)).toEqual({ kind: 'tap', start: { x: 100, y: 100 } });
  });

  it('starts one drag after the threshold and never also reports a tap', () => {
    const gesture = new FrogDragGesture();
    gesture.begin(1, { x: 20, y: 20 });
    expect(gesture.move(1, { x: 28, y: 20 })).toBe('start');
    expect(gesture.move(1, { x: 40, y: 40 })).toBe('move');
    expect(gesture.finish(1)).toEqual({ kind: 'drop', start: { x: 20, y: 20 } });
    expect(gesture.finish(1)).toBeNull();
  });

  it('ignores another pointer and clears safely on cancellation', () => {
    const gesture = new FrogDragGesture();
    expect(gesture.begin(1, { x: 20, y: 20 })).toBe(true);
    expect(gesture.begin(2, { x: 30, y: 30 })).toBe(false);
    expect(gesture.move(2, { x: 100, y: 100 })).toBe('none');
    expect(gesture.cancel(2)).toBe(false);
    expect(gesture.move(1, { x: 40, y: 20 })).toBe('start');
    expect(gesture.cancel(1)).toBe(true);
    expect(gesture.finish(1)).toBeNull();
    expect(gesture.begin(2, { x: 30, y: 30 })).toBe(true);
  });
});
