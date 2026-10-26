export type ContactPoint = { x: number; y: number };
export const CONTACT_SIZE = 41;
export const CONTACT_WALK_LIMIT = 2048;
export const CONTACT_SAMPLES = 800;
export const CONTACT_FORK: ContactPoint[] = [
  ...Array.from({ length: 9 }, (_, i) => ({ x: 20, y: 29 - i })),
  ...Array.from({ length: 10 }, (_, i) => ({ x: 19 - i, y: 20 - i })),
  ...Array.from({ length: 10 }, (_, i) => ({ x: 21 + i, y: 20 - i })),
];
export type ContactWalk = {
  start: ContactPoint;
  end: ContactPoint;
  steps: number;
  status: "stuck" | "discarded" | "limit";
};
const index = (p: ContactPoint) => p.y * CONTACT_SIZE + p.x;
const inside = (p: ContactPoint) =>
  p.x >= 0 && p.y >= 0 && p.x < CONTACT_SIZE && p.y < CONTACT_SIZE;
const MOVES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function randomStream(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function touches(p: ContactPoint, occupied: Set<number>) {
  for (let y = -1; y <= 1; y++)
    for (let x = -1; x <= 1; x++) {
      const q = { x: p.x + x, y: p.y + y };
      if ((x || y) && inside(q) && occupied.has(index(q))) return true;
    }
  return false;
}

export function contactExperiment(grow: boolean, count = CONTACT_SAMPLES, seed = 127) {
  const random = randomStream(seed);
  const occupied = new Set(CONTACT_FORK.map(index));
  const walks: ContactWalk[] = [];
  for (let i = 0; i < Math.max(0, Math.min(CONTACT_SAMPLES, Math.floor(count))); i++) {
    // One shared well-mixed stream, not correlated consecutive seeds for each walker.
    const side = Math.floor(random() * 4);
    const along = 1 + Math.floor(random() * (CONTACT_SIZE - 2));
    const start =
      side === 0
        ? { x: along, y: 1 }
        : side === 1
          ? { x: CONTACT_SIZE - 2, y: along }
          : side === 2
            ? { x: along, y: CONTACT_SIZE - 2 }
            : { x: 1, y: along };
    let point = { ...start };
    let steps = 0;
    let status: ContactWalk["status"] = "limit";
    if (occupied.has(index(point))) status = "discarded";
    else {
      for (;;) {
        if (!inside(point)) {
          status = "discarded";
          break;
        }
        if (touches(point, occupied)) {
          status = "stuck";
          break;
        }
        if (steps === CONTACT_WALK_LIMIT) break;
        const [dx, dy] = MOVES[Math.floor(random() * 4)];
        point = { x: point.x + dx, y: point.y + dy };
        steps++;
      }
    }
    walks.push({ start, end: point, steps, status });
    if (grow && status === "stuck") occupied.add(index(point));
  }
  return walks;
}

export function contactSummary(walks: readonly ContactWalk[]) {
  const counts = new Uint16Array(CONTACT_SIZE * CONTACT_SIZE);
  let stuck = 0,
    discarded = 0,
    unfinished = 0;
  for (const walk of walks) {
    if (walk.status === "stuck") {
      stuck++;
      counts[index(walk.end)]++;
    } else if (walk.status === "discarded") discarded++;
    else unfinished++;
  }
  return { counts, stuck, discarded, unfinished };
}
