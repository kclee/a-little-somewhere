export type HintTarget = 'frog' | 'donut' | 'house' | 'pet';
export type HintGesture = 'tap' | 'drag';

export interface HintFrame {
  target: HintTarget;
  gesture: HintGesture;
  progress: number;
}

export const initialShowcaseDelayMs = 2_000;
export const initialShowcaseDurationMs = 4_000;
export const firstRotatingHintDelayMs = 20_000;
export const rotatingHintCooldownMs = 30_000;
export const individualHintDurationMs = 2_500;

const ORDER: readonly HintTarget[] = ['frog', 'donut', 'house', 'pet'];
type Phase = 'showcaseWait' | 'showcase' | 'rotatingWait' | 'rotating';
export type HintDebugStatus = 'Waiting' | 'Showing' | 'Suppressed' | 'Paused';

export interface HintDebugState {
  status: HintDebugStatus;
  phase: 'Initial showcase' | 'Rotating hints';
  phaseRemainingMs: number;
  nextTarget: HintTarget | 'all' | null;
  countdownMs: number;
  activeTargets: readonly HintTarget[];
  previousTarget: HintTarget | null;
  suppressionReason: string | null;
  preview: boolean;
}

export interface HintConditions {
  eligible: readonly HintTarget[];
  suppressionReason?: string | null;
  pausedReason?: string | null;
  reducedMotion?: boolean;
}

export class InteractionHintController {
  private phase: Phase = 'showcaseWait';
  private waitRemainingMs = initialShowcaseDelayMs;
  private elapsedMs = 0;
  private active: HintTarget | null = null;
  private previous: HintTarget | null = null;
  private hasShownRotating = false;
  private lastIndex = -1;
  private previewTarget: HintTarget | null = null;
  private previewElapsedMs = 0;
  private eligible: readonly HintTarget[] = ORDER;
  private blockedAs: 'Suppressed' | 'Paused' | null = null;
  private blockedReason: string | null = null;

  public noteInteraction(): void {
    this.phase = 'rotatingWait';
    this.waitRemainingMs = this.hasShownRotating ? rotatingHintCooldownMs : firstRotatingHintDelayMs;
    this.elapsedMs = 0;
    this.active = null;
    this.previewTarget = null;
  }

  public resetTimer(): void {
    this.phase = 'rotatingWait';
    this.waitRemainingMs = this.hasShownRotating ? rotatingHintCooldownMs : firstRotatingHintDelayMs;
    this.active = null;
    this.elapsedMs = 0;
    this.previewTarget = null;
  }

  public showNow(target: HintTarget): boolean {
    if (!this.eligible.includes(target) || this.blockedAs !== null) return false;
    this.previewTarget = target;
    this.previewElapsedMs = 0;
    return true;
  }

  public isInitialShowcaseActive(): boolean {
    return this.phase === 'showcaseWait' || this.phase === 'showcase';
  }

  public update(deltaSeconds: number, conditions: HintConditions): HintFrame[] {
    this.eligible = conditions.eligible;
    this.blockedAs = conditions.reducedMotion || conditions.pausedReason ? 'Paused'
      : conditions.suppressionReason ? 'Suppressed' : null;
    this.blockedReason = conditions.reducedMotion ? 'Reduced motion'
      : conditions.pausedReason ?? conditions.suppressionReason ?? null;
    if (this.blockedAs) {
      this.previewTarget = null;
      if (this.phase === 'showcase') this.finishShowcase();
      if (this.phase === 'rotating') this.finishRotating();
      return [];
    }

    const deltaMs = Math.min(Math.max(deltaSeconds, 0), 0.25) * 1_000;
    if (this.phase === 'rotating' && this.active && !this.eligible.includes(this.active)) {
      this.finishRotating();
    }

    if (this.phase === 'showcaseWait' || this.phase === 'rotatingWait') {
      this.waitRemainingMs = Math.max(0, this.waitRemainingMs - deltaMs);
      if (this.waitRemainingMs <= 1e-6) {
        if (this.phase === 'showcaseWait') {
          this.phase = 'showcase';
          this.elapsedMs = 0;
        } else {
          this.active = this.nextEligibleTarget();
          if (this.active) {
            this.phase = 'rotating';
            this.hasShownRotating = true;
            this.lastIndex = ORDER.indexOf(this.active);
            this.elapsedMs = 0;
          }
        }
      }
    } else {
      this.elapsedMs += deltaMs;
      if (this.phase === 'showcase' && this.elapsedMs >= initialShowcaseDurationMs) {
        this.finishShowcase();
      } else if (this.phase === 'rotating' && this.elapsedMs >= individualHintDurationMs) {
        this.finishRotating();
      }
    }

    if (this.previewTarget) {
      this.previewElapsedMs += deltaMs;
      if (this.previewElapsedMs >= individualHintDurationMs) this.previewTarget = null;
      else return [this.frame(this.previewTarget, this.previewElapsedMs / individualHintDurationMs)];
    }
    if (this.phase === 'showcase') return ORDER.map((target) => this.frame(target, this.elapsedMs / initialShowcaseDurationMs));
    if (this.phase === 'rotating' && this.active) return [this.frame(this.active, this.elapsedMs / individualHintDurationMs)];
    return [];
  }

  public getDebugState(): HintDebugState {
    const showcase = this.phase === 'showcaseWait' || this.phase === 'showcase';
    const activeTargets = this.previewTarget ? [this.previewTarget]
      : this.phase === 'showcase' ? [...ORDER]
        : this.active ? [this.active] : [];
    const countdownMs = this.phase === 'showcaseWait' || this.phase === 'rotatingWait'
      ? this.waitRemainingMs
      : this.phase === 'showcase'
        ? Math.max(0, initialShowcaseDurationMs - this.elapsedMs) + firstRotatingHintDelayMs
        : Math.max(0, individualHintDurationMs - this.elapsedMs) + rotatingHintCooldownMs;
    return {
      status: this.blockedAs ?? (activeTargets.length > 0 ? 'Showing' : 'Waiting'),
      phase: showcase ? 'Initial showcase' : 'Rotating hints',
      phaseRemainingMs: this.phase === 'showcaseWait' || this.phase === 'rotatingWait'
        ? this.waitRemainingMs
        : this.phase === 'showcase'
          ? Math.max(0, initialShowcaseDurationMs - this.elapsedMs)
          : Math.max(0, individualHintDurationMs - this.elapsedMs),
      nextTarget: showcase ? 'all' : this.nextEligibleTarget(),
      countdownMs,
      activeTargets,
      previousTarget: this.previous,
      suppressionReason: this.blockedReason,
      preview: this.previewTarget !== null,
    };
  }

  private frame(target: HintTarget, progress: number): HintFrame {
    return { target, gesture: target === 'frog' ? 'drag' : 'tap', progress: Math.min(1, progress) };
  }

  private nextEligibleTarget(): HintTarget | null {
    for (let step = 1; step <= ORDER.length; step += 1) {
      const target = ORDER[(this.lastIndex + step) % ORDER.length];
      if (target && this.eligible.includes(target)) return target;
    }
    return null;
  }

  private finishShowcase(): void {
    this.phase = 'rotatingWait';
    this.elapsedMs = 0;
    this.waitRemainingMs = firstRotatingHintDelayMs;
  }

  private finishRotating(): void {
    this.previous = this.active;
    this.active = null;
    this.phase = 'rotatingWait';
    this.elapsedMs = 0;
    this.waitRemainingMs = rotatingHintCooldownMs;
  }
}
