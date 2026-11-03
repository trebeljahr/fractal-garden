export const LOGISTIC_LESSON_STEPS = 32;
export const SECOND_START_GAP = 0.001;
// A column leaves out this many answers, then marks the next ones.
export const SETTLE_STEPS = 2000;
export const KEPT_ANSWERS = 300;
const LONGEST_REPEAT = 64;
const REPEAT_TOLERANCE = 1e-4;

export function logisticNext(r: number, x: number) {
  return r * x * (1 - x);
}

export function logisticOrbit(r: number, start: number, steps = LOGISTIC_LESSON_STEPS) {
  if (
    !Number.isFinite(r) ||
    r < 0 ||
    r > 4 ||
    !Number.isFinite(start) ||
    start < 0 ||
    start > 1 ||
    !Number.isInteger(steps) ||
    steps < 0 ||
    steps > LOGISTIC_LESSON_STEPS
  )
    throw new RangeError("The lesson requires r in [0, 4], a start in [0, 1], and 0–32 steps.");
  const values = [start];
  for (let i = 0; i < steps; i++) values.push(logisticNext(r, values[i]));
  return values;
}

/** The answers one column marks. Every column starts at 0.5, as the explorer does. */
export function logisticColumn(r: number, settle = SETTLE_STEPS, keep = KEPT_ANSWERS) {
  let x = 0.5;
  for (let i = 0; i < settle; i++) x = logisticNext(r, x);
  const answers: number[] = [];
  for (let i = 0; i < keep; i++) {
    x = logisticNext(r, x);
    answers.push(x);
  }
  return answers;
}

/** The shortest repeat in these answers, or null. A short list can't prove there is no repeat. */
export function repeatLength(answers: number[]) {
  for (let length = 1; length <= LONGEST_REPEAT; length++) {
    let matches = true;
    for (let i = 0; matches && i + length < answers.length; i++)
      matches = Math.abs(answers[i] - answers[i + length]) < REPEAT_TOLERANCE;
    if (matches) return length;
  }
  return null;
}

/** The number c on the Mandelbrot set's horizontal axis that runs the same calculation as r. */
export function mandelbrotNumber(r: number) {
  return (r * (2 - r)) / 4;
}

const AXIS_RIGHT = 0.25;
const AXIS_LEFT = -2;

/** Position across a picture that runs c from 1/4 to -2, so r runs from 1 to 4. */
export function rToAcross(r: number) {
  return (AXIS_RIGHT - mandelbrotNumber(r)) / (AXIS_RIGHT - AXIS_LEFT);
}

export function acrossToR(across: number) {
  const c = AXIS_RIGHT - across * (AXIS_RIGHT - AXIS_LEFT);
  return 1 + Math.sqrt(Math.max(0, 1 - 4 * c));
}
