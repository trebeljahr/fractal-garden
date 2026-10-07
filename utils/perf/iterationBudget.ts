/**
 * Per-machine iteration budgets.
 *
 * Every time a fractal renders a level, the renderer reports how long that
 * level took and how much geometry ("work") it drew. From those samples we
 * predict the cost of the next level with a linear model (fixed overhead plus
 * a cost per unit of work) and only let the growth animation climb to levels
 * that stay inside the budget. The animation itself climbs one level at a
 * time, so it acts as the benchmark: a level is only attempted once the levels
 * below it have been measured and the prediction says it will stay snappy.
 *
 * Samples are cached in localStorage per fractal, so a repeat visit starts
 * from the cap found last time instead of climbing again.
 */

export type LevelSample = {
  /** Cost relative to the budget: 1 means exactly on budget. */
  load: number;
  /** Units of geometry drawn at this level (segments, faces, …). */
  work: number;
};

export type LevelSamples = Record<number, LevelSample>;

export type CostReport = {
  level: number;
  work: number;
  /** Time spent building the geometry. */
  buildMs: number;
  /** Time spent drawing one frame. */
  frameMs: number;
  /** True when the scene is redrawn every frame (e.g. auto-rotate). */
  continuous: boolean;
  /** True when the work ran on a worker thread instead of the main thread. */
  offThread: boolean;
};

/** A single redraw of an animated scene: 20 fps still reads as smooth rotation. */
export const FRAME_BUDGET_MS = 1000 / 20;
/** One growth step on the main thread: longer and the page visibly stalls. */
export const MAIN_THREAD_STEP_BUDGET_MS = 150;
/** One growth step on a worker: the page stays responsive, the step should still feel quick. */
export const WORKER_STEP_BUDGET_MS = 500;

// Samples store load relative to the budgets above, so bump the version
// whenever a budget changes.
const STORAGE_PREFIX = "fractal-garden:iteration-budget:v2:";
const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Predictions stay a little pessimistic: overshooting tanks the machine,
// undershooting only hides one level from the animation.
const SAFETY_FACTOR = 1.3;

export function loadFromReport(report: CostReport) {
  const stepBudget = report.offThread ? WORKER_STEP_BUDGET_MS : MAIN_THREAD_STEP_BUDGET_MS;
  if (report.continuous) {
    return Math.max(report.buildMs / stepBudget, report.frameMs / FRAME_BUDGET_MS);
  }
  return (report.buildMs + report.frameMs) / stepBudget;
}

/**
 * Predicts the load of `level` from the two measured levels below it.
 * Returns null when there is not enough data to predict.
 */
export function predictLoad(samples: LevelSamples, level: number) {
  const previous = samples[level - 1];
  if (!previous) return null;

  const older = samples[level - 2];
  if (!older || previous.work <= older.work) {
    // One data point and no trend yet: assume a steep tenfold growth.
    return previous.load * 10;
  }

  const growth = previous.work / older.work;
  const nextWork = previous.work * growth;
  // Linear model: load = overhead + perUnit * work, fitted through both levels.
  const perUnit = Math.max(0, (previous.load - older.load) / (previous.work - older.work));
  const floorPerUnit = (previous.load / previous.work) * 0.25;
  const predicted = previous.load + Math.max(perUnit, floorPerUnit) * (nextWork - previous.work);
  return predicted * SAFETY_FACTOR;
}

/**
 * Highest level in [min, max] the animation should reach. Measured levels
 * count as they were measured; the first unmeasured level is allowed only if
 * the prediction keeps it inside the budget, so the cap grows one level per
 * measurement.
 */
export function computeCap(samples: LevelSamples, min: number, max: number) {
  let cap = min;
  for (let level = min; level <= max; level++) {
    const sample = samples[level];
    if (sample) {
      if (sample.load > 1 && level > min) break;
      cap = level;
      continue;
    }

    if (level === min) {
      cap = level;
      continue;
    }

    const predicted = predictLoad(samples, level);
    if (predicted !== null && predicted <= 1) cap = level;
    break;
  }
  return cap;
}

type StoredSamples = { savedAt: number; samples: LevelSamples };

export function readSamples(key: string): LevelSamples {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return {};
    const stored = JSON.parse(raw) as StoredSamples;
    if (!stored?.samples || Date.now() - stored.savedAt > STORAGE_TTL_MS) return {};
    return stored.samples;
  } catch {
    return {};
  }
}

export function writeSamples(key: string, samples: LevelSamples) {
  try {
    const stored: StoredSamples = { savedAt: Date.now(), samples };
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(stored));
  } catch {
    // Storage can be full or blocked; the budget still works for this visit.
  }
}
