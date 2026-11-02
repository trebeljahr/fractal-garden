// Star fractal geometry. No DOM access here: the drawing runs in the render worker.

export type StarSettings = {
  points: number;
  skip: number;
  ratio: number;
  offset: number;
  rotation: number;
};

export const STAR_MAX_STARS = 120000;

/** The scale at which copies on neighboring tips, with all their smaller copies, just touch. */
export function touchingRatio(points: number) {
  let sum = 0;
  for (let k = 1; k <= Math.floor(points / 4); k++) sum += Math.cos((2 * Math.PI * k) / points);
  return 1 / (2 * (1 + sum));
}

export function largestStarDepth(points: number) {
  let depth = 0;
  let stars = 1;
  while (stars * points <= STAR_MAX_STARS && depth < 9) {
    stars *= points;
    depth++;
  }
  return depth;
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

/** A star's tips, in unit-circle coordinates, one tip pointing up. */
export function starTips({ points, rotation }: Pick<StarSettings, "points" | "rotation">) {
  return Array.from({ length: points }, (_, tip): [number, number] => {
    const angle = ((rotation - 90) * Math.PI) / 180 + (2 * Math.PI * tip) / points;
    return [Math.cos(angle), Math.sin(angle)];
  });
}

/** The closed lines of one star: {5/2} is one loop, {6/2} is two triangles. */
export function starLoops({ points, skip }: Pick<StarSettings, "points" | "skip">) {
  const step = Math.max(1, Math.min(skip, points - 1));
  const loops = greatestCommonDivisor(points, step);
  return Array.from({ length: loops }, (_, start) =>
    Array.from({ length: points / loops }, (_, index) => (start + index * step) % points),
  );
}

export type Star = { x: number; y: number; radius: number; depth: number };

/** Every star up to `depth`, largest first. The root star has radius 1. */
export function buildStars(settings: StarSettings, depth: number, keep = (_: Star) => true) {
  const tips = starTips(settings);
  const stars: Star[] = [];
  const add = (x: number, y: number, radius: number, level: number) => {
    const star = { x, y, radius, depth: level };
    if (!keep(star)) return;
    stars.push(star);
    if (level === depth) return;
    const reach = radius * settings.offset;
    for (const [tipX, tipY] of tips)
      add(x + reach * tipX, y + reach * tipY, radius * settings.ratio, level + 1);
  };
  add(0, 0, 1, 0);
  return stars;
}

/** The farthest any star can reach from the center, adding one size per level. */
export function starReach(
  { ratio, offset }: Pick<StarSettings, "ratio" | "offset">,
  depth: number,
) {
  if (depth === 0) return 1;
  let reach = 1;
  let radius = 1;
  let center = 0;
  for (let level = 1; level <= depth; level++) {
    center += radius * offset;
    radius *= ratio;
    reach = Math.max(reach, center + radius);
  }
  return reach;
}

/** Path-friendly star outlines, in star coordinates. */
export function traceStars(
  path: {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
  },
  stars: Star[],
  settings: StarSettings,
  place: (x: number, y: number) => [number, number],
) {
  const tips = starTips(settings);
  const loops = starLoops(settings);
  for (const star of stars) {
    for (const loop of loops) {
      loop.forEach((tip, index) => {
        const [x, y] = place(
          star.x + star.radius * tips[tip][0],
          star.y + star.radius * tips[tip][1],
        );
        if (index === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
      path.closePath();
    }
  }
}
