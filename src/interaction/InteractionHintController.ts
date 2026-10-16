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
export const manualShowcaseDurationMs = 2_500;

const ORDER: readonly HintTarget[] = ['frog', 'donut', 'house', 'pet'];
type Phase = 'showcaseWait' | 'showcase' | 'rotatingWait' | 'rotating';
export type HintDebugStatus = 'Waiting' | 'Showing' | 'Suppressed' | 'Paused';

export interface HintDebugState {
  status: HintDebugStatus;
  phase: 'Initial showcase' | 'Rotating hints' | 'Manual replay';
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
  private manualElapsedMs: number | null = null;
  private eligible: readonly HintTarget[] = ORDER;
  private blockedAs: 'Suppressed' | 'Paused' | null = null;
  private blockedReason: string | null = null;

  public noteInteraction(): void {
    this.manualElapsedMs = null;
    this.phase = 'rotatingWait';
    this.waitRemainingMs = this.hasShownRotating ? rotatingHintCooldownMs : firstRotatingHintDelayMs;
    this.elapsedMs = 0;
    this.active = null;
    this.previewTarget = null;
  }

  public resetTimer(): void {
    this.manualElapsedMs = null;
    this.phase = 'rotatingWait';
    this.waitRemainingMs = this.hasShownRotating ? rotatingHintCooldownMs : firstRotatingHintDelayMs;
    this.active = null;
    this.elapsedMs = 0;
    this.previewTarget = null;
  }

  public showNow(target: HintTarget): boolean {
    if (!this.eligible.includes(target) || this.blockedAs !== null || this.manualElapsedMs !== null) return false;
    this.previewTarget = target;
    this.previewElapsedMs = 0;
    return true;
  }

  public isInitialShowcaseActive(): boolean {
    return this.phase === 'showcaseWait' || this.phase === 'showcase';
  }

  public replayShowcase(): boolean {
    if (this.blockedAs === 'Paused') return false;
    this.previewTarget = null;
    this.manualElapsedMs = 0;
    return true;
  }

  public update(deltaSeconds: number, conditions: HintConditions): HintFrame[] {
    this.eligible = conditions.eligible;
    this.blockedAs = conditions.reducedMotion || conditions.pausedReason ? 'Paused'
      : conditions.suppressionReason ? 'Suppressed' : null;
    this.blockedReason = conditions.reducedMotion ? 'Reduced motion'
      : conditions.pausedReason ?? conditions.suppressionReason ?? null;
    const deltaMs = Math.min(Math.max(deltaSeconds, 0), 0.25) * 1_000;
    if (this.manualElapsedMs !== null) {
      if (conditions.reducedMotion) {
        this.resetTimer();
        return [];
      }
      if (conditions.pausedReason) return [];
      this.manualElapsedMs += deltaMs;
      if (this.manualElapsedMs >= manualShowcaseDurationMs) {
        this.resetTimer();
        return [];
      }
      return this.showcaseFrames(this.manualElapsedMs / manualShowcaseDurationMs);
    }
    if (this.blockedAs) {
      this.previewTarget = null;
      if (this.phase === 'showcase') this.finishShowcase();
      if (this.phase === 'rotating') this.finishRotating();
      return [];
    }

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
    if (this.phase === 'showcase') return this.showcaseFrames(this.elapsedMs / initialShowcaseDurationMs);
    if (this.phase === 'rotating' && this.active) return [this.frame(this.active, this.elapsedMs / individualHintDurationMs)];
    return [];
  }

  public getDebugState(): HintDebugState {
    const showcase = this.phase === 'showcaseWait' || this.phase === 'showcase';
    const manual = this.manualElapsedMs !== null;
    const activeTargets = manual ? [...ORDER] : this.previewTarget ? [this.previewTarget]
      : this.phase === 'showcase' ? [...ORDER]
        : this.active ? [this.active] : [];
    const normalCountdownMs = this.phase === 'showcaseWait' || this.phase === 'rotatingWait'
      ? this.waitRemainingMs
      : this.phase === 'showcase'
        ? Math.max(0, initialShowcaseDurationMs - this.elapsedMs) + firstRotatingHintDelayMs
        : Math.max(0, individualHintDurationMs - this.elapsedMs) + rotatingHintCooldownMs;
    const manualRemainingMs = manualShowcaseDurationMs - (this.manualElapsedMs ?? 0);
    return {
      status: manual && this.blockedAs !== 'Paused' ? 'Showing'
        : this.blockedAs ?? (activeTargets.length > 0 ? 'Showing' : 'Waiting'),
      phase: manual ? 'Manual replay' : showcase ? 'Initial showcase' : 'Rotating hints',
      phaseRemainingMs: manual ? manualRemainingMs
        : this.phase === 'showcaseWait' || this.phase === 'rotatingWait'
        ? this.waitRemainingMs
        : this.phase === 'showcase'
          ? Math.max(0, initialShowcaseDurationMs - this.elapsedMs)
          : Math.max(0, individualHintDurationMs - this.elapsedMs),
      nextTarget: manual ? this.nextEligibleTarget() : showcase ? 'all' : this.nextEligibleTarget(),
      countdownMs: manual ? manualRemainingMs + (this.hasShownRotating
        ? rotatingHintCooldownMs : firstRotatingHintDelayMs) : normalCountdownMs,
      activeTargets,
      previousTarget: this.previous,
      suppressionReason: this.blockedReason,
      preview: this.previewTarget !== null,
    };
  }

  private frame(target: HintTarget, progress: number): HintFrame {
    return { target, gesture: target === 'frog' ? 'drag' : 'tap', progress: Math.min(1, progress) };
  }

  private showcaseFrames(progress: number): HintFrame[] {
    return ORDER.map((target) => this.frame(target, progress));
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
