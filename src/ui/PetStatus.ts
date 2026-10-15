import type { PetModel, PetState } from '../core/types';

const MALTESE_PHRASES: Record<PetState, string> = {
  idle: '休息一下～',
  walk: '散步中～',
  jog: '小跑步！',
  sit: '坐坐看風景',
  attention: '你叫我嗎？',
  wallWag: '看看那邊～',
};

export function getPetStatus(pet: Pick<PetModel, 'state' | 'intent'>): string {
  return pet.intent === 'moveTo' ? '我來啦！' : MALTESE_PHRASES[pet.state];
}

export class PetStatus {
  private previous = '';

  public constructor(private readonly element: HTMLElement) {}

  public update(pet: Pick<PetModel, 'state' | 'intent'>): void {
    const next = getPetStatus(pet);
    if (next === this.previous) return;
    this.element.textContent = next;
    this.previous = next;
  }
}
