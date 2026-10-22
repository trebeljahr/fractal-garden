export type FernPoint = { x: number; y: number };

// a, b, c, d, e, f, probability: x' = ax + by + e; y' = cx + dy + f.
export const CLASSIC_FERN_MATRIX = [
  [0, 0, 0, 0.16, 0, 0, 0.01],
  [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85],
  [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07],
  [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07],
];

export function applyFernRule(point: FernPoint, rule: number): FernPoint {
  const [a, b, c, d, e, f] = CLASSIC_FERN_MATRIX[rule];
  return { x: a * point.x + b * point.y + e, y: c * point.x + d * point.y + f };
}

export function chooseFernRule(random: number) {
  // Same ordering and boundaries as the full explorer.
  let boundary = 0;
  for (const rule of [1, 2, 3, 0]) {
    boundary += CLASSIC_FERN_MATRIX[rule][6];
    if (random <= boundary) return rule;
  }
  return 0;
}

export function traceFern(count: number, seed = 28) {
  const points: { point: FernPoint; rule: number | null }[] = [
    { point: { x: 0, y: 0 }, rule: null },
  ];
  let state = seed >>> 0;
  for (let i = 0; i < count; i++) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    const rule = chooseFernRule(state / 4294967296);
    points.push({ point: applyFernRule(points[i].point, rule), rule });
  }
  return points;
}
