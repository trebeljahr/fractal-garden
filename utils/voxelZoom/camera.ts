import { fixedFromNumber, fixedToFloatExp, rescaleFixed } from "../deepZoom/math";
import { finite, isRecord } from "../explorerShare";

export type VoxelPattern = "menger" | "vicsek" | "mosely-light" | "mosely-heavy";
export type Vec3 = [number, number, number];
export type FlightCamera = {
  position: [bigint, bigint, bigint];
  bits: number;
  level: number;
  /** User-selected exploration scale, independent of render precision. */
  viewLevel?: number;
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
// Collision sweeps need double precision; GPU-rounded planes can put a stop
// point just behind a wall. Keep the BigInt-relative conversion on the CPU.
const localDouble = (value: bigint, bits: number) => {
  if (value === BigInt(0)) return 0;
  const sign = value < BigInt(0) ? -1 : 1;
  const magnitude = value < BigInt(0) ? -value : value;
  const drop = Math.max(0, magnitude.toString(2).length - 53);
  const result = sign * Number(magnitude >> BigInt(drop)) * 2 ** (drop - bits);
  return Math.max(-LOCAL_COORDINATE_LIMIT, Math.min(LOCAL_COORDINATE_LIMIT, result));
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
    viewLevel: 0,
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

/** Camera-relative root bounds shared by visibility and traversal. */
export function flightRootBounds(camera: FlightCamera, precise = false) {
  const coordinate = precise ? localDouble : localFloat;
  const one = BigInt(1) << BigInt(camera.bits);
  const scale = powers[camera.level];
  return {
    low: camera.position.map((p) => coordinate((-one - p) * scale, camera.bits + 1)) as Vec3,
    high: camera.position.map((p) => coordinate((one - p) * scale, camera.bits + 1)) as Vec3,
  };
}

/** Exact global address, camera-relative float geometry. No huge world coordinate reaches the GPU. */
export function buildGridFrame(
  camera: FlightCamera,
  pattern: VoxelPattern,
  maxDepth = camera.level + 10,
  viewDistance = LOCAL_COORDINATE_LIMIT,
): GridFrame {
  return gridFrame(camera, pattern, maxDepth, true, true, viewDistance);
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
  upload = true,
  viewDistance = LOCAL_COORDINATE_LIMIT,
): GridFrame {
  const coordinate = !geometry || !upload ? localDouble : localFloat;
  const one = BigInt(1) << BigInt(camera.bits);
  const denominator = one * BigInt(2);
  const localScale = powers[camera.level];
  const { low, high } = flightRootBounds(camera, !geometry || !upload);
  const outside = Math.hypot(...low.map((v, axis) => Math.max(v, -high[axis], 0)));
  let clearance = outside;
  const levels: GridLevel[] = [];
  const texture = new Float32Array(geometry && upload ? MAX_VOXEL_DEPTH * 8 : 0);
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
          coordinate(
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
      exactWidth > viewDistance * 4 &&
      plane.every((p, axis) => Math.abs(p) >= viewDistance * 2 || digit[axis] === 0);
    if (constant && keepVoxel(pattern, cameraDigit)) continue;
    const index = levels.length;
    if (upload) {
      texture.set([...plane, width], index * 4);
      texture.set([...digit, depth], (MAX_VOXEL_DEPTH + index) * 4);
    }
    levels.push({ plane, width, digit });
  }
  return { levels, texture, low, high, clearance: Math.max(outside, clearance) };
}

// A stable aperture floor prevents flight through subpixel holes that the
// renderer shows as a wall. Explicit zoom makes smaller passages accessible.
export const FLIGHT_COLLISION_DEPTH = 8;
export const FLIGHT_WALL_MARGIN = 1e-5;

/** Sweep through empty cells, spending travel time at each passage's scale.
 * The first removed ancestor sets speed, so skimming a wall does not cause
 * clearance-dependent crawling. Outside the root, use the selected zoom. */
function flightTravel(camera: FlightCamera, pattern: VoxelPattern, ray: Vec3, time: number) {
  const viewLevel = camera.viewLevel ?? camera.level;
  const unit = 3 ** (camera.level - viewLevel);
  const frame = gridFrame(
    camera,
    pattern,
    Math.ceil(viewLevel) + FLIGHT_COLLISION_DEPTH,
    true,
    false,
  );
  const maximum = time * unit;
  let near = 0,
    far = Infinity,
    normalAxis = 2;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(ray[axis]) < 1e-15) {
      if (frame.low[axis] > 0 || frame.high[axis] < 0) return maximum;
      continue;
    }
    const a = frame.low[axis] / ray[axis],
      b = frame.high[axis] / ray[axis];
    const entry = Math.min(a, b);
    if (entry > near) {
      near = entry;
      normalAxis = axis;
    }
    far = Math.min(far, Math.max(a, b));
  }
  if (far <= near) return maximum;
  const margin = (axis: number) =>
    (FLIGHT_WALL_MARGIN * unit) / Math.max(1e-12, Math.abs(ray[axis]));
  if (near > maximum + margin(normalAxis)) return maximum;
  let t = near,
    remaining = time - near / unit;
  let requestedEnd: number | undefined = remaining < 0 ? maximum : undefined;
  const stopped = () => Math.min(requestedEnd ?? maximum, Math.max(0, t - margin(normalAxis)));
  for (let step = 0; step < 512; step++) {
    const epsilon = Math.max(unit * 1e-13, Math.abs(t) * 1e-13);
    const point = ray.map((v) => v * (t + epsilon));
    let empty = false;
    for (const { plane, width, digit } of frame.levels) {
      if (width < epsilon * 4) break;
      const cell = point.map((p, axis) => Math.floor((p - plane[axis]) / width));
      const child = cell.map((c, axis) => (((digit[axis] + c) % 3) + 3) % 3) as Vec3;
      if (keepVoxel(pattern, child)) continue;
      if (requestedEnd !== undefined) return requestedEnd;
      let exit = far;
      let exitAxis = normalAxis;
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(ray[axis]) < 1e-15) continue;
        const edge = plane[axis] + (cell[axis] + Number(ray[axis] > 0)) * width;
        const crossing = edge / ray[axis];
        if (crossing < exit) {
          exit = crossing;
          exitAxis = axis;
        }
      }
      const speed = Math.min(unit, width);
      const travel = Math.max(0, exit - t);
      if (remaining * speed < travel) {
        const end = t + remaining * speed;
        if (exit - end > margin(exitAxis)) return end;
        // Probe the adjoining cell before allowing an endpoint within the
        // face margin. An open neighbour leaves the requested travel intact.
        requestedEnd = end;
      }
      remaining -= travel / speed;
      t = Math.max(exit, t + epsilon);
      normalAxis = exitAxis;
      empty = true;
      break;
    }
    if (!empty) return stopped();
    if (t >= far) return requestedEnd ?? far + Math.max(0, remaining) * unit;
  }
  // An unresolved segment stops; it never jumps over unexamined geometry.
  return stopped();
}

