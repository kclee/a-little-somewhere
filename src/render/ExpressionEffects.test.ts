import { describe, expect, it } from 'vitest';
import { ExpressionEffects } from './ExpressionEffects';

describe('expression effects', () => {
  it('loops a gentle drift without moving the pet or changing its feet anchor', () => {
    const effects = new ExpressionEffects();
    const offset = { x: 0.27, y: -0.85 };
    effects.start({ text: 'Zzz', offset, startedAt: 10, duration: 2, loop: true });
    expect(effects.sample(9.9)).toBeNull();
    const first = effects.sample(10.5)!;
    expect(first.text).toBe('Zzz');
    expect(first.offset).toBe(offset);
    expect(first.driftY).toBeLessThan(0);
    expect(first.opacity).toBeGreaterThan(0);
    expect(effects.sample(12.5)).toEqual(first);
  });

  it('expires one-shot effects and clears looping effects immediately', () => {
    const effects = new ExpressionEffects();
    effects.start({ text: 'Zzz', offset: { x: 0, y: -1 }, startedAt: 0, duration: 1 });
    expect(effects.sample(0.5)).not.toBeNull();
    expect(effects.sample(1)).toBeNull();
    effects.start({ text: 'Zzz', offset: { x: 0, y: -1 }, startedAt: 2, duration: 1, loop: true });
    expect(effects.sample(5)).not.toBeNull();
    effects.clear();
    expect(effects.sample(5)).toBeNull();
  });
});
