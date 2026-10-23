import { fixedFromNumber, fixedToFloatExp, rescaleFixed } from "../deepZoom/math";
import { finite, isRecord } from "../explorerShare";

export type VoxelPattern = "menger" | "vicsek" | "mosely-light" | "mosely-heavy";
export type Vec3 = [number, number, number];
export type FlightCamera = {
  position: [bigint, bigint, bigint];
  bits: number;
  level: number;
  yaw: number;
  pitch: number;
};
export const MAX_VOXEL_DEPTH = 256;
export const MAX_FLIGHT_LEVEL = MAX_VOXEL_DEPTH - 12;
// Numerical range of camera-relative GPU coordinates, not a visual fog cutoff.
export const LOCAL_COORDINATE_LIMIT = 1e29;
const powers = [BigInt(1)];
for (let i = 1; i <= MAX_VOXEL_DEPTH; i++) powers.push(powers[i - 1] * BigInt(3));
const bitsForLevel = (level: number) => Math.ceil(level * Math.log2(3)) + 160;
const floorDiv = (a: bigint, b: bigint) =>
  a / b - (a < BigInt(0) && a % b !== BigInt(0) ? BigInt(1) : BigInt(0));
const modulo3 = (a: bigint) => Number(((a % BigInt(3)) + BigInt(3)) % BigInt(3));
const localFloat = (value: bigint, bits: number) => {
  const [m, e] = fixedToFloatExp(value, bits);
  return Math.max(-LOCAL_COORDINATE_LIMIT, Math.min(LOCAL_COORDINATE_LIMIT, m * 2 ** e));
};
export const PATTERNS: VoxelPattern[] = ["menger", "vicsek", "mosely-light", "mosely-heavy"];
export function keepVoxel(pattern: VoxelPattern, digit: Vec3) {
  const centers = Number(digit[0] === 1) + Number(digit[1] === 1) + Number(digit[2] === 1);
  return pattern === "menger"
    ? centers <= 1
    : pattern === "vicsek"
      ? centers >= 2
      : pattern === "mosely-light"
        ? centers > 0 && centers < 3
        : centers > 0;
}
const retained = Object.fromEntries(
  PATTERNS.map((pattern) => {
    const children: Vec3[] = [];
    for (let x = 0; x < 3; x++)
      for (let y = 0; y < 3; y++)
        for (let z = 0; z < 3; z++) if (keepVoxel(pattern, [x, y, z])) children.push([x, y, z]);
    return [pattern, children];
  }),
) as Record<VoxelPattern, Vec3[]>;
export function initialFlightCamera(pattern: VoxelPattern = "menger"): FlightCamera {
  const bits = bitsForLevel(0);
  return {
    position: [
      fixedFromNumber(pattern === "menger" ? 0 : pattern === "vicsek" ? 0.7 : 0.8, bits),
      fixedFromNumber(pattern === "menger" ? 0 : pattern === "vicsek" ? 0.7 : 0.8, bits),
      fixedFromNumber(3.2, bits),
    ],
    bits,
    level: 0,
    yaw: 0,
    pitch: 0,
  };
}
export function flightBasis(camera: Pick<FlightCamera, "yaw" | "pitch">) {
  const { yaw, pitch } = camera;
  const right: Vec3 = [Math.cos(yaw), 0, Math.sin(yaw)];
  const forward: Vec3 = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ];
  const up: Vec3 = [
    -Math.sin(yaw) * Math.sin(pitch),
    Math.cos(pitch),
    Math.cos(yaw) * Math.sin(pitch),
  ];
  return { right, up, forward };
}
export type GridLevel = { plane: Vec3; width: number; digit: Vec3 };
export type GridFrame = {
  levels: GridLevel[];
  texture: Float32Array;
  low: Vec3;
  high: Vec3;
  clearance: number;
};

