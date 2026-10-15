import { describe, expect, it } from 'vitest';
import { getPetStatus } from './PetStatus';

describe('pet status', () => {
  it('gives user-directed movement priority over gait', () => {
    expect(getPetStatus({ state: 'jog', intent: 'moveTo' })).toBe('我來啦！');
    expect(getPetStatus({ state: 'jog', intent: 'autonomous' })).toBe('小跑步！');
    expect(getPetStatus({ state: 'walk', intent: 'wallMove' })).toBe('去看看～');
    expect(getPetStatus({ state: 'attention', intent: 'autonomous' })).toBe('你叫我嗎？');
  });
});
