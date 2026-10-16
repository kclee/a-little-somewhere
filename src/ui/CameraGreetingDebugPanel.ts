type PreviewMode = 'run' | 'closeup' | 'resume';

export class CameraGreetingDebugPanel {
  private readonly element: HTMLDetailsElement;

  public constructor(private readonly onSelect: (mode: PreviewMode) => void) {
    this.element = document.createElement('details');
    this.element.className = 'hint-debug camera-greeting-debug';
    this.element.open = true;
    this.element.innerHTML = `
      <summary>Camera greeting <span>DEV</span></summary>
      <div class="hint-debug-controls">
        <button type="button" data-camera-preview="run">Run Greeting</button>
        <button type="button" data-camera-preview="closeup">Show Close-up</button>
        <button type="button" data-camera-preview="resume">Resume</button>
      </div>`;
    this.element.addEventListener('click', this.handleClick);
    document.body.append(this.element);
  }

  public contains(target: EventTarget | null): boolean {
    return target instanceof Node && this.element.contains(target);
  }

  public destroy(): void {
    this.element.removeEventListener('click', this.handleClick);
    this.element.remove();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-camera-preview]');
    if (!button || !this.element.contains(button)) return;
    const mode = button.dataset.cameraPreview;
    if (mode === 'run' || mode === 'closeup' || mode === 'resume') this.onSelect(mode);
  };
}
