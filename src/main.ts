import './style.css';
import type { Point } from './core/types';
import { PointerInput } from './input/PointerInput';
import { getInteractionTarget } from './input/InteractionTarget';
import { CanvasRenderer } from './render/CanvasRenderer';
import { ExpressionEffects } from './render/ExpressionEffects';
import { resolveRoomScene, ROOM_SCENES } from './render/RoomScene';
import { getDonutRestPoint, getHouseVisitPoint, getScenePropLayout } from './render/SceneProps';
import { PetSimulation } from './simulation/PetSimulation';
import { FrogPlayController } from './simulation/FrogPlayController';
import { HouseVisitController } from './simulation/HouseVisitController';
import { ScenePicker } from './ui/ScenePicker';
import { PetStatus } from './ui/PetStatus';
import { JimmyPhotoPopup } from './ui/JimmyPhotoPopup';

const canvas = document.querySelector<HTMLCanvasElement>('#room');
const sceneControls = document.querySelector<HTMLElement>('[data-scene-controls]');
const statusElement = document.querySelector<HTMLElement>('[data-pet-status]');
if (!canvas || !sceneControls || !statusElement) throw new Error('Room UI was not found.');

const initialScene = resolveRoomScene(window.location.search);
const renderer = new CanvasRenderer(canvas, initialScene);
const simulation = new PetSimulation();
const frogPlay = new FrogPlayController();
const houseVisit = new HouseVisitController();
const petStatus = new PetStatus(statusElement);
const expressions = new ExpressionEffects();
const scenePicker = new ScenePicker(sceneControls, initialScene.id, (sceneId) => {
  renderer.setScene(ROOM_SCENES[sceneId]);
  const url = new URL(window.location.href);
  url.searchParams.set('room', sceneId);
  window.history.replaceState(null, '', url);
});
const jimmyPhotoPopup = new JimmyPhotoPopup();

const resize = (): void => {
  const bounds = canvas.getBoundingClientRect();
  const size = renderer.resize(bounds.width, bounds.height);
  simulation.resize(size.width, size.height);
  frogPlay.resize(simulation.world);
};

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvas);
resize();

const targetAt = (point: Point) => {
  const frog = frogPlay.getVisual(simulation.world);
  return getInteractionTarget(
    point, simulation.pet, simulation.world, { x: frog.x, y: frog.baseline },
    !simulation.isRestingAt('house'),
  );
};

const input = new PointerInput(canvas, {
  isFrog: (point) => !simulation.isHouseSequenceActive() && targetAt(point) === 'frog',
  onFrogTap: () => simulation.playWithFrog(
    frogPlay.getApproachPoint(simulation.world, simulation.pet.position.x),
  ),
  onTap: (point) => {
    if (simulation.isHouseSequenceActive()) return;
    const target = targetAt(point);
    if (target === 'pet') simulation.interact(point);
    else if (target === 'frog') simulation.playWithFrog(
      frogPlay.getApproachPoint(simulation.world, simulation.pet.position.x),
    );
    else if (target === 'cushion') {
      if (simulation.isRestingAt('donut')) simulation.interact(point);
      else simulation.restAtDonut(getDonutRestPoint(simulation.world));
    } else if (target === 'house') {
      if (simulation.isRestingAt('house')) simulation.interact(point);
      else simulation.visitHouse(getHouseVisitPoint(simulation.world));
    }
    else if (target === 'floor') simulation.moveTo(point);
    else if (target === 'wall') simulation.lookAtWall(point);
    // Static props reserve their hit areas for later interactions.
  },
  onDragStart: (point) => {
    frogPlay.beginDrag(point, simulation.world);
    simulation.beginFrogDrag();
  },
  onDragMove: (point) => frogPlay.moveDrag(point, simulation.world),
  onDrop: (point) => {
    const result = frogPlay.drop(point, simulation.world);
    if (result) simulation.dropFrog(frogPlay.getApproachPoint(simulation.world, simulation.pet.position.x));
    else simulation.cancelFrogDrag();
  },
  onDragCancel: () => {
    frogPlay.cancelDrag();
    simulation.cancelFrogDrag();
  },
});

let previousTime = performance.now();
let showingSleepExpression = false;
const frame = (now: number): void => {
  const deltaSeconds = (now - previousTime) / 1000;
  previousTime = now;
  simulation.update(deltaSeconds);
  const safeDelta = Math.min(Math.max(deltaSeconds, 0), 0.25);
  if (houseVisit.update(safeDelta, simulation.pet)) simulation.completeHouseEntry();
  frogPlay.update(safeDelta, simulation.pet, simulation.world);
  const sleeping = simulation.restPhase === 'sleeping';
  if (sleeping && !showingSleepExpression) {
    expressions.start({
      text: 'Zzz',
      offset: simulation.restPlace === 'house' ? { x: 0.2, y: -0.25 } : { x: 0.27, y: -0.85 },
      startedAt: simulation.elapsed,
      duration: 2.4,
      loop: true,
    });
  } else if (!sleeping && showingSleepExpression) {
    expressions.clear();
  }
  showingSleepExpression = sleeping;
  petStatus.update(simulation.pet, simulation.restPhase);
  const house = getScenePropLayout(simulation.world).house;
  renderer.render(
    simulation.pet, simulation.elapsed, expressions.sample(simulation.elapsed),
    frogPlay.getVisual(simulation.world), houseVisit.getVisual(sleeping && simulation.restPlace === 'house'),
    sleeping && simulation.restPlace === 'house' ? { x: house.x, y: house.baseline } : undefined,
    sleeping && simulation.restPlace === 'donut',
  );
  requestAnimationFrame(frame);
};

requestAnimationFrame(frame);

window.addEventListener('pagehide', () => {
  input.destroy();
  scenePicker.destroy();
  jimmyPhotoPopup.destroy();
  resizeObserver.disconnect();
});

