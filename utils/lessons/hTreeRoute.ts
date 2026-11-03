export const H_TREE_RATIO = Math.SQRT1_2;
/** The rectangle around the whole tree, measured in lengths of the first line. */
export const H_TREE_BOX = { halfWidth: 1, halfHeight: H_TREE_RATIO };

export type HTreePoint = [number, number];

export type HTreeRoute = {
  /** From the center of the tree to the tip, one point per line followed. */
  points: HTreePoint[];
  /** The part of each line the route follows. */
  pieces: number[];
  length: number;
  straight: number;
  /** The smallest rectangle around the tip. The tip is its center. */
  halfWidth: number;
  halfHeight: number;
};

/**
 * The route to the tip nearest a point. Each line joins the centers of the two halves of a
 * rectangle, so following the half that holds the point leads to the tip of the smallest
 * rectangle around it.
 */
export function hTreeRoute([x, y]: HTreePoint, round: number): HTreeRoute {
  const points: HTreePoint[] = [[0, 0]];
  const pieces: number[] = [];
  let [atX, atY] = [0, 0];
  let line = 1;
  let { halfWidth, halfHeight } = H_TREE_BOX;
  for (let depth = 0; depth <= round; depth++) {
    const piece = line / 2;
    if (depth % 2 === 0) {
      atX += x < atX ? -piece : piece;
      halfWidth /= 2;
    } else {
      atY += y < atY ? -piece : piece;
      halfHeight /= 2;
    }
    points.push([atX, atY]);
    pieces.push(piece);
    line *= H_TREE_RATIO;
  }
  return {
    points,
    pieces,
    length: pieces.reduce((sum, piece) => sum + piece, 0),
    straight: Math.hypot(atX, atY),
    halfWidth,
    halfHeight,
  };
}

/** No spot in the rectangle is farther than this from a tip: half the smallest rectangle's diagonal. */
export function hTreeFarthestSpot(round: number) {
  const { halfWidth, halfHeight } = hTreeRoute([0, 0], round);
  return Math.hypot(halfWidth, halfHeight);
}

export const hTreeTips = (round: number) => 2 ** (round + 1);