/** Exact global address, camera-relative float geometry. No huge world coordinate reaches the GPU. */
export function buildGridFrame(
  camera: FlightCamera,
  pattern: VoxelPattern,
  maxDepth = camera.level + 10,
): GridFrame {
  return gridFrame(camera, pattern, maxDepth, true);
}
/** Movement needs a safe distance, without building/uploading a render grid. */
export function flightClearance(camera: FlightCamera, pattern: VoxelPattern): number {
  return gridFrame(camera, pattern, camera.level + 10, false).clearance;
}
function gridFrame(
  camera: FlightCamera,
  pattern: VoxelPattern,
  maxDepth: number,
  geometry: boolean,
): GridFrame {
  const one = BigInt(1) << BigInt(camera.bits);
  const denominator = one * BigInt(2);
  const localScale = powers[camera.level];
  const low = camera.position.map((p) =>
    localFloat((-one - p) * localScale, camera.bits + 1),
  ) as Vec3;
  const high = camera.position.map((p) =>
    localFloat((one - p) * localScale, camera.bits + 1),
  ) as Vec3;
  const outside = Math.hypot(...low.map((v, axis) => Math.max(v, -high[axis], 0)));
  let clearance = outside;
  const levels: GridLevel[] = [];
  const texture = new Float32Array(geometry ? MAX_VOXEL_DEPTH * 8 : 0);
  for (let depth = 1; depth <= Math.min(MAX_VOXEL_DEPTH, maxDepth); depth++) {
    const exactWidth = 3 ** (camera.level - depth);
    const width = Math.min(LOCAL_COORDINATE_LIMIT, exactWidth);
    // Every periodic rule has a retained cube within sqrt(3) cell widths.
    // Finer levels cannot improve an already larger lower bound.
    if (!geometry && width * Math.sqrt(3) <= clearance) break;
    // A retained camera cell contributes zero distance. Movement can skip its
    // plane conversion entirely, including distant ancestors at deep zooms.
    if (
      !geometry &&
      keepVoxel(
        pattern,
        camera.position.map((p) =>
          modulo3(floorDiv((p + one) * powers[depth], denominator)),
        ) as Vec3,
      )
    )
      continue;
    const digit: Vec3 = [0, 0, 0];
    const cameraDigit: Vec3 = [0, 0, 0];
    const plane = camera.position.map((p, axis) => {
      const numerator = (p + one) * powers[depth];
      const index = floorDiv(numerator, denominator);
      const remainder = numerator - index * denominator;
      const boundary = index + (remainder * BigInt(2) >= denominator ? BigInt(1) : BigInt(0));
      digit[axis] = modulo3(boundary);
      cameraDigit[axis] = modulo3(index);
      return Math.max(
        -width / 2,
        Math.min(
          width / 2,
          localFloat(
            ((boundary * denominator - numerator) * localScale) / powers[depth],
            camera.bits + 1,
          ),
        ),
      );
    }) as Vec3;
    // Distance to the union of retained child boxes in the periodic grid is
    // a conservative distance to the fractal. Considering neighboring cells
    // keeps a continuous tunnel traversable across its subdivision boundaries.
    if (!keepVoxel(pattern, cameraDigit)) {
      const distances = plane.map((p, axis) =>
        [0, 1, 2].map((target) => {
          const offset = (target - digit[axis] + 3) % 3;
          const u = -p / width;
          return (
            Math.min(
              Math.max(offset - u, u - offset - 1, 0),
              Math.max(offset - 3 - u, u - offset + 2, 0),
            ) * width
          );
        }),
      );
      let nearest = Number.POSITIVE_INFINITY;
      for (const [x, y, z] of retained[pattern])
        nearest = Math.min(nearest, Math.hypot(distances[0][x], distances[1][y], distances[2][z]));
      clearance = Math.max(clearance, nearest);
    }
    if (!geometry) continue;
    // Far ancestor cells that cannot change occupancy anywhere in the local
    // viewing volume need no GPU work. Crossing 2->0 does not change any rule.
    const constant =
      exactWidth > LOCAL_COORDINATE_LIMIT * 2 &&
      plane.every((p, axis) => Math.abs(p) >= LOCAL_COORDINATE_LIMIT || digit[axis] === 0);
    if (constant && keepVoxel(pattern, cameraDigit)) continue;
    const index = levels.length;
    texture.set([...plane, width], index * 4);
    texture.set([...digit, depth], (MAX_VOXEL_DEPTH + index) * 4);
    levels.push({ plane, width, digit });
  }
  return { levels, texture, low, high, clearance: Math.max(outside, clearance) };
}

