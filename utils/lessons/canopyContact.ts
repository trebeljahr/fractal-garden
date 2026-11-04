/**
 * A two-branch canopy's halves mirror each other across the line of the trunk. They meet exactly
 * where the right half reaches that line, and the gap between them is twice its distance from it.
 *
 * Where a route ends up depends only on its turns, so the search needs one entry per heading and
 * step, not one per branch. Angles are between the two branches, as in the figure. Lengths are in
 * trunks.
 */

/** How deep the figure draws. */
export const CANOPY_STEPS = 12;

/** Past this many steps, what is left of a route is too small for any readout to show. */
const FOREVER = 64;

/** For each heading and number of steps below it: how far toward the line a fork's branches get. */
function closestApproach(angle: number, ratio: number, below: number) {
  const half = (angle * Math.PI) / 360;
  const middle = below + 1;
  const size = 2 * middle + 1;
  const sideways = Array.from({ length: size }, (_, i) => Math.sin((i - middle) * half));
  const table = new Float64Array((below + 1) * size);
  for (let row = size; row < table.length; row += size) {
    for (let i = 1; i < size - 1; i++) {
      table[row + i] = Math.min(
        0,
        ratio * (sideways[i - 1] + table[row - size + i - 1]),
        ratio * (sideways[i + 1] + table[row - size + i + 1]),
      );
    }
  }
  return { half, middle, size, sideways, table };
}

/** The gap between the halves as drawn at this step. Negative once they cross. */
export function canopyGap(angle: number, ratio: number, step = FOREVER) {
  const { middle, size, sideways, table } = closestApproach(angle, ratio, step - 1);
  return 2 * ratio * (sideways[middle + 1] + table[(step - 1) * size + middle + 1]);
}

/** The length ratio at which the halves touch if the tree never stops. */
export function canopyTouchRatio(angle: number) {
  let apart = 0.3;
  let crossing = 0.8;
  for (let i = 0; i < 30; i++) {
    const middle = (apart + crossing) / 2;
    if (canopyGap(angle, middle) > 0) apart = middle;
    else crossing = middle;
  }
  return (apart + crossing) / 2;
}

/** The route through the right half that gets closest to the line, from the top of the trunk. */
export function canopyClosestRoute(angle: number, ratio: number, step = FOREVER) {
  const { half, middle, size, sideways, table } = closestApproach(angle, ratio, step - 1);
  const points = [{ x: 0, y: -1 }];
  let heading = 1;
  let length = ratio;
  for (let below = step - 1; ; below--) {
    const { x, y } = points[points.length - 1];
    points.push({
      x: x + Math.sin(heading * half) * length,
      y: y - Math.cos(heading * half) * length,
    });
    const here = middle + heading;
    if (below === 0 || table[below * size + here] === 0) return points;
    const row = (below - 1) * size;
    const left = sideways[here - 1] + table[row + here - 1];
    const right = sideways[here + 1] + table[row + here + 1];
    // Some angles have equally close routes. Take the one that climbs, away from the fork.
    const climbsLeft = Math.cos((heading - 1) * half) >= Math.cos((heading + 1) * half);
    heading += (Math.abs(left - right) < 1e-9 ? climbsLeft : left < right) ? -1 : 1;
    length *= ratio;
  }
}
