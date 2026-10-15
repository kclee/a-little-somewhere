import type { PetModel, PetState } from '../core/types';
import type { RestPhase } from '../simulation/PetSimulation';

const MALTESE_PHRASES: Record<PetState, string> = {
  idle: '休息一下～',
  walk: '散步中～',
  jog: '小跑步！',
  sit: '坐坐看風景',
  attention: '你叫我嗎？',
  wallWag: '看看那邊～',
};

export function getPetStatus(pet: Pick<PetModel, 'state' | 'intent'>, restPhase: RestPhase = 'none'): string {
  if (restPhase === 'sleeping') return '呼呼睡著了～';
  if (restPhase === 'waking') return '睡飽了～';
  if (pet.intent === 'moveTo') return '我來啦！';
  if (pet.intent === 'wallMove') return '去看看～';
  if (pet.intent === 'donutMove') return '去甜甜圈～';
  if (pet.intent === 'restAtDonut') return '好舒服～';
  if (pet.intent === 'frogDrag') return '青蛙去哪裡了？';
  if (pet.intent === 'houseMove') return '回小窩休息～';
  if (pet.intent === 'insideHouse') return '躲在小屋裡';
  if (pet.intent === 'frogMove') return '去找青蛙囉！';
  if (pet.intent === 'playWithFrog') return '和青蛙玩耍中～';
  return MALTESE_PHRASES[pet.state];
}

export class PetStatus {
  private previous = '';

  public constructor(private readonly element: HTMLElement) {}

  public update(pet: Pick<PetModel, 'state' | 'intent'>, restPhase: RestPhase = 'none'): void {
    const next = getPetStatus(pet, restPhase);
    if (next === this.previous) return;
    this.element.textContent = next;
    this.previous = next;
  }
}
