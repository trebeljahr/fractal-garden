export type RomanescoVector = [number, number, number];
type Vec3 = RomanescoVector;
export type RomanescoTransform = {
  center: Vec3;
  scale: number;
  /** Orthogonal columns, including the uniform scale. */
  axes: [Vec3, Vec3, Vec3];
};

export const ROMANESCO_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const ROMANESCO_RADIUS = 0.65;
export const ROMANESCO_PLACEMENT_RADIUS = 1.15;
export const ROMANESCO_SPIRAL_DECAY = 0.015;
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
export const ROMANESCO_CHILDREN: RomanescoTransform[] = Array.from({ length: 233 }, (_, index) => {
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
  return { center: tip.map((v, i) => v - axes[1][i]) as Vec3, scale, axes };
});

/**
 * For every child, |centre| + scale * bound <= bound. Together with the seed
 * bound, this contains every descendant by induction, including unseen detail.
 */
export const ROMANESCO_BOUND =
  Math.max(
    Math.hypot(ROMANESCO_RADIUS, 1),
    ...ROMANESCO_CHILDREN.map(({ center, scale }) => Math.hypot(...center) / (1 - scale)),
  ) + 1e-6;
