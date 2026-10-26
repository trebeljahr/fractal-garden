export type ConnectionPoint = { cr: number; ci: number; zr: number };

export const CONNECTION_SKIP = 768;
export const CONNECTION_KEEP = 96;
export const CONNECTION_LIMIT = CONNECTION_SKIP + CONNECTION_KEEP;

export const logisticParameter = (c: number) => 1 + Math.sqrt(1 - 4 * c);
export const quadraticParameter = (r: number) => (r * (2 - r)) / 4;
export const logisticValue = (r: number, z: number) => 0.5 - z / r;

/** Critical orbit, tested through the last retained step. Finite nonescape is not a proof. */
export function boundedOrbit(
  cr: number,
  ci: number,
  skip = CONNECTION_SKIP,
  keep = CONNECTION_KEEP,
) {
  const values: number[] = [];
  let zr = 0;
  let zi = 0;
  for (let n = 0; n < skip + keep; n++) {
    const next = zr * zr - zi * zi + cr;
    zi = 2 * zr * zi + ci;
    zr = next;
    if (!Number.isFinite(zr + zi) || zr * zr + zi * zi > 4) return null;
    if (n >= skip) values.push(zr);
  }
  return values;
}

export function buildConnectionCloud() {
  const cloud: ConnectionPoint[] = [];
  const slice: ConnectionPoint[] = [];
  // Cell centers avoid the exceptional critical orbit at c=-2. The real slice
  // is sampled separately: random complex parameters almost never have ci=0.
  for (let column = 0; column < 1100; column++) {
    const cr = -2 + (2.25 * (column + 0.5)) / 1100;
    const orbit = boundedOrbit(cr, 0);
    if (orbit) for (const zr of orbit) slice.push({ cr, ci: 0, zr });
  }
  for (let row = 0; row < 170; row++) {
    const ci = -1.15 + (2.3 * (row + 0.5)) / 170;
    for (let column = 0; column < 240; column++) {
      const cr = -2 + (2.5 * (column + 0.5)) / 240;
      const orbit = boundedOrbit(cr, ci);
      if (!orbit) continue;
      // Test the entire route, then keep twelve consecutive late visits.
      // A stride of eight would erase phases of two-, four- and eight-cycles.
      // Every camera angle uses the same points.
      for (const zr of orbit.slice(-12)) cloud.push({ cr, ci, zr });
    }
  }
  return { cloud, slice };
}

export function connectionProjection(degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return (point: ConnectionPoint) => ({ x: point.cr, y: point.ci * cos + point.zr * sin });
}
