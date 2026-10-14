import './style.css';
import { PointerInput } from './input/PointerInput';
import { CanvasRenderer } from './render/CanvasRenderer';
import { PetSimulation } from './simulation/PetSimulation';

const canvas = document.querySelector<HTMLCanvasElement>('#room');
if (!canvas) throw new Error('Room canvas was not found.');

const renderer = new CanvasRenderer(canvas);
const simulation = new PetSimulation();

const resize = (): void => {
  const bounds = canvas.getBoundingClientRect();
  const size = renderer.resize(bounds.width, bounds.height);
  simulation.resize(size.width, size.height);
};

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvas);
resize();

const input = new PointerInput(canvas, (point) => simulation.interact(point));

let previousTime = performance.now();
const frame = (now: number): void => {
  const deltaSeconds = (now - previousTime) / 1000;
  previousTime = now;
  simulation.update(deltaSeconds);
  renderer.render(simulation.pet, simulation.elapsed);
  requestAnimationFrame(frame);
};

requestAnimationFrame(frame);

window.addEventListener('pagehide', () => {
  input.destroy();
  resizeObserver.disconnect();
});

