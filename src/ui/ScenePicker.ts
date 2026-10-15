import { ROOM_SCENES, type RoomSceneId } from '../render/RoomScene';

type SceneChangeHandler = (sceneId: RoomSceneId) => void;

export class ScenePicker {
  private readonly toggle: HTMLButtonElement;
  private readonly menu: HTMLElement;
  private readonly choices: HTMLButtonElement[];

  public constructor(
    private readonly root: HTMLElement,
    initialSceneId: RoomSceneId,
    private readonly onSceneChange: SceneChangeHandler,
  ) {
    const toggle = root.querySelector<HTMLButtonElement>('[data-scene-toggle]');
    const menu = root.querySelector<HTMLElement>('[data-scene-menu]');
    const choices = [...root.querySelectorAll<HTMLButtonElement>('[data-scene-id]')];
    if (!toggle || !menu || choices.length === 0) {
      throw new Error('Scene picker controls are incomplete.');
    }

    this.toggle = toggle;
    this.menu = menu;
    this.choices = choices;
    this.updateSelection(initialSceneId);
    this.toggle.addEventListener('click', this.handleToggle);
    for (const choice of this.choices) choice.addEventListener('click', this.handleChoice);
    document.addEventListener('pointerdown', this.handleOutsidePointer);
    document.addEventListener('keydown', this.handleKeydown);
  }

  public destroy(): void {
    this.toggle.removeEventListener('click', this.handleToggle);
    for (const choice of this.choices) choice.removeEventListener('click', this.handleChoice);
    document.removeEventListener('pointerdown', this.handleOutsidePointer);
    document.removeEventListener('keydown', this.handleKeydown);
  }

  private readonly handleToggle = (): void => {
    this.setOpen(this.menu.hidden);
  };

  private readonly handleChoice = (event: Event): void => {
    const choice = event.currentTarget as HTMLButtonElement;
    const sceneId = choice.dataset.sceneId as RoomSceneId;
    if (!(sceneId in ROOM_SCENES)) return;
    this.updateSelection(sceneId);
    this.setOpen(false);
    this.onSceneChange(sceneId);
    this.toggle.focus();
  };

  private readonly handleOutsidePointer = (event: PointerEvent): void => {
    if (!this.menu.hidden && !this.root.contains(event.target as Node)) this.setOpen(false);
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !this.menu.hidden) {
      this.setOpen(false);
      this.toggle.focus();
    }
  };

  private setOpen(open: boolean): void {
    this.menu.hidden = !open;
    this.toggle.setAttribute('aria-expanded', String(open));
  }

  private updateSelection(sceneId: RoomSceneId): void {
    this.toggle.setAttribute('aria-label', `Choose room. Current: ${ROOM_SCENES[sceneId].name}`);
    for (const choice of this.choices) {
      const selected = choice.dataset.sceneId === sceneId;
      choice.setAttribute('aria-checked', String(selected));
      choice.classList.toggle('is-selected', selected);
    }
  }
}
