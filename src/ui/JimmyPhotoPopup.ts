import { getJimmyPhotos } from './JimmyPhotoSources';
import outdoorPhoto from '../assets/jimmy/jimmy-outdoors.jpg';
import housePhoto from '../assets/jimmy/jimmy-house.jpg';
import donutPhoto from '../assets/jimmy/jimmy-donut.jpg';

const photoAssets = {
  '../assets/jimmy/jimmy-outdoors.jpg': outdoorPhoto,
  '../assets/jimmy/jimmy-house.jpg': housePhoto,
  '../assets/jimmy/jimmy-donut.jpg': donutPhoto,
};

export class JimmyPhotoPopup {
  private readonly toggle: HTMLButtonElement;
  private readonly dialog: HTMLDialogElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly list: HTMLElement;

  public constructor() {
    const toggle = document.querySelector<HTMLButtonElement>('[data-photo-toggle]');
    const dialog = document.querySelector<HTMLDialogElement>('[data-photo-dialog]');
    const closeButton = document.querySelector<HTMLButtonElement>('[data-photo-close]');
    const list = document.querySelector<HTMLElement>('[data-photo-list]');
    if (!toggle || !dialog || !closeButton || !list) {
      throw new Error('Jimmy photo controls are incomplete.');
    }

    this.toggle = toggle;
    this.dialog = dialog;
    this.closeButton = closeButton;
    this.list = list;

    const photos = getJimmyPhotos(photoAssets);
    if (photos.length === 0) return;
    for (const [index, photo] of photos.entries()) {
      const image = document.createElement('img');
      image.src = photo.url;
      image.alt = `Jimmy the Maltese, photo ${index + 1}`;
      image.style.objectFit = photo.objectFit;
      image.style.objectPosition = photo.objectPosition;
      image.loading = index === 0 ? 'eager' : 'lazy';
      image.decoding = 'async';
      list.append(image);
    }

    this.toggle.hidden = false;
    this.toggle.addEventListener('click', this.open);
    this.closeButton.addEventListener('click', this.close);
    this.dialog.addEventListener('click', this.handleBackdropClick);
  }

  public destroy(): void {
    this.toggle.removeEventListener('click', this.open);
    this.closeButton.removeEventListener('click', this.close);
    this.dialog.removeEventListener('click', this.handleBackdropClick);
  }

  private readonly open = (): void => {
    this.list.scrollTop = 0;
    this.dialog.showModal();
  };

  private readonly close = (): void => {
    this.dialog.close();
    this.toggle.focus();
  };

  private readonly handleBackdropClick = (event: MouseEvent): void => {
    if (event.target !== this.dialog) return;
    const bounds = this.dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) this.close();
  };
}
