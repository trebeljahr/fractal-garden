export type RomanescoVector = [number, number, number];
type Vec3 = RomanescoVector;
export type RomanescoTransform = {
  center: Vec3;
  scale: number;
  rank?: number;
  continuation?: boolean;
  baseCover?: boolean;
  /** Orthogonal columns, including the uniform scale. */
  axes: [Vec3, Vec3, Vec3];
};

export const ROMANESCO_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const ROMANESCO_RADIUS = 0.7475;
export const ROMANESCO_PLACEMENT_RADIUS = 1.3225;
export const ROMANESCO_BOUND_BASE = -1.62;
export const ROMANESCO_SPIRAL_DECAY = 0.015;
export const ROMANESCO_SPIRAL_BLOCK = 89;
const identity = (scale: number): [Vec3, Vec3, Vec3] => [
  [scale, 0, 0],
  [0, scale, 0],
  [0, 0, scale],
];
export const ROMANESCO_ROOT: RomanescoTransform = {
  center: [0, 0.12, 0],
  scale: 1.25,
  axes: identity(1.25),
};
export const romanescoVector = (transform: RomanescoTransform, point: Vec3): Vec3 =>
  [0, 1, 2].map(
    (i) =>
      transform.axes[0][i] * point[0] +
      transform.axes[1][i] * point[1] +
      transform.axes[2][i] * point[2],
  ) as Vec3;
export const romanescoPoint = (transform: RomanescoTransform, point: Vec3): Vec3 =>
  romanescoVector(transform, point).map((v, i) => v + transform.center[i]) as Vec3;
export const composeRomanesco = (
  parent: RomanescoTransform,
  child: RomanescoTransform,
): RomanescoTransform => ({
  center: romanescoPoint(parent, child.center),
  scale: parent.scale * child.scale,
  axes: child.axes.map((axis) => romanescoVector(parent, axis)) as [Vec3, Vec3, Vec3],
  rank: (parent.rank ?? 0) + (child.rank ?? 1),
  continuation: child.continuation,
  baseCover: child.baseCover,
});

/**
 * A logarithmic conical lattice. Its closest neighbour chains have index steps
 * eight and thirteen, giving two opposing Fibonacci spiral families. Every floret
 * repeats this same arrangement in its own coordinate system.
 * The seed core is narrower than the placement envelope; embedded child bases
 * and their smaller copies cover it with closely packed, connected florets.
 */
export const ROMANESCO_CHILD_TILT = (20 * Math.PI) / 180;
export const ROMANESCO_CHILD_RATIO = 0.45;
export function romanescoSpiralChild(index: number): RomanescoTransform {
  const ct = Math.cos(ROMANESCO_CHILD_TILT),
    st = Math.sin(ROMANESCO_CHILD_TILT);
  const ratio = ROMANESCO_CHILD_RATIO;
  const remaining =
    Math.exp(-index * ROMANESCO_SPIRAL_DECAY) /
    (1 + ratio * ct + (ratio * ROMANESCO_PLACEMENT_RADIUS * st) / 2);
  const scale = ratio * remaining;
  const angle = index * ROMANESCO_GOLDEN_ANGLE;
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const radial = ROMANESCO_PLACEMENT_RADIUS * remaining;
  const axes: [Vec3, Vec3, Vec3] = [
    [scale * ct * c, -scale * st, scale * ct * s],
    [scale * st * c, scale * ct, scale * st * s],
    [-scale * s, 0, scale * c],
  ];
  const tip: Vec3 = [radial * c, 1 - 2 * remaining, radial * s];
  // Anchor the tip, then lean the axis outward. The whole base disk stays
  // inside the parent envelope; the largest child's lowest base point is -1.
  return { center: tip.map((v, i) => v - axes[1][i]) as Vec3, scale, axes, rank: 1 };
}
export const ROMANESCO_SPIRAL_CHILDREN = Array.from(
  { length: ROMANESCO_SPIRAL_BLOCK },
  (_, index) => romanescoSpiralChild(index),
);

