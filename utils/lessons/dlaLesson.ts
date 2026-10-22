export type DlaPoint = { x: number; y: number };
export type DlaStatus = "walking" | "stuck" | "discarded" | "limit";
export type DlaFrame = { point: DlaPoint; status: DlaStatus };
export type DlaWalkOptions = {
  start?: DlaPoint;
  cluster?: readonly DlaPoint[];
  size?: number;
  maxSteps?: number;
};

export const DLA_LESSON_SIZE = 13;
export const DLA_LESSON_START: DlaPoint = { x: 6, y: 2 };
export const DLA_LESSON_CLUSTER: readonly DlaPoint[] = [{ x: 6, y: 6 }];
export const DLA_MAX_WALK_STEPS = 128;

const MOVES = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;

export function dlaContactCells(point: DlaPoint, cluster: readonly DlaPoint[]) {
  return cluster.filter(
    (cell) => Math.max(Math.abs(cell.x - point.x), Math.abs(cell.y - point.y)) === 1,
  );
}

// Replay unit cardinal moves. Unlike the full explorer, this small model has
// no long jumps and discards the walker at the edge of its fixed window.
export function traceDlaWalk(seed: number, options: DlaWalkOptions = {}): DlaFrame[] {
  const start = options.start ?? DLA_LESSON_START;
  const cluster = options.cluster ?? DLA_LESSON_CLUSTER;
  const size = options.size ?? DLA_LESSON_SIZE;
  const maxSteps = Math.max(
    0,
    Math.min(DLA_MAX_WALK_STEPS, Math.floor(options.maxSteps ?? DLA_MAX_WALK_STEPS)),
  );
  const inside = ({ x, y }: DlaPoint) => x >= 0 && y >= 0 && x < size && y < size;
  if (cluster.some((cell) => cell.x === start.x && cell.y === start.y)) {
    throw new Error("A DLA walker must start outside the frozen cluster.");
  }
  const status = (point: DlaPoint): DlaStatus =>
    !inside(point) ? "discarded" : dlaContactCells(point, cluster).length ? "stuck" : "walking";
  let point = { ...start };
  const frames: DlaFrame[] = [{ point, status: status(point) }];
  let randomState = seed >>> 0 || 1;
  for (let step = 0; step < maxSteps && frames[frames.length - 1].status === "walking"; step++) {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    const move = MOVES[Math.floor(((randomState >>> 0) / 4294967296) * 4)];
    point = { x: point.x + move.x, y: point.y + move.y };
    frames.push({ point, status: status(point) });
  }
  if (frames[frames.length - 1].status === "walking") frames[frames.length - 1].status = "limit";
  return frames;
}
