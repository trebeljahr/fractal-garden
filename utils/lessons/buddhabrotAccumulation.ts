import type { histogramOrbit, OrbitPoint } from "./specialLessons";

export const HISTOGRAM_WIDTH = 80;
export const HISTOGRAM_HEIGHT = 60;
export type RecordedOrbit = ReturnType<typeof histogramOrbit>;

export function visitBin(point: OrbitPoint) {
  const x = Math.floor(((point.x + 2) / 4) * HISTOGRAM_WIDTH);
  const y = Math.floor(((1.5 - point.y) / 3) * HISTOGRAM_HEIGHT);
  return x >= 0 && x < HISTOGRAM_WIDTH && y >= 0 && y < HISTOGRAM_HEIGHT
    ? y * HISTOGRAM_WIDTH + x
    : -1;
}

export function accumulateOrbits(orbits: readonly RecordedOrbit[]) {
  const cells = new Uint32Array(HISTOGRAM_WIDTH * HISTOGRAM_HEIGHT);
  let escaped = 0;
  let visits = 0;
  for (const orbit of orbits) {
    if (!orbit.escaped) continue;
    escaped++;
    for (const point of orbit.points) {
      const bin = visitBin(point);
      if (bin < 0) continue;
      cells[bin]++;
      visits++;
    }
  }
  return { cells, escaped, visits };
}

// Fixed exposure: adding visits never makes another occupied bin dimmer.
export const visitOpacity = (count: number) => 1 - Math.exp(-count / 4);
