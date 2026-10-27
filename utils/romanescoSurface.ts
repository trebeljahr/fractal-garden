export type RomanescoSurfacePoint = readonly [number, number, number];
export type RomanescoSurfacePatchPoint = readonly [number, number];

/** Constants shared by the CPU reference and the radial-surface shader. */
export const ROMANESCO_SURFACE_MODEL = Object.freeze({
  tau: 6.283185307179586,
  goldenTurn: 0.38196601125010515,
  spiralDecay: 0.015,
  latticeA: 0.03444185374863303,
  latticeB: 0.05572809000084122,
  hexCover: 0.5773502691896258,
  sqrtThreeOverTwo: 0.8660254037844386,
  patchEpsilon: 0.06,
  rimWidth: 0.25,
  baseRadius: 0.86,
  reliefHeight: 0.13,
  baseDepth: 0.28,
  primaryShear: 0.63,
  sideLipschitz: 2.75,
  bottomLipschitz: 2.0,
  defaultLevels: 64,
  minimumRadius: 1e-300,
  pixelCutoff: 0.03125,
  /** Field-error allowance per local pixel when positive relief tails are skipped. */
  pixelTailBound: 0.026,
} as const);

export type RomanescoSurfaceOptions = {
  /** Highest visible construction rank. Rank zero is the undecorated carrier. */
  maxRank?: number;
  /** Height of the newest rank, from zero to one. Earlier ranks remain full size. */
  growth?: number;
  /** Local-space pixel width. Zero evaluates every requested finite level. */
  pixel?: number;
  /** Number of hexagonal relief levels, independently of the construction rank. */
  levels?: number;
};

type Parameters = Required<RomanescoSurfaceOptions>;
const MODEL = ROMANESCO_SURFACE_MODEL;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function parameters(options: RomanescoSurfaceOptions): Parameters {
  const maxRank = options.maxRank ?? Infinity;
  const growth = options.growth ?? 1;
  const pixel = options.pixel ?? 0;
  const levels = options.levels ?? MODEL.defaultLevels;
  if (!(maxRank >= 0) || (maxRank !== Infinity && !Number.isFinite(maxRank)))
    throw new RangeError("Romanesco construction rank must be nonnegative.");
  if (!Number.isFinite(growth)) throw new RangeError("Romanesco growth must be finite.");
  if (!Number.isFinite(pixel) || pixel < 0)
    throw new RangeError("Romanesco pixel width must be finite and nonnegative.");
  if (!Number.isSafeInteger(levels) || levels < 0)
    throw new RangeError("Romanesco relief levels must be a nonnegative integer.");
  return { maxRank, growth: clamp(growth, 0, 1), pixel, levels };
}

/** Nearest hexagonal cell in the golden-angle logarithmic lattice. */
export function romanescoSurfaceCell(radius: number, angle: number): [number, number] {
  const u = -Math.log(Math.max(radius, MODEL.minimumRadius)) / MODEL.spiralDecay;
  const v = angle / MODEL.tau;
  const a = MODEL.latticeA * u + 13 * v;
  const b = MODEL.latticeB * u - 8 * v;
  const cube = [a, -b, -a + b];
  // floor(x + .5), including negative ties, matches the shader's cube rounding.
  const rounded = cube.map((value) => Math.floor(value + 0.5));
  const error = rounded.map((value, index) => Math.abs(value - cube[index]));
  if (error[0] > error[1] && error[0] > error[2]) rounded[0] = -rounded[1] - rounded[2];
  else if (error[1] > error[2]) rounded[1] = -rounded[0] - rounded[2];
  else rounded[2] = -rounded[0] - rounded[1];
  const x = a - rounded[0];
  const y = b + rounded[1];
  return [(x - 0.5 * y) / MODEL.hexCover, (MODEL.sqrtThreeOverTwo * y) / MODEL.hexCover];
}

/** Only the nested contribution vanishes at hex-cell edges; the primary peak remains. */
export function romanescoSurfaceHexRim(point: RomanescoSurfacePatchPoint): number {
  const x = point[0] * MODEL.hexCover;
  const y = point[1] * MODEL.hexCover;
  const support = Math.max(
    Math.abs(x),
    Math.abs(0.5 * x + MODEL.sqrtThreeOverTwo * y),
    Math.abs(-0.5 * x + MODEL.sqrtThreeOverTwo * y),
  );
  return clamp((0.5 - support) / MODEL.rimWidth, 0, 1);
}

function patchHeight(
  point: RomanescoSurfacePatchPoint,
  amplitude: number,
  firstRank: number,
  options: Parameters,
): number {
  let p = point;
  let value = 0;
  let weight = 1;
  for (let level = 0; level < options.levels; level++) {
    const rank = firstRank + level;
    if (rank > options.maxRank) break;
    const radius = Math.min(1, Math.sqrt(p[0] * p[0] + p[1] * p[1]));
    const growth = rank > 0 && rank === options.maxRank ? options.growth : 1;
    value += weight * (1 - radius) * growth;
    weight *= MODEL.patchEpsilon * radius * romanescoSurfaceHexRim(p);
    if (radius <= MODEL.minimumRadius || weight * amplitude <= options.pixel * MODEL.pixelCutoff)
      break;
    p = romanescoSurfaceCell(radius, Math.atan2(p[1], p[0]));
  }
  return value;
}

