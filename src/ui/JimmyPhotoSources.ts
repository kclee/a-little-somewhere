export interface JimmyPhoto {
  url: string;
  objectFit: 'cover' | 'contain';
  objectPosition: string;
}

// These private originals stay in art-inbox. Vite includes them only in local builds
// where the files exist; a source-only GitHub build does not publish them.
const PHOTO_FRAMING = [
  { filename: '2009_0818_161207.JPG', objectFit: 'cover', objectPosition: '80% 50%' },
  { filename: '20090312_103520_.JPG', objectFit: 'contain', objectPosition: '50% 50%' },
  { filename: '20090315_220217_.JPG', objectFit: 'contain', objectPosition: '50% 50%' },
] as const;

export function getJimmyPhotos(assets: Record<string, string>): JimmyPhoto[] {
  const photos = PHOTO_FRAMING.map(({ filename, objectFit, objectPosition }) => ({
    url: assets[`../../art-inbox/${filename}`],
    objectFit,
    objectPosition,
  }));
  return photos.every((photo) => photo.url !== undefined)
    ? photos as JimmyPhoto[]
    : [];
}