// A homothety about the apex continues exactly where the finite block ends:
// tail(child(n)) = child(n + block). It adds no core or underside of its own.
const tailScale = Math.exp(-ROMANESCO_SPIRAL_BLOCK * ROMANESCO_SPIRAL_DECAY);
const tailAngle = ROMANESCO_SPIRAL_BLOCK * ROMANESCO_GOLDEN_ANGLE;
export const ROMANESCO_APEX_TAIL: RomanescoTransform = {
  center: [0, 1 - tailScale, 0],
  scale: tailScale,
  axes: [
    [tailScale * Math.cos(tailAngle), 0, tailScale * Math.sin(tailAngle)],
    [0, tailScale, 0],
    [-tailScale * Math.sin(tailAngle), 0, tailScale * Math.cos(tailAngle)],
  ],
  rank: 0,
  continuation: true,
};

// At y=-1 these three groups cover the whole base disk. The outer ring covers
// radii [.546, 1.008]R, the inner [.112, .628]R and the central bud [0, .13]R.
// Their base planes sit .01 above the parent base, giving positive overlap.
const baseBud = (radial: number, radius: number, angle: number): RomanescoTransform => {
  const scale = radius + 0.005,
    c = Math.cos(angle),
    s = Math.sin(angle);
  return {
    center: [radial * ROMANESCO_RADIUS * c, -1 - 2 * radius + scale, radial * ROMANESCO_RADIUS * s],
    scale,
    axes: [
      [scale * c, 0, scale * s],
      [0, -scale, 0],
      [scale * s, 0, -scale * c],
    ],
    rank: 1,
    baseCover: true,
  };
};
export const ROMANESCO_BASE_CHILDREN: RomanescoTransform[] = [
  ...Array.from({ length: 13 }, (_, i) => baseBud(0.8, 0.3, (i * 2 * Math.PI) / 13)),
  ...Array.from({ length: 8 }, (_, i) => baseBud(0.4, 0.3, ((i + 0.5) * 2 * Math.PI) / 8)),
  baseBud(0, 0.13, 0),
];
export const ROMANESCO_CHILDREN = [
  ...ROMANESCO_SPIRAL_CHILDREN,
  ROMANESCO_APEX_TAIL,
  ...ROMANESCO_BASE_CHILDREN,
];

/** Bound the horizontal projection of every transformed envelope disk. */
export function romanescoEnvelopeRadialBound(radius: number) {
  const slope = ROMANESCO_PLACEMENT_RADIUS / 2,
    join = 1 - radius / slope;
  return Math.max(
    ROMANESCO_RADIUS,
    ...ROMANESCO_CHILDREN.flatMap((child) =>
      [
        [1, 0],
        [join, radius],
        [ROMANESCO_BOUND_BASE, radius],
      ].map(
        ([y, r]) =>
          Math.hypot(
            child.center[0] + y * child.axes[1][0],
            child.center[2] + y * child.axes[1][2],
          ) +
          child.scale * r,
      ),
    ),
  );
}

// The capped cone is the convex hull of its apex and two circular disks.
// Accept a tighter cap only after checking that it still contains every child
// envelope. The positive margin also leaves room for Float32 packing.
export const ROMANESCO_BOUND_CYLINDER_RADIUS = (() => {
  let radius = (ROMANESCO_PLACEMENT_RADIUS * (1 - ROMANESCO_BOUND_BASE)) / 2;
  for (let i = 0; i < 32; i++) {
    const candidate = romanescoEnvelopeRadialBound(radius) + 1e-5;
    if (candidate >= radius || romanescoEnvelopeRadialBound(candidate) > candidate) break;
    radius = candidate;
  }
  return radius;
})();

/**
 * For every child, |centre| + scale * bound <= bound. Together with the seed
 * bound, this contains every descendant by induction, including unseen detail.
 */
export const ROMANESCO_BOUND =
  Math.max(
    Math.hypot(ROMANESCO_RADIUS, 1),
    ...ROMANESCO_CHILDREN.map(({ center, scale }) => Math.hypot(...center) / (1 - scale)),
  ) + 1e-6;
