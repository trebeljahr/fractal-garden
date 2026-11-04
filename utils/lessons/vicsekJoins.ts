import type { ConstructionLead } from "../constructionLead";
import { VICSEK_OFFSETS, type VicsekVariant } from "../render/drawings/vicsekFractal2D";

export type VicsekSquare = [number, number];

/** The squares a level keeps, as cells of a grid 3^level squares wide. */
export function vicsekSquares(variant: VicsekVariant, level: number) {
  let squares: VicsekSquare[] = [[0, 0]];
  for (let i = 0; i < level; i++)
    squares = squares.flatMap(([x, y]) =>
      VICSEK_OFFSETS[variant].map(([ox, oy]): VicsekSquare => [3 * x + ox, 3 * y + oy]),
    );
  return squares;
}

/** For each square, the squares it touches: at a corner in the diagonal cross, along a side in the Greek cross. */
export function vicsekNeighbors(variant: VicsekVariant, squares: VicsekSquare[]) {
  const index = new Map(squares.map(([x, y], i) => [`${x},${y}`, i]));
  const reach =
    variant === "saltire"
      ? [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
  return squares.map(([x, y]) =>
    reach.flatMap(([dx, dy]) => index.get(`${x + dx},${y + dy}`) ?? []),
  );
}

/**
 * What is left after taking one square out: each other square's piece, with piece 0 the largest,
 * and -1 for the square taken out.
 */
export function vicsekPieces(neighbors: number[][], removed: number) {
  const piece = new Int32Array(neighbors.length).fill(-2);
  piece[removed] = -1;
  const sizes: number[] = [];
  for (let start = 0; start < neighbors.length; start++) {
    if (piece[start] !== -2) continue;
    const label = sizes.length;
    const stack = [start];
    piece[start] = label;
    let size = 0;
    while (stack.length) {
      size++;
      for (const next of neighbors[stack.pop() as number])
        if (piece[next] === -2) {
          piece[next] = label;
          stack.push(next);
        }
    }
    sizes.push(size);
  }
  const order = sizes.map((_, label) => label).sort((a, b) => sizes[b] - sizes[a]);
  const rank = new Int32Array(sizes.length);
  order.forEach((label, position) => {
    rank[label] = position;
  });
  return {
    piece: Array.from(piece, (label) => (label < 0 ? -1 : rank[label])),
    count: sizes.length,
  };
}

/** The square nearest a point, with the whole picture 0 to 1 across. */
export function nearestVicsekSquare(squares: VicsekSquare[], level: number, x: number, y: number) {
  const width = 3 ** level;
  let best = 0;
  let distance = Infinity;
  squares.forEach(([cellX, cellY], i) => {
    const away = ((cellX + 0.5) / width - x) ** 2 + ((cellY + 0.5) / width - y) ** 2;
    if (away < distance) {
      best = i;
      distance = away;
    }
  });
  return best;
}

export const VICSEK_LEAD: ConstructionLead = {
  control: {
    kind: "options",
    path: "variant",
    label: "Layout",
    options: [
      { value: "saltire", label: "Diagonal cross" },
      { value: "cross", label: "Greek cross" },
    ],
  },
  readout: (view, level) => [
    { label: "Squares", value: (5 ** level).toLocaleString("en-US") },
    {
      label: "Joined at",
      value: `${(5 ** level - 1).toLocaleString("en-US")} ${view.variant === "cross" ? "sides" : "corners"}`,
    },
  ],
};
