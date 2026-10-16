import './style.css';
import type { Point } from './core/types';
import { PointerInput } from './input/PointerInput';
import { getInteractionTarget } from './input/InteractionTarget';
import { InteractionHintController, type HintTarget } from './interaction/InteractionHintController';
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
import { HintDebugPanel } from './ui/HintDebugPanel';
import { FloorSleepDebugPanel } from './ui/FloorSleepDebugPanel';

const canvas = document.querySelector<HTMLCanvasElement>('#room');
const sceneControls = document.querySelector<HTMLElement>('[data-scene-controls]');
const statusElement = document.querySelector<HTMLElement>('[data-pet-status]');
const replayButton = document.querySelector<HTMLButtonElement>('[data-hint-replay]');
if (!canvas || !sceneControls || !statusElement || !replayButton) throw new Error('Room UI was not found.');

const initialScene = resolveRoomScene(window.location.search);
const renderer = new CanvasRenderer(canvas, initialScene);
const simulation = new PetSimulation();
const frogPlay = new FrogPlayController();
const houseVisit = new HouseVisitController();
const petStatus = new PetStatus(statusElement);
const expressions = new ExpressionEffects();
const hints = new InteractionHintController();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const photoDialog = document.querySelector<HTMLDialogElement>('[data-photo-dialog]');
const sceneMenu = document.querySelector<HTMLElement>('[data-scene-menu]');
const scenePicker = new ScenePicker(sceneControls, initialScene.id, (sceneId) => {
  hints.noteInteraction();
  renderer.setScene(ROOM_SCENES[sceneId]);
  const url = new URL(window.location.href);
  url.searchParams.set('room', sceneId);
  window.history.replaceState(null, '', url);
});
const jimmyPhotoPopup = new JimmyPhotoPopup();
const hintDebug = new URLSearchParams(window.location.search).get('hintDebug') === '1'
  ? new HintDebugPanel(hints) : null;
const floorSleepDebug = import.meta.env.DEV
  && new URLSearchParams(window.location.search).get('floorSleepDebug') === '1'
  ? new FloorSleepDebugPanel((pose) => simulation.previewFloorSleep(pose)) : null;

const updateReplayAvailability = (): void => {
  replayButton.disabled = reducedMotion.matches;
};
const replayHints = (): void => {
  hints.replayShowcase();
};
updateReplayAvailability();
reducedMotion.addEventListener('change', updateReplayAvailability);
replayButton.addEventListener('click', replayHints);

const noteUserActivity = (event: Event): void => {
  if (hintDebug?.contains(event.target)) return;
  if (floorSleepDebug?.contains(event.target)) return;
  if (event.target instanceof Node && replayButton.contains(event.target)) return;
  hints.noteInteraction();
};
const noteVisibilityChange = (): void => {
  if (document.visibilityState !== 'visible') hints.noteInteraction();
};
document.addEventListener('pointerdown', noteUserActivity, true);
document.addEventListener('keydown', noteUserActivity, true);
document.addEventListener('visibilitychange', noteVisibilityChange);

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
  const holdInitialPose = !reducedMotion.matches && hints.isInitialShowcaseActive();
  simulation.update(deltaSeconds, holdInitialPose);
  const safeDelta = Math.min(Math.max(deltaSeconds, 0), 0.25);
  if (houseVisit.update(safeDelta, simulation.pet)) simulation.completeHouseEntry();
  frogPlay.update(safeDelta, simulation.pet, simulation.world);
  const propSleeping = simulation.restPhase === 'sleeping';
  const floorSleeping = simulation.pet.state === 'floorSleep';
  const sleeping = propSleeping || floorSleeping;
  if (sleeping && !showingSleepExpression) {
    expressions.start({
      text: 'Zzz',
      offset: floorSleeping ? { x: 0.25, y: -0.76 }
        : simulation.restPlace === 'house' ? { x: 0.2, y: -0.25 } : { x: 0.27, y: -0.58 },
      startedAt: simulation.elapsed,
      duration: 2.4,
      loop: true,
    });
  } else if (!sleeping && showingSleepExpression) {
    expressions.clear();
  }
  showingSleepExpression = sleeping;
  petStatus.update(simulation.pet, simulation.restPhase);
  const pet = simulation.pet;
  const interactionActive = simulation.restPhase === 'entering' || simulation.restPhase === 'waking'
    || !['autonomous', 'restAtDonut', 'insideHouse'].includes(pet.intent)
    || pet.state === 'attention' || pet.state === 'wallWag';
  // An in-app preview can remain visible while keyboard focus is elsewhere.
  // Only pause hints when the page is actually hidden.
  const pausedReason = document.visibilityState !== 'visible' ? 'Page hidden' : null;
  const suppressionReason = frogPlay.isDragging() ? 'Frog drag'
    : simulation.isHouseSequenceActive() ? 'House entry'
      : photoDialog?.open === true ? 'Jimmy photos open'
        : sceneMenu?.hidden === false ? 'Room picker open'
          : interactionActive ? 'Pet interaction' : null;
  const eligible: HintTarget[] = ['frog'];
  if (!simulation.isRestingAt('donut')) eligible.push('donut');
  if (!simulation.isRestingAt('house')) eligible.push('house');
  if (simulation.restPhase === 'none' && (pet.state === 'idle' || pet.state === 'sit')) eligible.push('pet');
  const hintFrames = hints.update(safeDelta, {
    eligible, pausedReason, suppressionReason, reducedMotion: reducedMotion.matches,
  });
  hintDebug?.render(hints.getDebugState(), eligible);
  const house = getScenePropLayout(simulation.world).house;
  renderer.render(
    simulation.pet, simulation.elapsed, expressions.sample(simulation.elapsed),
    frogPlay.getVisual(simulation.world), houseVisit.getVisual(propSleeping && simulation.restPlace === 'house'),
    propSleeping && simulation.restPlace === 'house' ? { x: house.x, y: house.baseline }
      : propSleeping && simulation.restPlace === 'donut' ? simulation.pet.position : undefined,
    simulation.donutPose,
    hintFrames,
    holdInitialPose,
  );
  requestAnimationFrame(frame);
};

requestAnimationFrame(frame);

window.addEventListener('pagehide', () => {
  input.destroy();
  scenePicker.destroy();
  jimmyPhotoPopup.destroy();
  hintDebug?.destroy();
  floorSleepDebug?.destroy();
  replayButton.removeEventListener('click', replayHints);
  reducedMotion.removeEventListener('change', updateReplayAvailability);
  document.removeEventListener('pointerdown', noteUserActivity, true);
  document.removeEventListener('keydown', noteUserActivity, true);
  document.removeEventListener('visibilitychange', noteVisibilityChange);
  resizeObserver.disconnect();
});

