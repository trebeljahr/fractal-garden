import type { ConstructionLead } from "../constructionLead";
import { type Orientation, viewRotation } from "../orientation";
import { ROMANESCO_ROOT, type RomanescoVector } from "../romanesco";
import {
  ROMANESCO_SURFACE_MODEL as MODEL,
  romanescoSurfacePrimaryHeight,
} from "../romanescoSurface";
import { FOCAL_SCALE } from "../spatial/camera";

export const ROMANESCO_ROW_STEPS = [8, 13, 21];

const PEAK_ANGLE = MODEL.tau * MODEL.goldenTurn;
const PEAK_RADIAL = MODEL.baseRadius + MODEL.reliefHeight;
// Beyond this the peaks are too small to tell apart in the opening view.
const LAST_PEAK = Math.round(Math.log(1 / 0.1) / MODEL.spiralDecay);

/**
 * Where the tip of peak `index` is, in the model's coordinates. The figure draws the radial
 * surface in utils/romanescoSurface.ts. Its hexagonal cells are centered where the tilted height
 * equals e^(-0.015 index), so this undoes that tilt to find the height of the tip.
 */
export function romanescoPeak(index: number): RomanescoVector {
  const tilted = Math.exp(-index * MODEL.spiralDecay);
  let low = 0;
  let high = 1;
  for (let i = 0; i < 48; i++) {
    const h = (low + high) / 2;
    if (romanescoSurfacePrimaryHeight(h, PEAK_RADIAL * h) < tilted) low = h;
    else high = h;
  }
  const h = (low + high) / 2;
  const angle = index * PEAK_ANGLE;
  const { center, scale } = ROMANESCO_ROOT;
  return [
    center[0] + scale * PEAK_RADIAL * h * Math.cos(angle),
    center[1] + scale * (1 - 2 * h),
    center[2] + scale * PEAK_RADIAL * h * Math.sin(angle),
  ];
}

/** What `step` turns of the golden angle come to, as full turns and what is left over. */
export function romanescoRowTurn(step: number) {
  const degrees = 360 * step * MODEL.goldenTurn;
  const turns = Math.round(degrees / 360);
  return { turns, left: degrees - 360 * turns };
}

type Camera = { rotation: Orientation; distance: number; width: number; height: number };

function project([x, y, z]: RomanescoVector, { rotation: r, distance, width, height }: Camera) {
  const focal = FOCAL_SCALE * Math.min(width, height);
  const depth = distance - (r[6] * x + r[7] * y + r[8] * z);
  return [
    width / 2 + ((r[0] * x + r[1] * y + r[2] * z) / depth) * focal,
    height / 2 - ((r[3] * x + r[4] * y + r[5] * z) / depth) * focal,
  ];
}

function facesCamera(index: number, point: RomanescoVector, { rotation: r, distance }: Camera) {
  const angle = index * PEAK_ANGLE;
  const normal = [Math.cos(angle), PEAK_RADIAL / 2, Math.sin(angle)];
  const eye = [r[6] * distance, r[7] * distance, r[8] * distance];
  return normal.reduce((sum, value, axis) => sum + value * (eye[axis] - point[axis]), 0) > 0;
}

/**
 * The rows that link every `step`-th peak, as lines on screen. There are `step` of them: each
 * starts at one of the first `step` peaks. Only peaks on the side facing the camera are drawn.
 */
export function romanescoRows(
  step: number,
  view: { rotationX: number; rotationY: number; grab?: Orientation; cameraDistance: number },
  width: number,
  height: number,
) {
  const camera: Camera = {
    rotation: viewRotation(view.rotationX, view.rotationY, view.grab),
    distance: view.cameraDistance,
    width,
    height,
  };
  return Array.from({ length: step }, (_, start) => {
    const lines: number[][][] = [];
    let line: number[][] = [];
    for (let index = start; index <= LAST_PEAK; index += step) {
      const peak = romanescoPeak(index);
      if (facesCamera(index, peak, camera)) line.push(project(peak, camera));
      else if (line.length) {
        lines.push(line);
        line = [];
      }
    }
    if (line.length) lines.push(line);
    return lines;
  });
}

export const ROMANESCO_LEAD: ConstructionLead = {
  initial: { rows: "8" },
  control: {
    kind: "options",
    path: "rows",
    label: "Spiral rows",
    options: [
      ...ROMANESCO_ROW_STEPS.map((step) => ({ value: String(step), label: `${step} rows` })),
      { value: "none", label: "No rows" },
    ],
  },
  readout: (view) => {
    if (view.rows === "none") return [];
    const step = Number(view.rows);
    const { turns, left } = romanescoRowTurn(step);
    return [
      {
        label: `${step} × 137.5°`,
        value: `${turns} turns ${left < 0 ? "−" : "+"} ${Math.abs(left).toFixed(0)}°`,
      },
    ];
  },
};
