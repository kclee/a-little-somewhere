import { describe, expect, it } from 'vitest';
import {
  firstRotatingHintDelayMs, individualHintDurationMs, initialShowcaseDelayMs,
  initialShowcaseDurationMs, InteractionHintController, manualShowcaseDurationMs, rotatingHintCooldownMs,
  type HintConditions, type HintTarget,
} from './InteractionHintController';

const all: HintTarget[] = ['frog', 'donut', 'house', 'pet'];
const ready: HintConditions = { eligible: all };

function advance(hints: InteractionHintController, milliseconds: number, conditions = ready) {
  let frames = hints.update(0, conditions);
  for (let step = 0; step < Math.round(milliseconds / 100); step += 1) {
    frames = hints.update(0.1, conditions);
  }
  return frames;
}

describe('two-phase shared interaction hints', () => {
  it('shows all four after two seconds, then returns to one rotating hint', () => {
    expect(initialShowcaseDurationMs).toBe(4_000);
    expect(individualHintDurationMs).toBe(2_500);
    const hints = new InteractionHintController();
    expect(hints.isInitialShowcaseActive()).toBe(true);
    expect(advance(hints, initialShowcaseDelayMs - 100)).toEqual([]);
    expect(advance(hints, 100).map((frame) => frame.target)).toEqual(all);
    expect(hints.getDebugState()).toMatchObject({ status: 'Showing', phase: 'Initial showcase', nextTarget: 'all' });
    expect(advance(hints, initialShowcaseDurationMs - 100)).toHaveLength(4);
    expect(advance(hints, 100)).toEqual([]);
    expect(hints.isInitialShowcaseActive()).toBe(false);
    expect(hints.getDebugState()).toMatchObject({ status: 'Waiting', phase: 'Rotating hints', nextTarget: 'frog' });
    expect(advance(hints, firstRotatingHintDelayMs - 100)).toEqual([]);
    expect(advance(hints, 100)).toMatchObject([{ target: 'frog', gesture: 'drag' }]);
    expect(advance(hints, individualHintDurationMs)).toEqual([]);
    expect(hints.getDebugState().previousTarget).toBe('frog');
    expect(advance(hints, rotatingHintCooldownMs).map((frame) => frame.target)).toEqual(['donut']);
  });

  it('dismisses the showcase on input and never replays it after a room switch', () => {
    const hints = new InteractionHintController();
    advance(hints, initialShowcaseDelayMs);
    hints.noteInteraction();
    expect(hints.isInitialShowcaseActive()).toBe(false);
    expect(hints.getDebugState()).toMatchObject({ phase: 'Rotating hints', countdownMs: firstRotatingHintDelayMs });
    expect(advance(hints, firstRotatingHintDelayMs).map((frame) => frame.target)).toEqual(['frog']);
    hints.noteInteraction(); // Switching rooms is meaningful input, but cannot restart the showcase.
    expect(advance(hints, rotatingHintCooldownMs).map((frame) => frame.target)).toEqual(['donut']);
  });

  it('cancels a pending showcase if the player interacts before it begins', () => {
    const hints = new InteractionHintController();
    advance(hints, 500);
    hints.noteInteraction();
    expect(advance(hints, firstRotatingHintDelayMs - 100)).toEqual([]);
    expect(advance(hints, 100).map((frame) => frame.target)).toEqual(['frog']);
  });

  it('resets to the normal inactivity timer without replaying a pending showcase', () => {
    const hints = new InteractionHintController();
    advance(hints, 500);
    hints.resetTimer();
    expect(hints.getDebugState()).toMatchObject({
      phase: 'Rotating hints', countdownMs: firstRotatingHintDelayMs,
    });
    expect(advance(hints, firstRotatingHintDelayMs).map((frame) => frame.target)).toEqual(['frog']);
  });

  it('keeps the first-hint delay when activity interrupts its countdown', () => {
    const hints = new InteractionHintController();
    advance(hints, initialShowcaseDelayMs + initialShowcaseDurationMs + 2_000);
    hints.noteInteraction();
    expect(hints.getDebugState().countdownMs).toBe(firstRotatingHintDelayMs);
    expect(advance(hints, firstRotatingHintDelayMs).map((frame) => frame.target)).toEqual(['frog']);
    hints.noteInteraction();
    expect(hints.getDebugState().countdownMs).toBe(rotatingHintCooldownMs);
  });

  it('previews one eligible target without changing the normal countdown or rotation', () => {
    const hints = new InteractionHintController();
    advance(hints, initialShowcaseDelayMs + initialShowcaseDurationMs + 1_000);
    const before = hints.getDebugState().countdownMs;
    expect(hints.showNow('house')).toBe(true);
    expect(advance(hints, 500).map((frame) => frame.target)).toEqual(['house']);
    expect(hints.getDebugState()).toMatchObject({ status: 'Showing', preview: true, nextTarget: 'frog' });
    expect(hints.getDebugState().countdownMs).toBeCloseTo(before - 500);
    expect(advance(hints, individualHintDurationMs)).toEqual([]);
    expect(hints.getDebugState().nextTarget).toBe('frog');
    expect(hints.getDebugState().previousTarget).toBeNull();
  });

  it('reports actual suppression and pause reasons and stops animation', () => {
    const hints = new InteractionHintController();
    advance(hints, initialShowcaseDelayMs);
    expect(hints.update(0.1, { eligible: all, suppressionReason: 'Frog drag' })).toEqual([]);
    expect(hints.getDebugState()).toMatchObject({ status: 'Suppressed', suppressionReason: 'Frog drag', phase: 'Rotating hints' });
    expect(hints.showNow('frog')).toBe(false);
    expect(hints.update(0.1, { eligible: all, pausedReason: 'Page hidden' })).toEqual([]);
    expect(hints.getDebugState()).toMatchObject({ status: 'Paused', suppressionReason: 'Page hidden' });
    expect(hints.update(0.1, { eligible: all, reducedMotion: true })).toEqual([]);
    expect(hints.getDebugState()).toMatchObject({ status: 'Paused', suppressionReason: 'Reduced motion' });
  });

  it('respects eligible targets while sleeping and reset timer clears a preview', () => {
    const hints = new InteractionHintController();
    advance(hints, initialShowcaseDelayMs + initialShowcaseDurationMs, { eligible: ['frog', 'house'] });
    expect(hints.update(0, { eligible: ['frog', 'house'] })).toEqual([]);
    expect(hints.showNow('pet')).toBe(false);
    expect(hints.showNow('house')).toBe(true);
    hints.resetTimer();
    expect(hints.getDebugState()).toMatchObject({ status: 'Waiting', countdownMs: firstRotatingHintDelayMs, preview: false });
    expect(advance(hints, firstRotatingHintDelayMs, { eligible: ['frog', 'house'] }).map((frame) => frame.target)).toEqual(['frog']);
  });

  it('replays all four for 2.5 seconds while pausing the automatic countdown', () => {
    const hints = new InteractionHintController();
    advance(hints, initialShowcaseDelayMs + initialShowcaseDurationMs + 3_000);
    expect(hints.replayShowcase()).toBe(true);
    expect(advance(hints, manualShowcaseDurationMs - 100).map((frame) => frame.target)).toEqual(all);
    expect(hints.getDebugState()).toMatchObject({
      status: 'Showing', phase: 'Manual replay', phaseRemainingMs: 100,
      activeTargets: all, nextTarget: 'frog',
    });
    expect(advance(hints, 100)).toEqual([]);
    expect(hints.getDebugState()).toMatchObject({
      phase: 'Rotating hints', countdownMs: firstRotatingHintDelayMs,
    });
    expect(advance(hints, firstRotatingHintDelayMs).map((frame) => frame.target)).toEqual(['frog']);
  });

  it('restarts manual playback cleanly and dismisses it on gameplay input', () => {
    const hints = new InteractionHintController();
    advance(hints, initialShowcaseDelayMs + initialShowcaseDurationMs);
    hints.replayShowcase();
    advance(hints, 1_500);
    expect(hints.replayShowcase()).toBe(true);
    expect(hints.getDebugState().phaseRemainingMs).toBe(manualShowcaseDurationMs);
    expect(advance(hints, 1_500)).toHaveLength(4);
    hints.noteInteraction();
    expect(hints.getDebugState()).toMatchObject({
      status: 'Waiting', phase: 'Rotating hints', countdownMs: firstRotatingHintDelayMs,
      activeTargets: [],
    });
  });

  it('uses the normal cooldown after a rotating hint, without changing its order', () => {
    const hints = new InteractionHintController();
    advance(hints, initialShowcaseDelayMs + initialShowcaseDurationMs + firstRotatingHintDelayMs);
    expect(hints.getDebugState().activeTargets).toEqual(['frog']);
    expect(hints.replayShowcase()).toBe(true);
    expect(advance(hints, manualShowcaseDurationMs)).toEqual([]);
    expect(hints.getDebugState()).toMatchObject({
      countdownMs: rotatingHintCooldownMs, nextTarget: 'donut',
    });
  });

  it('does not replay with reduced motion and stops manual playback if it becomes enabled', () => {
    const hints = new InteractionHintController();
    hints.update(0, { eligible: all, reducedMotion: true });
    expect(hints.replayShowcase()).toBe(false);
    hints.update(0, ready);
    expect(hints.replayShowcase()).toBe(true);
    expect(hints.update(0.1, { eligible: all, reducedMotion: true })).toEqual([]);
    expect(hints.getDebugState()).toMatchObject({
      status: 'Paused', phase: 'Rotating hints', activeTargets: [],
    });
  });
});