/** Motion is elapsed travel at the selected zoom. Smaller recursive passages
 * reduce speed, independently of precision, frame rate and wall clearance. */
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
  const viewLevel = camera.viewLevel ?? camera.level;
  // Collision coordinates follow the exploration scale, so tiny render units
  // beside a wall cannot shrink a long, unobstructed movement segment.
  const collisionLevel = Math.floor(viewLevel);
  const collisionCamera = { ...camera, level: collisionLevel };
  const distance = flightTravel(collisionCamera, pattern, direction, magnitude);
  if (distance < 1e-12 * 3 ** (collisionLevel - viewLevel)) return camera;
  let level = camera.level;
  const bits = Math.max(camera.bits, bitsForLevel(level), bitsForLevel(collisionLevel));
  const position = camera.position.map(
    (p, axis) =>
      rescaleFixed(p, camera.bits, bits) +
      fixedFromNumber(direction[axis] * distance * 2, bits) / powers[collisionLevel],
  ) as FlightCamera["position"];
  const limit = BigInt(64) << BigInt(bits);
  if (position.some((p) => p < -limit || p > limit)) return camera;
  const next = { ...camera, position, bits, viewLevel };
  const clearance = flightClearance(next, pattern);
  if (clearance < 0.16 && level < MAX_FLIGHT_LEVEL) level++;
  else if (clearance > 1.5 && level > 0) level--;
  const nextBits = Math.max(bits, bitsForLevel(level));
  return {
    ...next,
    position: position.map((p) => rescaleFixed(p, bits, nextBits)) as FlightCamera["position"],
    bits: nextBits,
    level,
  };
}

