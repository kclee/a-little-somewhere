type PreviewPose = 'awake' | 'asleep' | 'cycle' | 'off';

export class FloorSleepDebugPanel {
  private readonly element: HTMLDetailsElement;

  public constructor(private readonly onSelect: (pose: PreviewPose) => void) {
    this.element = document.createElement('details');
    this.element.className = 'hint-debug floor-sleep-debug';
    this.element.open = true;
    this.element.innerHTML = `
      <summary>Floor sleep preview <span>DEV</span></summary>
      <div class="hint-debug-controls">
        <button type="button" data-floor-preview="awake">Lying Awake</button>
        <button type="button" data-floor-preview="asleep">Lying Asleep</button>
        <button type="button" data-floor-preview="cycle">Run Cycle</button>
        <button type="button" data-floor-preview="off">Resume</button>
      </div>`;
    this.element.addEventListener('click', this.handleClick);
    document.body.append(this.element);
    this.onSelect('awake');
  }

  public contains(target: EventTarget | null): boolean {
    return target instanceof Node && this.element.contains(target);
  }

  public destroy(): void {
    this.element.removeEventListener('click', this.handleClick);
    this.element.remove();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-floor-preview]');
    if (!button || !this.element.contains(button)) return;
    const pose = button.dataset.floorPreview;
    if (pose === 'awake' || pose === 'asleep' || pose === 'cycle' || pose === 'off') this.onSelect(pose);
  };
}
