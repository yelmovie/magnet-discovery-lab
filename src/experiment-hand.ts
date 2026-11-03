import type { Point } from './domain';

export const handImages = {
  held: '/assets/quest/experiment-hand-held.webp',
  released: '/assets/quest/experiment-hand-released.webp',
} as const;

// The pinch point, rather than the image centre, touches the object.
// Open fingers lift away before the magnetic movement starts.
export function handPose(contact: Point, release: number, size = 152) {
  const t = Math.min(1, Math.max(0, release));
  return {
    image: t > 0 ? handImages.released : handImages.held,
    x: contact.x * 12.8 - size * .114 + t * 24,
    y: contact.y * 7.2 - size * .89 - t * 23,
    size,
    alpha: 1 - t * .42,
  };
}

export const handRelease = (time: number) => Math.min(1, time / .18);
export const afterHandRelease = (time: number) => Math.min(1, Math.max(0, (time - .18) / .82));