/** Wheel dolly follows local clearance and explicitly changes the viewing scale. */
function moveFlightCameraByClearance(
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

function dollyScale(camera: FlightCamera, next: FlightCamera, pattern: VoxelPattern): FlightCamera {
  const before = flightClearance(camera, pattern);
  const after = flightClearance(next, pattern);
  const viewLevel = camera.viewLevel ?? camera.level;
  return {
    ...next,
    viewLevel:
      before > 0 && after > 0
        ? Math.max(
            0,
            Math.min(
              MAX_FLIGHT_LEVEL,
              viewLevel + next.level - camera.level + Math.log(before / after) / Math.log(3),
            ),
          )
        : viewLevel,
  };
}

/** Wheel and pinch stop at the opening distance; free flight remains unrestricted. */
export function dollyFlightCamera(camera: FlightCamera, pattern: VoxelPattern, amount: number) {
  const moved = moveFlightCameraByClearance(camera, pattern, [0, 0, amount]);
  const next = { ...moved, viewLevel: camera.viewLevel ?? camera.level };
  const start = worldPosition(camera),
    end = worldPosition(next);
  const radius = Math.max(zoomRadius(pattern), Math.hypot(...start));
  if (Math.hypot(...end) <= radius) return dollyScale(camera, next, pattern);
  // The limiting sphere lies entirely outside the root cube. The segment
  // from the safely integrated camera to its boundary cannot cross geometry.
  const delta = end.map((v, axis) => v - start[axis]);
  const a = delta.reduce((sum, v) => sum + v * v, 0);
  if (!a) return camera;
  const b = start.reduce((sum, v, axis) => sum + v * delta[axis], 0);
  const c = start.reduce((sum, v) => sum + v * v, 0) - radius * radius;
  const fraction = Math.max(0, Math.min(1, (-b + Math.sqrt(Math.max(0, b * b - a * c))) / a));
  if (fraction < 1e-9) return camera;
  return dollyScale(
    camera,
    {
      ...next,
      position: next.position.map((p, axis) => {
        const from = rescaleFixed(camera.position[axis], camera.bits, next.bits);
        return from + ((p - from) * BigInt(Math.round(fraction * 1e9))) / BigInt(1e9);
      }) as FlightCamera["position"],
    },
    pattern,
  );
}

export function serializeFlightCamera(camera: FlightCamera) {
  return { ...camera, kind: "voxel-flight", position: camera.position.map((p) => p.toString(16)) };
}
export function restoreFlightCamera(value: unknown, pattern?: VoxelPattern): FlightCamera {
  if (
    !isRecord(value) ||
    value.kind !== "voxel-flight" ||
    !finite(value.level, 0, MAX_FLIGHT_LEVEL) ||
    !Number.isInteger(value.level) ||
    (value.viewLevel !== undefined && !finite(value.viewLevel, 0, MAX_FLIGHT_LEVEL)) ||
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
  let viewLevel = value.viewLevel ?? value.level;
  if (pattern) {
    const one = BigInt(1) << BigInt(value.bits);
    if (position.every((p) => p >= -one && p <= one)) {
      let depth = 1;
      for (; depth <= MAX_VOXEL_DEPTH; depth++) {
        const digit = position.map((p) =>
          modulo3(floorDiv((p + one) * powers[depth], one * BigInt(2))),
        ) as Vec3;
        if (!keepVoxel(pattern, digit)) break;
      }
      // Older links can start inside a hole hidden by the new aperture floor.
      // Reveal that hole before navigating, instead of trapping the camera.
      if (depth > MAX_FLIGHT_LEVEL + FLIGHT_COLLISION_DEPTH) return initialFlightCamera(pattern);
      viewLevel = Math.max(viewLevel, depth - FLIGHT_COLLISION_DEPTH);
    }
  }
  return {
    position,
    bits: value.bits,
    level: value.level,
    viewLevel,
    yaw: value.yaw,
    pitch: value.pitch,
  };
}