export function romanescoSurfacePatchHeight(
  point: RomanescoSurfacePatchPoint,
  amplitude = 1,
  options: RomanescoSurfaceOptions = {},
  firstRank = 1,
): number {
  return patchHeight(point, amplitude, firstRank, parameters(options));
}

function diskHeight(point: RomanescoSurfacePatchPoint, amplitude: number, options: Parameters) {
  const radius = Math.sqrt(point[0] * point[0] + point[1] * point[1]);
  if (radius >= 1) return 0;
  const base = 1 - radius;
  if (options.maxRank < 1 || radius <= MODEL.minimumRadius) return base;
  const weight = MODEL.patchEpsilon * radius * Math.min(1, (1 - radius) / MODEL.rimWidth);
  if (weight * amplitude <= options.pixel * MODEL.pixelCutoff) return base;
  return (
    base +
    weight *
      patchHeight(
        romanescoSurfaceCell(radius, Math.atan2(point[1], point[0])),
        amplitude * weight,
        1,
        options,
      )
  );
}

export function romanescoSurfaceDiskHeight(
  point: RomanescoSurfacePatchPoint,
  amplitude: number = MODEL.baseDepth,
  options: RomanescoSurfaceOptions = {},
): number {
  return diskHeight(point, amplitude, parameters(options));
}

/**
 * Tilt the primary heads upward while leaving the base ring fixed. The clamp
 * changes only the off-surface extension: every side zero lies in this band.
 */
export function romanescoSurfacePrimaryHeight(h: number, radial: number): number {
  if (h <= 0) return 0;
  if (h >= 1) return h;
  const h3 = h * h * h;
  const shear = MODEL.primaryShear * (1 - h3 * h);
  const delta = clamp(radial - MODEL.baseRadius * h, 0, MODEL.reliefHeight * h);
  return h + shear * delta;
}

function ringRadius(angle: number, options: Parameters) {
  if (options.maxRank < 1) return MODEL.baseRadius;
  return (
    MODEL.baseRadius +
    MODEL.reliefHeight * patchHeight(romanescoSurfaceCell(1, angle), MODEL.reliefHeight, 1, options)
  );
}

export function romanescoSurfaceRingRadius(
  angle: number,
  options: RomanescoSurfaceOptions = {},
): number {
  return ringRadius(angle, parameters(options));
}

/**
 * Signed lower-distance field in canonical root coordinates. The side and
 * underside inequalities use their own Lipschitz bounds before taking max.
 * This is the requested finite-level model, not an infinite-tail approximation.
 * With pixel pruning, subtract pixelTailBound * pixel before using its magnitude
 * as a safe step. Collision clearance below always evaluates with pixel zero.
 */
export function romanescoSurfaceField(
  point: RomanescoSurfacePoint,
  options: RomanescoSurfaceOptions = {},
): number {
  const config = parameters(options);
  const [x, y, z] = point;
  const radial = Math.sqrt(x * x + z * z);
  const angle = radial > MODEL.minimumRadius ? Math.atan2(z, x) : 0;
  const h = Math.max(0, (1 - y) * 0.5);
  const amplitude = MODEL.reliefHeight * Math.min(h, radial / MODEL.baseRadius);
  let top = 0;
  if (config.maxRank >= 1 && amplitude > config.pixel * MODEL.pixelCutoff)
    top = patchHeight(
      romanescoSurfaceCell(romanescoSurfacePrimaryHeight(h, radial), angle),
      amplitude,
      1,
      config,
    );
  const side = (radial - MODEL.baseRadius * h - amplitude * top) / MODEL.sideLipschitz;
  let bottom: number;
  if (y >= -1 && side >= 0) {
    // Here the underside cannot change the sign or reduce the safe side step.
    bottom = -1;
  } else {
    const ring = ringRadius(angle, config);
    const depth = diskHeight([x / ring, z / ring], MODEL.baseDepth, config);
    bottom = (-1 - MODEL.baseDepth * depth - y) / MODEL.bottomLipschitz;
  }
  return Math.max(y - 1, side, bottom);
}

/** Local-space safe-ball radius for this finite model; never use pixel-pruned relief. */
export function romanescoSurfaceClearance(
  point: RomanescoSurfacePoint,
  options: Omit<RomanescoSurfaceOptions, "pixel"> = {},
): number {
  const distance = romanescoSurfaceField(point, { ...options, pixel: 0 });
  const rounding = 64 * Number.EPSILON * (1 + Math.max(...point.map(Math.abs)));
  return Number.isFinite(distance) ? Math.max(0, distance - rounding) : 0;
}
