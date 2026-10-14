import type { Point } from '../core/types';

export class PointerInput {
  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onInteract: (point: Point) => void,
  ) {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
  }

  public destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    this.onInteract({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };
}

