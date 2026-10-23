export const TRIANGLE_HEIGHT = Math.sqrt(3) / 2;
export const MAX_SEED_STEP = 8;
export const SEED_SHAPES = ["Triangle", "Square", "Circle", "Fish"] as const;
export type SeedShape = (typeof SEED_SHAPES)[number];
export type SeedCopy = { x: number; y: number; scale: number };
export type SeedPoint = [number, number];
export const SEED_ANCHORS: SeedPoint[] = [
  [0, TRIANGLE_HEIGHT],
  [1, TRIANGLE_HEIGHT],
  [0.5, 0],
];

// Each map moves every point halfway towards one fixed triangle corner.
export function sierpinskiSeedCopies(step: number): SeedCopy[] {
  if (!Number.isInteger(step) || step < 0 || step > MAX_SEED_STEP)
    throw new Error("Seed step must be an integer from zero through eight.");
  let copies: SeedCopy[] = [{ x: 0, y: 0, scale: 1 }];
  for (let level = 0; level < step; level++) {
    copies = copies.flatMap((copy) =>
      SEED_ANCHORS.map(([x, y]) => ({
        x: copy.x + (copy.scale * x) / 2,
        y: copy.y + (copy.scale * y) / 2,
        scale: copy.scale / 2,
      })),
    );
  }
  return copies;
}

export function seedPointInCopy(point: SeedPoint, copy: SeedCopy): SeedPoint {
  return [copy.x + point[0] * copy.scale, copy.y + point[1] * copy.scale];
}
