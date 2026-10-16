import {
  type HintDebugState, type HintTarget, InteractionHintController,
} from '../interaction/InteractionHintController';

const TARGET_LABELS: Record<HintTarget, string> = {
  frog: 'Frog', donut: 'Donut', house: 'House', pet: 'Dog',
};

export class HintDebugPanel {
  private readonly root: HTMLElement;
  private readonly select: HTMLSelectElement;
  private readonly showButton: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly values: Record<'state' | 'phase' | 'next' | 'countdown' | 'active' | 'previous' | 'reason', HTMLElement>;

  public constructor(private readonly hints: InteractionHintController) {
    this.root = document.createElement('aside');
    this.root.className = 'hint-debug';
    this.root.dataset.hintDebug = '';
    this.root.innerHTML = `
      <details open>
        <summary>Hint debug <span>DEV</span></summary>
        <dl>
          <dt>State</dt><dd data-hint-state></dd>
          <dt>Phase</dt><dd data-hint-phase></dd>
          <dt>Next</dt><dd data-hint-next></dd>
          <dt>Countdown</dt><dd data-hint-countdown></dd>
          <dt>Active</dt><dd data-hint-active></dd>
          <dt>Previous</dt><dd data-hint-previous></dd>
          <dt>Reason</dt><dd data-hint-reason></dd>
        </dl>
        <div class="hint-debug-controls">
          <select aria-label="Hint target" data-hint-select>
            <option value="frog">Frog</option><option value="donut">Donut</option>
            <option value="house">House</option><option value="pet">Dog</option>
          </select>
          <button type="button" data-hint-show>Show Now</button>
          <button type="button" data-hint-reset>Reset Timer</button>
        </div>
      </details>`;
    document.body.append(this.root);
    this.select = this.require('select[data-hint-select]');
    this.showButton = this.require('button[data-hint-show]');
    this.resetButton = this.require('button[data-hint-reset]');
    this.values = {
      state: this.require('[data-hint-state]'),
      phase: this.require('[data-hint-phase]'),
      next: this.require('[data-hint-next]'),
      countdown: this.require('[data-hint-countdown]'),
      active: this.require('[data-hint-active]'),
      previous: this.require('[data-hint-previous]'),
      reason: this.require('[data-hint-reason]'),
    };
    this.showButton.addEventListener('click', this.showNow);
    this.resetButton.addEventListener('click', this.resetTimer);
  }

  public contains(target: EventTarget | null): boolean {
    return target instanceof Node && this.root.contains(target);
  }

  public render(state: HintDebugState, eligible: readonly HintTarget[]): void {
    this.values.state.textContent = state.status + (state.preview ? ' (preview)' : '');
    this.values.phase.textContent = state.phase === 'Initial showcase'
      ? `${state.phase} (${(state.phaseRemainingMs / 1_000).toFixed(1)}s)` : state.phase;
    this.values.next.textContent = state.nextTarget === 'all' ? 'All four'
      : state.nextTarget ? TARGET_LABELS[state.nextTarget] : 'None eligible';
    this.values.countdown.textContent = `${(state.countdownMs / 1_000).toFixed(1)}s`;
    this.values.active.textContent = state.activeTargets.length
      ? state.activeTargets.map((target) => TARGET_LABELS[target]).join(', ') : '—';
    this.values.previous.textContent = state.previousTarget ? TARGET_LABELS[state.previousTarget] : '—';
    this.values.reason.textContent = state.suppressionReason ?? '—';
    this.showButton.disabled = !eligible.includes(this.select.value as HintTarget)
      || state.status === 'Suppressed' || state.status === 'Paused';
  }

  public destroy(): void {
    this.showButton.removeEventListener('click', this.showNow);
    this.resetButton.removeEventListener('click', this.resetTimer);
    this.root.remove();
  }

  private require<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing hint debug control: ${selector}`);
    return element;
  }

  private readonly showNow = (): void => {
    this.hints.showNow(this.select.value as HintTarget);
  };

  private readonly resetTimer = (): void => {
    this.hints.resetTimer();
  };
}
