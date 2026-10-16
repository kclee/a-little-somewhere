import { describe, expect, it } from 'vitest';
import { getJimmyPhotos } from './JimmyPhotoSources';

describe('Jimmy photo sources', () => {
  const photos = {
    '../assets/jimmy/jimmy-outdoors.jpg': '/outdoor.jpg',
    '../assets/jimmy/jimmy-house.jpg': '/house.jpg',
    '../assets/jimmy/jimmy-donut.jpg': '/donut.jpg',
  };

  it('keeps the three approved photos in a stable column order', () => {
    expect(getJimmyPhotos(photos).map((photo) => photo.url)).toEqual([
      '/outdoor.jpg', '/house.jpg', '/donut.jpg',
    ]);
  });

  it('uses individual crop framing without altering the source images', () => {
    expect(getJimmyPhotos(photos).map((photo) => photo.objectFit)).toEqual([
      'cover', 'contain', 'contain',
    ]);
    expect(getJimmyPhotos(photos).map((photo) => photo.objectPosition)).toEqual([
      '80% 50%', '50% 50%', '50% 50%',
    ]);
  });

  it('hides an incomplete gallery instead of showing broken images', () => {
    expect(getJimmyPhotos({ '../assets/jimmy/jimmy-outdoors.jpg': '/outdoor.jpg' })).toEqual([]);
  });
});
