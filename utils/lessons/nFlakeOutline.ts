export type Point = [number, number];

const TURN = Math.PI / 3;

function kochLine([ax, ay]: Point, [bx, by]: Point, round: number, out: Point[]) {
  if (round === 0) {
    out.push([bx, by]);
    return;
  }
  const dx = (bx - ax) / 3;
  const dy = (by - ay) / 3;
  const first: Point = [ax + dx, ay + dy];
  const last: Point = [ax + 2 * dx, ay + 2 * dy];
  // A positive turn on the canvas is clockwise. Walking clockwise round the hexagon, that is
  // towards its middle.
  const tip: Point = [
    first[0] + dx * Math.cos(TURN) - dy * Math.sin(TURN),
    first[1] + dx * Math.sin(TURN) + dy * Math.cos(TURN),
  ];
  kochLine([ax, ay], first, round - 1, out);
  kochLine(first, tip, round - 1, out);
  kochLine(tip, last, round - 1, out);
  kochLine(last, [bx, by], round - 1, out);
}

/**
 * The Koch rule applied to each side of a hexagon with its first corner at the top and a corner
 * radius of 1. It knows nothing about the flake, so it can be laid over the flake as a test.
 * Returns the closed outline, starting at the top corner.
 */
export function hexagonKochOutline(round: number): Point[] {
  const corner = (index: number): Point => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 3;
    return [Math.cos(angle), Math.sin(angle)];
  };
  const outline: Point[] = [corner(0)];
  for (let side = 0; side < 6; side++) kochLine(corner(side), corner(side + 1), round, outline);
  return outline;
}

export const outlineLines = (round: number) => 6 * 4 ** round;
export const outlineLineLength = (round: number) => 3 ** -round;
