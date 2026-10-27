import { fixedFromNumber } from "../deepZoom/math";
import {
  ROMANESCO_SURFACE_MODEL,
  type RomanescoSurfaceOptions,
  romanescoSurfaceClearance,
} from "../romanescoSurface";
import { buildRomanescoSurfaceChart, type RomanescoSurfaceChart } from "../romanescoSurfaceChart";
import {
  type BigVec3,
  CAMERA_DISTANCE,
  cameraTarget,
  FAR_PLANE,
  inverseRotate,
  relativeNumber,
  rotationOf,
  type SpatialCamera,
  type Vec3,
} from "../spatial/camera";
import type { SpatialStyle } from "../spatial/geometry";
import {
  type GpuFrame,
  type GpuShape,
  type GpuTransform,
  MAX_GPU_ROOTS,
  packTransforms,
} from "./model";

const ROOT_CENTER: Vec3 = [0, 0.12, 0];
const ROOT_SCALE = 1.25;
const DIRECT_FRAME_ZOOM = 16;
const axes = (size: number): GpuTransform["axes"] => [
  [size, 0, 0],
  [0, size, 0],
  [0, 0, size],
];
const radius = ROMANESCO_SURFACE_MODEL.baseRadius + ROMANESCO_SURFACE_MODEL.reliefHeight;
const base = -1 - ROMANESCO_SURFACE_MODEL.baseDepth;

/** Root bounds only. This surface has no affine cone-child hierarchy. */
export const ROMANESCO_SURFACE_SHAPE: GpuShape = {
  spec: { kind: "romanesco" },
  kind: 3,
  roots: [{ center: ROOT_CENTER, axes: axes(ROOT_SCALE), rank: 0 }],
  children: [],
  hull: [
    [1, 0, 0, radius],
    [-1, 0, 0, radius],
    [0, 1, 0, 1],
    [0, -1, 0, -base],
    [0, 0, 1, radius],
    [0, 0, -1, radius],
  ],
  edges: [],
  low: [-radius, base, -radius],
  high: [radius, 1, radius],
  radius: Math.hypot(radius, -base),
  featureSize: ROMANESCO_SURFACE_MODEL.reliefHeight,
};

export type RomanescoSurfaceFrame = GpuFrame & {
  /** The original root alone cannot retain surface coordinates at deeper scales. */
  needsDeepChart: boolean;
  chart?: RomanescoSurfaceChart;
  surface: {
    canonicalEye: Vec3;
    canonicalEyeFixed: BigVec3;
    /** Canonical-root units to the current camera's working units. */
    workingScale: number;
    canonicalEyeError: number;
  };
};

/** Rebase the single carrier before converting coordinates to floating point. */
export function buildRomanescoSurfaceFrame(
  camera: SpatialCamera,
  style: SpatialStyle,
  options: RomanescoSurfaceOptions & { horizon?: number; previous?: GpuFrame } = {},
): RomanescoSurfaceFrame {
  const bits = camera.bits;
  const horizon = options.horizon ?? FAR_PLANE;
  if (!Number.isInteger(bits) || bits < 2 || !Number.isFinite(camera.zoom))
    throw new Error("Invalid Romanesco surface camera precision.");
  if (!Number.isFinite(horizon) || horizon <= 0)
    throw new Error("Romanesco surface horizon must be positive and finite.");
  const offset = inverseRotate([0, 0, CAMERA_DISTANCE], rotationOf(style));
  const eye = cameraTarget(camera).map(
    (value, i) => value + fixedFromNumber(offset[i] * 2 ** -camera.zoom, bits),
  ) as BigVec3;
  const center = ROOT_CENTER.map((value) => fixedFromNumber(value, bits)) as BigVec3;
  const scale = fixedFromNumber(ROOT_SCALE, bits);
  const fixedAxes: [BigVec3, BigVec3, BigVec3] = [
    [scale, BigInt(0), BigInt(0)],
    [BigInt(0), scale, BigInt(0)],
    [BigInt(0), BigInt(0), scale],
  ];
  // The carrier scale is exactly 5/4. Divide after subtracting the fixed eye,
  // preserving tiny world-space offsets even when a deep chart is still needed.
  const canonicalEyeFixed = eye.map(
    (value, i) => ((value - center[i]) * BigInt(4)) / BigInt(5),
  ) as BigVec3;
  const canonicalEye = canonicalEyeFixed.map((value) => relativeNumber(value, bits, 0)) as Vec3;
  const canonicalEyeError =
    Math.sqrt(3) * (2 ** -51 * Math.max(1, ...canonicalEye.map(Math.abs)) + 2 * 2 ** -bits);
  const workingScale = relativeNumber(scale, bits, camera.zoom);
  const needsDeepChart = camera.zoom > DIRECT_FRAME_ZOOM || !Number.isFinite(workingScale);
  const chart =
    camera.zoom > 8
      ? buildRomanescoSurfaceChart(canonicalEyeFixed, bits, {
          ...options,
          workingScale,
          workingRadius: horizon + 1,
          errorTolerance: 1e-5,
          residualData: "fallback",
        })
      : undefined;
  const roots: GpuTransform[] = needsDeepChart
    ? []
    : [
        {
          center: center.map((value, i) =>
            relativeNumber(value - eye[i], bits, camera.zoom),
          ) as Vec3,
          axes: axes(workingScale),
          rank: 0,
        },
      ];
  return {
    shape: ROMANESCO_SURFACE_SHAPE,
    roots,
    rootData: packTransforms(roots, MAX_GPU_ROOTS),
    horizon,
    visited: 1,
    camera,
    style,
    frontier: {
      bits,
      zoom: camera.zoom,
      eye,
      reach: fixedFromNumber(horizon * 2 * 2 ** -camera.zoom, bits),
      roots: [{ center, axes: fixedAxes, rank: 0 }],
    },
    needsDeepChart,
    chart,
    surface: { canonicalEye, canonicalEyeFixed, canonicalEyeError, workingScale },
  };
}

/** CPU collision bound for the same finite relief field, in camera working units. */
export function romanescoSurfaceFrameClearance(
  frame: RomanescoSurfaceFrame,
  options: Omit<RomanescoSurfaceOptions, "pixel"> = {},
): number {
  // An unsupported frame certifies no free ball. The renderer must handle the
  // explicit flag, rather than drawing a different cone tree or clamping zoom.
  if (frame.chart) {
    // The anchor itself was evaluated at fixed precision. Its exact field is
    // usable even when a nearby tip prevents a smooth Taylor chart.
    const value =
      relativeNumber(frame.chart.fieldFixed, frame.chart.bits, 0) * frame.surface.workingScale;
    const rounding = 256 * Number.EPSILON * (1 + Math.abs(value));
    return Math.min(frame.horizon, Math.max(0, value - rounding));
  }
  if (frame.needsDeepChart) return 0;
  const { canonicalEye, canonicalEyeError, workingScale } = frame.surface;
  const distance = Math.max(
    0,
    romanescoSurfaceClearance(canonicalEye, options) - canonicalEyeError,
  );
  const lower = distance * workingScale * (1 - 8 * Number.EPSILON);
  return Number.isFinite(lower) ? Math.min(frame.horizon, Math.max(0, lower)) : 0;
}
