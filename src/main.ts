import './style.css';
import { PointerInput } from './input/PointerInput';
import { getInteractionTarget } from './input/InteractionTarget';
import { CanvasRenderer } from './render/CanvasRenderer';
import { resolveRoomScene, ROOM_SCENES } from './render/RoomScene';
import { PetSimulation } from './simulation/PetSimulation';
import { ScenePicker } from './ui/ScenePicker';
import { PetStatus } from './ui/PetStatus';

const canvas = document.querySelector<HTMLCanvasElement>('#room');
const sceneControls = document.querySelector<HTMLElement>('[data-scene-controls]');
const statusElement = document.querySelector<HTMLElement>('[data-pet-status]');
if (!canvas || !sceneControls || !statusElement) throw new Error('Room UI was not found.');

const initialScene = resolveRoomScene(window.location.search);
const renderer = new CanvasRenderer(canvas, initialScene);
const simulation = new PetSimulation();
const petStatus = new PetStatus(statusElement);
const scenePicker = new ScenePicker(sceneControls, initialScene.id, (sceneId) => {
  renderer.setScene(ROOM_SCENES[sceneId]);
  const url = new URL(window.location.href);
  url.searchParams.set('room', sceneId);
  window.history.replaceState(null, '', url);
});

const resize = (): void => {
  const bounds = canvas.getBoundingClientRect();
  const size = renderer.resize(bounds.width, bounds.height);
  simulation.resize(size.width, size.height);
};

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvas);
resize();

const input = new PointerInput(canvas, (point) => {
  const target = getInteractionTarget(point, simulation.pet, simulation.world);
  if (target === 'pet') simulation.interact(point);
  else if (target === 'floor') simulation.moveTo(point);
  else if (target === 'wall') simulation.lookAtWall(point);
  // Static props reserve their hit areas for later interactions.
});

let previousTime = performance.now();
const frame = (now: number): void => {
  const deltaSeconds = (now - previousTime) / 1000;
  previousTime = now;
  simulation.update(deltaSeconds);
  petStatus.update(simulation.pet);
  renderer.render(simulation.pet, simulation.elapsed);
  requestAnimationFrame(frame);
};

requestAnimationFrame(frame);

window.addEventListener('pagehide', () => {
  input.destroy();
  scenePicker.destroy();
  resizeObserver.disconnect();
});

