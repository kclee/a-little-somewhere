export interface JimmyPhoto {
  url: string;
  objectFit: 'cover' | 'contain';
  objectPosition: string;
}

// These public copies have no camera metadata; the untouched originals stay in art-inbox.
const PHOTO_FRAMING = [
  { filename: 'jimmy-outdoors.jpg', objectFit: 'cover', objectPosition: '80% 50%' },
  { filename: 'jimmy-house.jpg', objectFit: 'contain', objectPosition: '50% 50%' },
  { filename: 'jimmy-donut.jpg', objectFit: 'contain', objectPosition: '50% 50%' },
] as const;

export function getJimmyPhotos(assets: Record<string, string>): JimmyPhoto[] {
  const photos = PHOTO_FRAMING.map(({ filename, objectFit, objectPosition }) => ({
    url: assets[`../assets/jimmy/${filename}`],
    objectFit,
    objectPosition,
  }));
  return photos.every((photo) => photo.url !== undefined)
    ? photos as JimmyPhoto[]
    : [];
}
