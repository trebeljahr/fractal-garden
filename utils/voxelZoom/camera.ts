import { fixedFromNumber, fixedToFloatExp, rescaleFixed } from "../deepZoom/math";
import { finite, isRecord } from "../explorerShare";
import { easeFlightAtmosphere } from "./smoothing";

export type VoxelPattern = "menger" | "vicsek" | "mosely-light" | "mosely-heavy";
export type Vec3 = [number, number, number];
export type FlightCamera = {
  position: [bigint, bigint, bigint];
  bits: number;
  level: number;
  /** User-selected exploration scale, independent of render precision. */
  viewLevel?: number;
  /** Continuous local travel scale, adapting to passages and forward approach. */
  navigationLevel?: number;
  /** Damped visual scale, independent of immediate directional collision braking. */
  atmosphereLevel?: number;
  atmosphereVelocity?: number;
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
  // Look along a cube diagonal so the six snowflake arms are equally visible.
  if (pattern.startsWith("mosely"))
    return exteriorFlightCamera(pattern, -Math.PI / 4, -Math.asin(1 / Math.sqrt(3)));
  if (pattern === "vicsek")
    return exteriorFlightCamera(
      pattern,
      -Math.atan2(0.7, 3.2),
      -Math.atan2(0.7, Math.hypot(0.7, 3.2)),
    );
  const bits = bitsForLevel(0);
  const position: Vec3 = [0, 0, 3.2];
  return fitFlightPrecision(
    {
      position: position.map((p) => fixedFromNumber(p, bits)) as FlightCamera["position"],
      bits,
      level: 0,
      viewLevel: 0,
      navigationLevel: 0,
      atmosphereLevel: 0,
      atmosphereVelocity: 0,
      yaw: 0,
      pitch: 0,
    },
    pattern,
  );
}

/** Fit the exterior into the shorter screen dimension.
 * Mosely removes the root's corners: its first-stage cubes fit within the
 * 24 vertices (±1/2, ±1/2, ±1/6), including permutations. Later stages fit too.
 * The flight projection uses 0.58 in both axes, scaled by min(width, height). */