/** Integrate in safe balls of empty space; scale follows clearance, not a fixed world speed. */
export function moveFlightCamera(
  camera: FlightCamera,
  pattern: VoxelPattern,
  motion: Vec3,
): FlightCamera {
  const magnitude = Math.hypot(...motion);
  if (!Number.isFinite(magnitude) || magnitude === 0) return camera;
  const { right, forward } = flightBasis(camera);
  const direction = right.map(
    (v, axis) => v * motion[0] + (axis === 1 ? motion[1] : 0) + forward[axis] * motion[2],
  ) as Vec3;
  const length = Math.hypot(...direction);
  if (length < 1e-12) return camera;
  for (let axis = 0; axis < 3; axis++) direction[axis] /= length;
  const steps = Math.min(24, Math.max(1, Math.ceil(magnitude / 0.1)));
  let next = camera;
  for (let step = 0; step < steps; step++) {
    const clearance = flightClearance(next, pattern);
    if (clearance <= 0) break;
    let level = next.level;
    if (clearance < 0.16 && level < MAX_FLIGHT_LEVEL) level++;
    else if (clearance > 1.5 && level > 0) level--;
    const bits = Math.max(next.bits, bitsForLevel(level));
    // Both distance and coordinates still refer to the previous local scale.
    const amount = Math.min(0.22, magnitude / steps) * clearance;
    const position = next.position.map(
      (p, axis) =>
        rescaleFixed(p, next.bits, bits) +
        fixedFromNumber(direction[axis] * amount * 2, bits) / powers[next.level],
    ) as FlightCamera["position"];
    const limit = BigInt(64) << BigInt(bits);
    if (position.some((p) => p < -limit || p > limit)) break;
    next = { ...next, position, bits, level };
  }
  return next;
}
const worldPosition = (camera: FlightCamera) =>
  camera.position.map((p) => localFloat(p, camera.bits)) as Vec3;
const zoomRadius = (pattern: VoxelPattern) =>
  Math.hypot(...worldPosition(initialFlightCamera(pattern)));
export function atFlightZoomLimit(camera: FlightCamera, pattern: VoxelPattern) {
  return Math.hypot(...worldPosition(camera)) >= zoomRadius(pattern) - 1e-7;
}

/** Wheel and pinch stop at the opening distance; free flight remains unrestricted. */
export function dollyFlightCamera(camera: FlightCamera, pattern: VoxelPattern, amount: number) {
  const next = moveFlightCamera(camera, pattern, [0, 0, amount]);
  const start = worldPosition(camera),
    end = worldPosition(next);
  const radius = Math.max(zoomRadius(pattern), Math.hypot(...start));
  if (Math.hypot(...end) <= radius) return next;
  // The limiting sphere lies entirely outside the root cube. The segment
  // from the safely integrated camera to its boundary cannot cross geometry.
  const delta = end.map((v, axis) => v - start[axis]);
  const a = delta.reduce((sum, v) => sum + v * v, 0);
  if (!a) return camera;
  const b = start.reduce((sum, v, axis) => sum + v * delta[axis], 0);
  const c = start.reduce((sum, v) => sum + v * v, 0) - radius * radius;
  const fraction = Math.max(0, Math.min(1, (-b + Math.sqrt(Math.max(0, b * b - a * c))) / a));
  if (fraction < 1e-9) return camera;
  return {
    ...next,
    position: next.position.map((p, axis) => {
      const from = rescaleFixed(camera.position[axis], camera.bits, next.bits);
      return from + ((p - from) * BigInt(Math.round(fraction * 1e9))) / BigInt(1e9);
    }) as FlightCamera["position"],
  };
}

export function serializeFlightCamera(camera: FlightCamera) {
  return { ...camera, kind: "voxel-flight", position: camera.position.map((p) => p.toString(16)) };
}
export function restoreFlightCamera(value: unknown): FlightCamera {
  if (
    !isRecord(value) ||
    value.kind !== "voxel-flight" ||
    !finite(value.level, 0, MAX_FLIGHT_LEVEL) ||
    !Number.isInteger(value.level) ||
    !finite(value.bits, bitsForLevel(value.level), 2048) ||
    !Number.isInteger(value.bits) ||
    !finite(value.yaw, -1e6, 1e6) ||
    !finite(value.pitch, -1.54, 1.54) ||
    !Array.isArray(value.position) ||
    value.position.length !== 3 ||
    !value.position.every((p) => typeof p === "string" && /^-?[0-9a-f]{1,520}$/.test(p))
  )
    throw new Error("Invalid exploration camera.");
  const position = value.position.map((p: string) =>
    p.startsWith("-") ? -BigInt(`0x${p.slice(1)}`) : BigInt(`0x${p}`),
  ) as FlightCamera["position"];
  const limit = BigInt(64) << BigInt(value.bits);
  if (position.some((p) => p < -limit || p > limit))
    throw new Error("Exploration camera is out of range.");
  return { position, bits: value.bits, level: value.level, yaw: value.yaw, pitch: value.pitch };
}
