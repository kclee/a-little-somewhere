import type { PetModel } from '../core/types';
import type { HouseVisual } from '../render/SceneProps';

export const HOUSE_WIGGLE_SECONDS = 0.7;
const HOUSE_ROCK_RADIANS = 3 * Math.PI / 180;
const HOUSE_SQUASH = 0.02;

export class HouseVisitController {
  private active = false;
  private elapsed = 0;
  private entryCompleted = false;

  public update(deltaSeconds: number, pet: Pick<PetModel, 'intent'>): boolean {
    if (pet.intent !== 'insideHouse') {
      this.reset();
      return false;
    }
    if (!this.active) {
      this.active = true;
      this.elapsed = 0;
    }
    this.elapsed += Math.max(0, deltaSeconds);
    if (this.elapsed >= HOUSE_WIGGLE_SECONDS && !this.entryCompleted) {
      this.entryCompleted = true;
      return true;
    }
    return false;
  }

  public getVisual(sleeping = false): HouseVisual {
    if (!this.active) return { occupied: false, hidePet: false, wiggle: 0 };
    if (this.elapsed >= HOUSE_WIGGLE_SECONDS) {
      return sleeping
        ? { occupied: true, hidePet: true, wiggle: 0, sleeping: true }
        : { occupied: true, hidePet: true, wiggle: 0 };
    }
    const progress = this.elapsed / HOUSE_WIGGLE_SECONDS;
    const sway = Math.sin(progress * Math.PI * 5) * (1 - progress);
    return {
      occupied: false,
      hidePet: true,
      wiggle: sway * HOUSE_ROCK_RADIANS,
      scaleX: 1 + sway * HOUSE_SQUASH,
      scaleY: 1 - sway * HOUSE_SQUASH,
    };
  }

  private reset(): void {
    this.active = false;
    this.elapsed = 0;
    this.entryCompleted = false;
  }
}
