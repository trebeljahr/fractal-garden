export const LOGISTIC_LESSON_STEPS = 32;

export type LogisticPoint = { x: number; y: number };
export type CobwebSegment = {
  from: LogisticPoint;
  to: LogisticPoint;
  iteration: number;
  leg: "curve" | "diagonal";
};

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

export function cobwebSegments(values: number[]): CobwebSegment[] {
  const segments: CobwebSegment[] = [];
  for (let i = 1; i < values.length; i++) {
    const input = values[i - 1];
    const next = values[i];
    const curve = { x: input, y: next };
    const diagonal = { x: next, y: next };
    segments.push(
      {
        from: { x: input, y: i === 1 ? 0 : input },
        to: curve,
        iteration: i,
        leg: "curve",
      },
      { from: curve, to: diagonal, iteration: i, leg: "diagonal" },
    );
  }
  return segments;
}