export function exteriorFlightCamera(
  pattern: VoxelPattern,
  yaw = (-32 * Math.PI) / 180,
  pitch = (-28 * Math.PI) / 180,
): FlightCamera {
  const basis = flightBasis({ yaw, pitch });
  let distance = 0;
  for (let insetAxis = 0; insetAxis < 3; insetAxis++) {
    for (let index = 0; index < 8; index++) {
      const corner = [0, 1, 2].map((axis) => {
        const half = pattern.startsWith("mosely") && axis === insetAxis ? 1 / 6 : 0.5;
        return index & (1 << axis) ? half : -half;
      });
      const dot = (direction: Vec3) =>
        corner.reduce((sum, v, axis) => sum + v * direction[axis], 0);
      distance = Math.max(
        distance,
        -dot(basis.forward) +
          Math.max(Math.abs(dot(basis.right)), Math.abs(dot(basis.up))) / (0.58 * 0.84),
      );
    }
  }
  const bits = bitsForLevel(0);
  return fitFlightPrecision(
    {
      // Stored coordinates are twice the world coordinates used by the renderer.
      position: basis.forward.map((v) =>
        fixedFromNumber(-2 * distance * v, bits),
      ) as FlightCamera["position"],
      bits,
      level: 0,
      viewLevel: 0,
      navigationLevel: 0,
      atmosphereLevel: 0,
      atmosphereVelocity: 0,
      yaw,
      pitch,
    },
    pattern,
  );
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
  return gridFrame(camera, pattern, MAX_VOXEL_DEPTH, false).clearance;
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
    let relativePlanes: bigint[] | undefined;
    if (geometry && exactWidth > viewDistance * 4 && viewDistance < LOCAL_COORDINATE_LIMIT / 4) {
      // Reject constant distant ancestors before their expensive fixed-point
      // plane conversion. A wider margin makes this a subset of the GPU-plane
      // pruning below; uncertain/overflowed estimates take the original path.
      const denominatorNumber = Number(denominator);
      relativePlanes = camera.position.map((p, axis) => {
        const numerator = (p + one) * powers[depth];
        const index = floorDiv(numerator, denominator);
        const remainder = numerator - index * denominator;
        const boundary = index + (remainder * BigInt(2) >= denominator ? BigInt(1) : BigInt(0));
        digit[axis] = modulo3(boundary);
        cameraDigit[axis] = modulo3(index);
        return boundary * denominator - numerator;
      });
      if (
        keepVoxel(pattern, cameraDigit) &&
        relativePlanes.every(
          (delta, axis) =>
            digit[axis] === 0 ||
            Math.abs((Number(delta) / denominatorNumber) * exactWidth) > viewDistance * 3,
        )
      )
        continue;
    }
    const plane = camera.position.map((p, axis) => {
      if (relativePlanes)
        return Math.max(
          -width / 2,
          Math.min(
            width / 2,
            coordinate((relativePlanes[axis] * localScale) / powers[depth], camera.bits + 1),
          ),
        );

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

// Collision resolves nearby apertures at the current precision scale.
// Navigation changes continuously while collision detail follows local geometry.
export const FLIGHT_COLLISION_DEPTH = 8;
export const FLIGHT_WALL_MARGIN = 1e-5;
export const FLIGHT_NAVIGATION_RATE = 0.75;
const FLIGHT_APPROACH_FACTOR = 4;
const LOG_THREE = Math.log(3);

function passageLevel(camera: FlightCamera, pattern: VoxelPattern) {
  const one = BigInt(1) << BigInt(camera.bits);
  if (camera.position.some((p) => p <= -one || p >= one)) return 0;
  for (let depth = 1; depth <= MAX_VOXEL_DEPTH; depth++) {
    const digit = camera.position.map((p) =>
      modulo3(floorDiv((p + one) * powers[depth], one * BigInt(2))),
    ) as Vec3;
    if (!keepVoxel(pattern, digit)) return depth;
  }
  return MAX_VOXEL_DEPTH;
}

type TravelInterval = { start: number; end: number; level: number };
type TravelRoute = { intervals: TravelInterval[]; wall: number; normalAxis: number };

/** Find the passages and retained face along the intended movement direction.
 * Nearby parallel walls do not participate in speed selection. */
function flightRoute(
  camera: FlightCamera,
  pattern: VoxelPattern,
  ray: Vec3,
  detailPrecision: number,
  horizon: number,
): TravelRoute {
  const detailLevel = Math.max(camera.navigationLevel ?? camera.level, detailPrecision);
  const detailUnit = 3 ** (camera.level - detailLevel);
  const frame = gridFrame(
    camera,
    pattern,
    Math.ceil(detailLevel) + FLIGHT_COLLISION_DEPTH,
    true,
    false,
  );
  const intervals: TravelInterval[] = [];
  const append = (start: number, end: number, level: number) => {
    if (end <= start) return;
    const previous = intervals.at(-1);
    if (previous && previous.level === level && previous.end === start) previous.end = end;
    else intervals.push({ start, end, level });
  };
  const outside = () => ({
    intervals: [{ start: 0, end: horizon, level: 0 }],
    wall: Infinity,
    normalAxis: 2,
  });
  let near = 0,
    far = Infinity,
    normalAxis = 2;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(ray[axis]) < 1e-15) {
      if (frame.low[axis] > 0 || frame.high[axis] < 0) return outside();
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
  if (far <= near || near >= horizon) return outside();
  append(0, near, 0);
  let t = near;
  for (let step = 0; step < 512; step++) {
    const epsilon = Math.max(detailUnit * 1e-13, Math.abs(t) * 1e-13);
    const point = ray.map((v) => v * (t + epsilon));
    let empty = false;
    for (const { plane, width, digit } of frame.levels) {
      if (width < epsilon * 4) break;
      const cell = point.map((p, axis) => Math.floor((p - plane[axis]) / width));
      const child = cell.map((c, axis) => (((digit[axis] + c) % 3) + 3) % 3) as Vec3;
      if (keepVoxel(pattern, child)) continue;
      let exit = Math.min(far, horizon);
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
      if (exit <= t) return { intervals, wall: t, normalAxis };
      append(t, exit, Math.max(0, Math.round(camera.level - Math.log(width) / LOG_THREE)));
      t = exit;
      normalAxis = exitAxis;
      empty = true;
      break;
    }
    if (!empty) return { intervals, wall: t, normalAxis };
    if (t >= horizon) return { intervals, wall: Infinity, normalAxis };
    if (t >= far) {
      append(far, horizon, 0);
      return { intervals, wall: Infinity, normalAxis };
    }
  }
  return { intervals, wall: t, normalAxis };
}

/** Integrate passage speed with a logistic recovery curve. Acceleration eases
 * to zero as the surrounding scale is reached. Directional caps still approach
 * retained walls exponentially, including after an abrupt turn toward one. */
function flightTravel(
  route: TravelRoute,
  coordinateLevel: number,
  navigationLevel: number,
  throttle: number,
  duration: number,
) {
  const acceleration = FLIGHT_NAVIGATION_RATE * LOG_THREE;
  const braking = throttle * FLIGHT_APPROACH_FACTOR;
  let distance = 0;
  let remaining = duration;
  let scale = 3 ** (coordinateLevel - navigationLevel);
  const result = () => ({
    distance,
    navigationLevel: Math.max(
      0,
      Math.min(MAX_VOXEL_DEPTH, coordinateLevel - Math.log(scale) / LOG_THREE),
    ),
  });
  for (let index = 0; index < route.intervals.length && remaining > 0; index++) {
    const interval = route.intervals[index];
    const targetScale = 3 ** (coordinateLevel - interval.level);
    let cap = route.wall;
    for (let future = index + 1; future < route.intervals.length; future++) {
      const next = route.intervals[future];
      cap = Math.min(
        cap,
        next.start + 3 ** (coordinateLevel - next.level) / FLIGHT_APPROACH_FACTOR,
      );
    }
    scale = Math.min(scale, targetScale, (cap - distance) * FLIGHT_APPROACH_FACTOR);
    if (scale <= 0) return result();
    const ratio = scale / targetScale;
    const freeDistance = (time: number) =>
      (throttle * targetScale * Math.log1p(ratio * Math.expm1(acceleration * time))) / acceleration;
    const freeScale = (time: number) =>
      (scale * Math.exp(acceleration * time)) / (1 + ratio * Math.expm1(acceleration * time));
    // Free speed rises monotonically while the approach cap falls. Their one
    // intersection is bounded, avoiding frame-dependent clamp/release cycles.
    let untilCap = remaining;
    const gap = cap - distance;
    if (
      Number.isFinite(cap) &&
      freeScale(remaining) > FLIGHT_APPROACH_FACTOR * (gap - freeDistance(remaining))
    ) {
      let low = 0;
      for (let iteration = 0; iteration < 48; iteration++) {
        const mid = (low + untilCap) / 2;
        if (freeScale(mid) > FLIGHT_APPROACH_FACTOR * (gap - freeDistance(mid))) untilCap = mid;
        else low = mid;
      }
    }
    const toExit = interval.end - distance;
    if (freeDistance(untilCap) >= toExit) {
      const travelTime =
        Math.log1p(Math.expm1((acceleration * toExit) / (throttle * targetScale)) / ratio) /
        acceleration;
      scale = freeScale(travelTime);
      distance = interval.end;
      remaining = Math.max(0, remaining - travelTime);
      continue;
    }
    distance += freeDistance(untilCap);
    scale = freeScale(untilCap);
    remaining = Math.max(0, remaining - untilCap);
    if (remaining <= 0) return result();
    const cappedGap = cap - distance;
    const exitGap = cap - interval.end;
    const exitTime = exitGap > 0 ? Math.log(cappedGap / exitGap) / braking : Infinity;
    const travelTime = Math.min(remaining, exitTime);
    const decay = Math.exp(-braking * travelTime);
    distance += cappedGap * -Math.expm1(-braking * travelTime);
    scale = FLIGHT_APPROACH_FACTOR * cappedGap * decay;
    remaining = Math.max(0, remaining - travelTime);
    if (travelTime !== exitTime) return result();
    distance = interval.end;
  }
  return result();
}

/** Throttle controls travel; elapsed seconds control adaptation independently.
 * Gesture callers may omit elapsed time and use an equivalent brief impulse. */
export function moveFlightCamera(
  camera: FlightCamera,
  pattern: VoxelPattern,
  motion: Vec3,
  elapsedSeconds?: number,
): FlightCamera {
  const magnitude = Math.hypot(...motion);
  if (!Number.isFinite(magnitude) || magnitude === 0) return camera;
  if (elapsedSeconds !== undefined && (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0))
    return camera;
  // Integrate long rendered frames in bounded sweeps, preserving the complete
  // input duration and throttle. Clipping time here makes heavy views fly slower.
  if (elapsedSeconds !== undefined && elapsedSeconds > 0.5) {
    const steps = Math.ceil(elapsedSeconds / 0.5);
    const step = motion.map((value) => value / steps) as Vec3;
    let next = camera;
    for (let index = 0; index < steps; index++)
      next = moveFlightCamera(next, pattern, step, elapsedSeconds / steps);
    return next;
  }
  const duration = Math.min(0.5, elapsedSeconds ?? magnitude / 0.75);
  const throttle = magnitude / duration;
  const { right, forward } = flightBasis(camera);
  const direction = right.map(
    (v, axis) => v * motion[0] + (axis === 1 ? motion[1] : 0) + forward[axis] * motion[2],
  ) as Vec3;
  const length = Math.hypot(...direction);
  if (length < 1e-12) return camera;
  for (let axis = 0; axis < 3; axis++) direction[axis] /= length;
  const viewLevel = camera.viewLevel ?? camera.level;
  const navigationLevel = camera.navigationLevel ?? passageLevel(camera, pattern);
  // Use units no finer than travel needs, retaining long lateral paths even
  // when an adjoining wall requires much finer render precision.
  const collisionLevel = Math.min(camera.level, Math.floor(navigationLevel));
  const collisionCamera = { ...camera, level: collisionLevel, navigationLevel };
  const scale = 3 ** (collisionLevel - navigationLevel);
  const acceleration = FLIGHT_NAVIGATION_RATE * LOG_THREE;
  const horizon = scale * (4 + (throttle * Math.expm1(acceleration * duration)) / acceleration);
  const route = flightRoute(collisionCamera, pattern, direction, camera.level, horizon);
  const travel = flightTravel(route, collisionLevel, navigationLevel, throttle, duration);
  const margin =
    (FLIGHT_WALL_MARGIN * 3 ** (collisionLevel - Math.max(navigationLevel, camera.level))) /
    Math.max(1e-12, Math.abs(direction[route.normalAxis]));
  const distance = Math.min(travel.distance, Math.max(0, route.wall - margin));
  if (distance < 1e-12 * 3 ** (collisionLevel - Math.max(navigationLevel, camera.level)))
    return camera;
  const level = camera.level;
  const bits = Math.max(camera.bits, bitsForLevel(level), bitsForLevel(collisionLevel));
  const position = camera.position.map(
    (p, axis) =>
      rescaleFixed(p, camera.bits, bits) +
      fixedFromNumber(direction[axis] * distance * 2, bits) / powers[collisionLevel],
  ) as FlightCamera["position"];
  const limit = BigInt(64) << BigInt(bits);
  if (position.some((p) => p < -limit || p > limit)) return camera;
  const nextNavigationLevel =
    distance < travel.distance
      ? Math.min(
          travel.navigationLevel,
          collisionLevel - Math.log(FLIGHT_APPROACH_FACTOR * (route.wall - distance)) / LOG_THREE,
        )
      : travel.navigationLevel;
  const atmosphere = easeFlightAtmosphere(
    camera.atmosphereLevel ?? navigationLevel,
    camera.atmosphereVelocity ?? 0,
    navigationLevel,
    nextNavigationLevel,
    duration,
    throttle,
  );
  return fitFlightPrecision(
    {
      ...camera,
      position,
      bits,
      viewLevel,
      navigationLevel: nextNavigationLevel,
      atmosphereLevel: atmosphere.level,
      atmosphereVelocity: atmosphere.velocity,
    },
    pattern,
  );
}

/** Keep nearby surfaces in a well-conditioned local coordinate range. The
 * selected travel/fog scale stays unchanged when approach refines geometry. */
function fitFlightPrecision(camera: FlightCamera, pattern: VoxelPattern): FlightCamera {
  const clearance = flightClearance({ ...camera, level: 0 }, pattern);
  if (clearance <= 0) return camera;
  const level = Math.max(
    0,
    Math.min(MAX_FLIGHT_LEVEL, Math.floor(Math.log(0.5 / clearance) / Math.log(3))),
  );
  const bits = Math.max(camera.bits, bitsForLevel(level));
  return {
    ...camera,
    level,
    bits,
    position: camera.position.map((p) =>
      rescaleFixed(p, camera.bits, bits),
    ) as FlightCamera["position"],
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
    next = fitFlightPrecision({ ...next, position, bits, level }, pattern);
  }
  return next;
}
const worldPosition = (camera: FlightCamera) =>
  camera.position.map((p) => localFloat(p, camera.bits)) as Vec3;
// Keep scroll-out/page handoff outside the whole fractal, independently of
// the selected destination. The clipping sphere encloses the root.
const zoomRadius = (pattern: VoxelPattern) =>
  Math.hypot(
    3.2,
    ...(pattern === "menger" ? [0, 0] : pattern === "vicsek" ? [0.7, 0.7] : [0.8, 0.8]),
  );
export function atFlightZoomLimit(camera: FlightCamera, pattern: VoxelPattern) {
  return Math.hypot(...worldPosition(camera)) >= zoomRadius(pattern) - 1e-7;
}

function dollyScale(camera: FlightCamera, next: FlightCamera, pattern: VoxelPattern): FlightCamera {
  const before = flightClearance(camera, pattern);
  const after = flightClearance(next, pattern);
  const viewLevel = camera.viewLevel ?? camera.level;
  const nextViewLevel =
    before > 0 && after > 0
      ? Math.max(
          0,
          Math.min(
            MAX_FLIGHT_LEVEL,
            viewLevel + next.level - camera.level + Math.log(before / after) / LOG_THREE,
          ),
        )
      : viewLevel;
  return {
    ...next,
    viewLevel: nextViewLevel,
    atmosphereLevel: Math.max(
      0,
      Math.min(
        MAX_VOXEL_DEPTH,
        (camera.atmosphereLevel ?? camera.navigationLevel ?? viewLevel) + nextViewLevel - viewLevel,
      ),
    ),
    atmosphereVelocity: 0,
    navigationLevel: Math.max(
      0,
      Math.min(
        MAX_VOXEL_DEPTH,
        (camera.navigationLevel ?? passageLevel(camera, pattern)) + nextViewLevel - viewLevel,
      ),
    ),
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
    (value.navigationLevel !== undefined && !finite(value.navigationLevel, 0, MAX_VOXEL_DEPTH)) ||
    (value.atmosphereLevel !== undefined && !finite(value.atmosphereLevel, 0, MAX_VOXEL_DEPTH)) ||
    (value.atmosphereVelocity !== undefined && !finite(value.atmosphereVelocity, -16, 16)) ||
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
  const viewLevel = value.viewLevel ?? value.level;
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
      // Solid saved addresses have no navigable cavity.
      if (depth > MAX_FLIGHT_LEVEL + FLIGHT_COLLISION_DEPTH) return initialFlightCamera(pattern);
    }
  }
  const camera: FlightCamera = {
    position,
    bits: value.bits,
    level: value.level,
    viewLevel,
    navigationLevel: value.navigationLevel as number | undefined,
    yaw: value.yaw,
    pitch: value.pitch,
  };
  camera.navigationLevel ??= pattern
    ? Math.max(viewLevel, passageLevel(camera, pattern))
    : viewLevel;
  camera.atmosphereLevel = (value.atmosphereLevel as number | undefined) ?? camera.navigationLevel;
  camera.atmosphereVelocity = (value.atmosphereVelocity as number | undefined) ?? 0;
  return pattern ? fitFlightPrecision(camera, pattern) : camera;
}
