import { describe, expect, it } from 'vitest';
import { getPetStatus } from './PetStatus';

describe('pet status', () => {
  it('gives user-directed movement priority over gait', () => {
    expect(getPetStatus({ state: 'jog', intent: 'moveTo' })).toBe('我來啦！');
    expect(getPetStatus({ state: 'jog', intent: 'autonomous' })).toBe('小跑步！');
    expect(getPetStatus({ state: 'walk', intent: 'wallMove' })).toBe('去看看～');
    expect(getPetStatus({ state: 'attention', intent: 'autonomous' })).toBe('你叫我嗎？');
    expect(getPetStatus({ state: 'walk', intent: 'donutMove' })).toBe('去甜甜圈～');
    expect(getPetStatus({ state: 'idle', intent: 'restAtDonut' })).toBe('好舒服～');
    expect(getPetStatus({ state: 'jog', intent: 'frogMove' })).toBe('去找青蛙囉！');
    expect(getPetStatus({ state: 'idle', intent: 'playWithFrog' })).toBe('和青蛙玩耍中～');
    expect(getPetStatus({ state: 'idle', intent: 'frogDrag' })).toBe('青蛙去哪裡了？');
    expect(getPetStatus({ state: 'jog', intent: 'houseMove' })).toBe('回小窩休息～');
    expect(getPetStatus({ state: 'idle', intent: 'insideHouse' })).toBe('躲在小屋裡');
    expect(getPetStatus({ state: 'idle', intent: 'insideHouse' }, 'sleeping')).toBe('呼呼睡著了～');
    expect(getPetStatus({ state: 'idle', intent: 'autonomous' }, 'waking')).toBe('睡飽了～');
  });
});
