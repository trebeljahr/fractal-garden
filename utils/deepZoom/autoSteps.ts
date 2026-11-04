import type { DeepViewport } from "./math";

/** Below this half-span, double-precision orbits are too coarse to compare neighboring pixels. */
export const AUTO_STEPS_MAX_DEPTH_BITS = 32;
export const AUTO_STEPS_MINIMUM = 150;

const COUNTS_PER_COLOR_ROUND = 40;
const PROBE_CAP = 8000;
const PROBE_COLUMNS = 80;
const PROBE_ROWS = 50;
const BAILOUT = 65536;
const BAND_RATIO = 2 ** 0.25;
const SCAN_START = 50;
const MIN_BAND_SAMPLES = 6;
const NOISY_SHARE = 0.7;
/** Ignore smaller changes, so the picture does not flicker as the view moves. */
const HOLD_RATIO = 1.5;

export type StepLimitProbe = {
  view: DeepViewport;
  /** Size of the drawn picture in device pixels. */
  width: number;
  height: number;
  colorDensity: number;
};

function fixedToDouble(value: bigint, bits: number) {
  const drop = Math.max(0, bits - 62);
  return Number(value >> BigInt(drop)) * 2 ** (drop - bits);
}

/** The smooth escape count, or -1 for a point that repeats or stays inside until the cap. */
function escapeCount(cr: number, ci: number) {
  let x = 0;
  let y = 0;
  let savedX = 0;
  let savedY = 0;
  let saveAt = 8;
  for (let step = 0; step < PROBE_CAP; step++) {
    const nextX = x * x - y * y + cr;
    y = 2 * x * y + ci;
    x = nextX;
    const size = x * x + y * y;
    if (size > BAILOUT) {
      return Math.max(step + 1 - Math.log2(Math.max(Math.log(size) / 2, 1e-6)), 0);
    }
    const dx = x - savedX;
    const dy = y - savedY;
    if (dx * dx + dy * dy < 1e-24) return -1;
    if (step === saveAt) {
      savedX = x;
      savedY = y;
      saveAt *= 2;
    }
  }
  return -1;
}

/** Each sample is one pixel's escape count and how far its right and lower neighbors differ. */
function sampleView({ view, width, height }: StepLimitProbe) {
  const centerX = fixedToDouble(view.x, view.bits);
  const centerY = fixedToDouble(view.y, view.bits);
  const pixel = (2 * 2 ** view.logZoom) / Math.min(width, height);
  const samples: [count: number, difference: number][] = [];
  for (let row = 0; row < PROBE_ROWS; row++) {
    for (let column = 0; column < PROBE_COLUMNS; column++) {
      const px = Math.floor(((column + 0.5) * width) / PROBE_COLUMNS);
      const py = Math.floor(((row + 0.5) * height) / PROBE_ROWS);
      const cr = centerX + (px + 0.5 - width / 2) * pixel;
      const ci = centerY + (height / 2 - py - 0.5) * pixel;
      const count = escapeCount(cr, ci);
      if (count < 0) continue;
      const right = escapeCount(cr + pixel, ci);
      const below = escapeCount(cr, ci - pixel);
      samples.push([
        count,
        Math.max(
          right < 0 ? Number.POSITIVE_INFINITY : Math.abs(right - count),
          below < 0 ? Number.POSITIVE_INFINITY : Math.abs(below - count),
        ),
      ]);
    }
  }
  return samples;
}

/**
 * Colors repeat every 40 / density steps. Where most neighboring pixels differ by more than
 * that, color is noise, so the limit stops there and those pixels stay black.
 */
export function probeStepLimit(probe: StepLimitProbe) {
  const samples = sampleView(probe);
  const noise = COUNTS_PER_COLOR_ROUND / Math.max(probe.colorDensity, 1e-3);
  for (let low = SCAN_START; low < PROBE_CAP; low *= BAND_RATIO) {
    const band = samples.filter(([count]) => count >= low && count < low * BAND_RATIO);
    if (band.length < MIN_BAND_SAMPLES) continue;
    const noisy = band.filter(([, difference]) => difference > noise).length;
    if (noisy / band.length >= NOISY_SHARE) {
      return Math.max(AUTO_STEPS_MINIMUM, Math.round(low));
    }
  }
  // No noise anywhere: leave room above nearly all pixels. A few slow pixels in thin
  // filaments stay black, or the opening view would pay for them across its whole interior.
  const counts = samples.map(([count]) => count).sort((a, b) => a - b);
  const typicalSlowest = counts[Math.floor(counts.length * 0.995)] ?? 0;
  return Math.max(AUTO_STEPS_MINIMUM, Math.min(PROBE_CAP, Math.round(typicalSlowest * 1.25)));
}

export function nextStepLimit(current: number, picked: number) {
  const ratio = picked / Math.max(current, 1);
  return ratio >= HOLD_RATIO || ratio <= 1 / HOLD_RATIO ? picked : current;
}
