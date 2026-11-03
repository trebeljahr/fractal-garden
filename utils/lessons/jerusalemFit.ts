/** The one corner cube width where corner, edge and corner cubes fill an edge exactly. */
export const JERUSALEM_FIT = Math.SQRT2 - 1;

// The slider moves in thousandths, so it needs help to land on an irrational number.
const SNAP = 0.002;
export const snapToFit = (k: number) => (Math.abs(k - JERUSALEM_FIT) < SNAP ? JERUSALEM_FIT : k);

export const edgeCube = (k: number) => k * k;
/** What a corner cube, an edge cube and a corner cube add up to, on an edge of length 1. */
export const edgeTotal = (k: number) => 2 * k + edgeCube(k);

export type FaceSquare = { x: number; y: number; size: number };

const AT = [0, 1];

/** The corner squares and edge squares on one face, which runs from 0 to 1 each way. */
export function jerusalemFace(k: number) {
  const small = edgeCube(k);
  const middle = (1 - small) / 2;
  const far = (size: number) => 1 - size;
  const corners: FaceSquare[] = AT.flatMap((i) =>
    AT.map((j) => ({ x: i * far(k), y: j * far(k), size: k })),
  );
  const edges: FaceSquare[] = AT.flatMap((i) => [
    { x: middle, y: i * far(small), size: small },
    { x: i * far(small), y: middle, size: small },
  ]);
  // Each corner square's own corner squares, the next round's pieces.
  const next: FaceSquare[] = corners.flatMap((corner) =>
    AT.flatMap((i) =>
      AT.map((j) => ({
        x: corner.x + i * (k - small),
        y: corner.y + j * (k - small),
        size: small,
      })),
    ),
  );
  return { corners, edges, next };
}

/**
 * The stretches along each edge that a corner square and the edge square should meet at but
 * don't: gaps when the three are too short, overlaps when they are too long. Each runs along an
 * edge from `from` to `to` and is as deep as the edge square.
 */
export function edgeMisfits(k: number) {
  const small = edgeCube(k);
  const left: [number, number] = [Math.min(k, (1 - small) / 2), Math.max(k, (1 - small) / 2)];
  const right: [number, number] = [1 - left[1], 1 - left[0]];
  if (Math.abs(k - JERUSALEM_FIT) < 1e-12) return { depth: small, stretches: [] };
  return { depth: small, stretches: [left, right] };
}
