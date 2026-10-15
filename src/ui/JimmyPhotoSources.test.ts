import { describe, expect, it } from 'vitest';
import { getJimmyPhotos } from './JimmyPhotoSources';

describe('Jimmy photo sources', () => {
  const photos = {
    '../../art-inbox/2009_0818_161207.JPG': '/outdoor.jpg',
    '../../art-inbox/20090312_103520_.JPG': '/house.jpg',
    '../../art-inbox/20090315_220217_.JPG': '/donut.jpg',
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

  it('hides an incomplete private gallery instead of showing broken images', () => {
    expect(getJimmyPhotos({ '../../art-inbox/2009_0818_161207.JPG': '/outdoor.jpg' })).toEqual([]);
  });
});
