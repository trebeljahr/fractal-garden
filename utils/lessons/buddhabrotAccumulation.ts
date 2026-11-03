export type OrbitPoint = { x: number; y: number };

// Long enough for the fine lines. The explorer's "Maximum iterations" means the same thing.
export const ROUTE_LIMIT = 2000;
export const NUMBERS_TO_TEST = 100_000_000;

// The explorer's upright view: imaginary numbers run across and real numbers run down.
export const BINS_PER_UNIT = 200;
export const PICTURE = { left: -1.3, top: -2, width: 2.6, height: 3 };
export const PICTURE_WIDTH = PICTURE.width * BINS_PER_UNIT;
export const PICTURE_HEIGHT = PICTURE.height * BINS_PER_UNIT;

// A recorded route is drawn in squares ten bins wide, so that a few dots can be seen.
export const HISTOGRAM_WIDTH = PICTURE_WIDTH / 10;
export const HISTOGRAM_HEIGHT = PICTURE_HEIGHT / 10;

// A route's length is the step on which it leaves the circle of radius 2, as in the explorer.
export const ROUTE_BANDS = [
  { from: 1, to: 20, label: "Up to 20 steps" },
  { from: 21, to: 200, label: "21 to 200 steps" },
  { from: 201, to: ROUTE_LIMIT, label: "201 to 2,000 steps" },
];
const LONG_ROUTES = 2;
export const routeBand = (length: number) => (length > 200 ? LONG_ROUTES : length > 20 ? 1 : 0);

/** Every position until the route leaves the circle of radius 2. The last one is outside it. */
export function traceRoute(c: OrbitPoint, limit = ROUTE_LIMIT) {
  const points: OrbitPoint[] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < limit; i++) {
    const next = x * x - y * y + c.x;
    y = 2 * x * y + c.y;
    x = next;
    points.push({ x, y });
    if (x * x + y * y > 4) return { points, escaped: true };
  }
  return { points, escaped: false };
}
export type Route = ReturnType<typeof traceRoute>;

const insideMainShapes = (x: number, y: number) => {
  const q = (x - 0.25) ** 2 + y * y;
  return q * (q + x - 0.25) <= 0.25 * y * y || (x + 1) ** 2 + y * y <= 0.0625;
};

/**
 * The step on which a route leaves the circle, or 0 if it stays for the whole limit. Landing
 * exactly on a saved position means the route repeats forever, so the rest needn't be calculated.
 */
export function routeLength(cx: number, cy: number, limit = ROUTE_LIMIT) {
  if (insideMainShapes(cx, cy)) return 0;
  let x = 0;
  let y = 0;
  let savedX = 0;
  let savedY = 0;
  let nextSave = 16;
  for (let step = 1; step <= limit; step++) {
    const next = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = next;
    if (x * x + y * y > 4) return step;
    if (x === savedX && y === savedY) return 0;
    if (step === nextSave) {
      savedX = x;
      savedY = y;
      nextSave *= 2;
    }
  }
  return 0;
}

export function visitBin(point: OrbitPoint) {
  const x = Math.floor((point.y - PICTURE.left) * (BINS_PER_UNIT / 10));
  const y = Math.floor((point.x - PICTURE.top) * (BINS_PER_UNIT / 10));
  return x >= 0 && x < HISTOGRAM_WIDTH && y >= 0 && y < HISTOGRAM_HEIGHT
    ? y * HISTOGRAM_WIDTH + x
    : -1;
}

/** Only escaping routes count. Their last position is outside the circle and is left out. */
export const routeVisits = (route: Route) => (route.escaped ? route.points.slice(0, -1) : []);

export function accumulateOrbits(routes: readonly Route[]) {
  const cells = new Uint32Array(HISTOGRAM_WIDTH * HISTOGRAM_HEIGHT);
  let escaped = 0;
  let visits = 0;
  for (const route of routes) {
    if (!route.escaped) continue;
    escaped++;
    for (const point of routeVisits(route)) {
      const bin = visitBin(point);
      if (bin < 0) continue;
      cells[bin]++;
      visits++;
    }
  }
  return { cells, escaped, visits };
}

// Fixed exposure: adding visits never makes another occupied bin dimmer.
export const visitOpacity = (count: number) => 1 - Math.exp(-count / 2);

// At the end of a full run this is the explorer's brightness at an exposure of 0.45. Each of the
// explorer's samples plots a mirror-image pair, as one pair here does.
const FULL_RUN_DENSITY = NUMBERS_TO_TEST / 2 / BINS_PER_UNIT ** 2;
export const visitLight = (count: number) => 1 - Math.exp((-0.9 * count) / FULL_RUN_DENSITY);
export const startLight = (count: number) => 0.42 * (1 - Math.exp(-count / 3));

const gray = (light: number) => {
  const level = Math.round(255 * light);
  return (0xff000000 | (level << 16) | (level << 8) | level) >>> 0;
};
const lookup = (size: number, light: (count: number) => number) =>
  Uint32Array.from({ length: size }, (_, count) => gray(light(count)));
const VISIT_PIXELS = lookup(16384, visitLight);
const START_PIXELS = lookup(64, startLight);
const OUTSIDE = gray(0);
const INSIDE = gray(0.16);

/** Which bins hold a number whose route never leaves. */
export function insideMap() {
  const map = new Uint8Array(PICTURE_WIDTH * PICTURE_HEIGHT);
  for (let row = 0; row < PICTURE_HEIGHT; row++) {
    const x = PICTURE.top + (row + 0.5) / BINS_PER_UNIT;
    for (let column = 0; column < PICTURE_WIDTH; column++) {
      const y = PICTURE.left + (column + 0.5) / BINS_PER_UNIT;
      if (routeLength(x, y) === 0 && x * x + y * y <= 4) map[row * PICTURE_WIDTH + column] = 1;
    }
  }
  return map;
}

const BATCH = 2048;

/** A finite, repeatable run through random numbers, split by how long their routes last. */
export class RouteRun {
  readonly visits = ROUTE_BANDS.map(() => new Uint32Array(PICTURE_WIDTH * PICTURE_HEIGHT));
  readonly starts = ROUTE_BANDS.map(() => new Uint16Array(PICTURE_WIDTH * PICTURE_HEIGHT));
  readonly routes = ROUTE_BANDS.map(() => 0);
  readonly dots = ROUTE_BANDS.map(() => 0);
  tested = 0;
  private seed = 2463534242;

  get finished() {
    return this.tested >= NUMBERS_TO_TEST;
  }

  /** Adds exactly what one route visits. A route that never escapes adds nothing. */
  addRoute(c: OrbitPoint, route: Route) {
    if (!route.escaped) return 0;
    const band = routeBand(route.points.length);
    const visits = routeVisits(route);
    let added = 0;
    for (const point of visits) {
      const column = Math.floor((point.y - PICTURE.left) * BINS_PER_UNIT);
      const row = Math.floor((point.x - PICTURE.top) * BINS_PER_UNIT);
      if (column < 0 || column >= PICTURE_WIDTH || row < 0 || row >= PICTURE_HEIGHT) continue;
      this.visits[band][row * PICTURE_WIDTH + column]++;
      added++;
    }
    this.routes[band]++;
    this.dots[band] += added;
    const column = Math.floor((c.y - PICTURE.left) * BINS_PER_UNIT);
    const row = Math.floor((c.x - PICTURE.top) * BINS_PER_UNIT);
    if (column >= 0 && column < PICTURE_WIDTH && row >= 0 && row < PICTURE_HEIGHT)
      this.starts[band][row * PICTURE_WIDTH + column]++;
    return added;
  }

  /** Tests numbers in mirror-image pairs. A number's mirror image follows the mirrored route. */
  testPairs(pairs: number) {
    const width = PICTURE_WIDTH;
    const height = PICTURE_HEIGHT;
    const left = PICTURE.left;
    const top = PICTURE.top;
    const scale = BINS_PER_UNIT;
    let seed = this.seed;
    for (let pair = 0; pair < pairs; pair++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const cx = -2 + (4 * (seed >>> 0)) / 4294967296;
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const cy = (2 * (seed >>> 0)) / 4294967296;
      const length = routeLength(cx, cy);
      if (length === 0) continue;
      const band = routeBand(length);
      const visits = this.visits[band];
      let dots = 0;
      let x = 0;
      let y = 0;
      for (let step = 1; step < length; step++) {
        const next = x * x - y * y + cx;
        y = 2 * x * y + cy;
        x = next;
        const across = (y - left) * scale;
        const down = (x - top) * scale;
        if (across < 0 || across >= width || down < 0 || down >= height) continue;
        const column = across | 0;
        const row = (down | 0) * width;
        visits[row + column]++;
        visits[row + width - 1 - column]++;
        dots += 2;
      }
      this.routes[band] += 2;
      this.dots[band] += dots;
      const across = (cy - left) * scale;
      const down = (cx - top) * scale;
      if (across >= 0 && across < width && down >= 0 && down < height) {
        const column = across | 0;
        const row = (down | 0) * width;
        this.starts[band][row + column]++;
        this.starts[band][row + width - 1 - column]++;
      }
    }
    this.seed = seed;
    this.tested += 2 * pairs;
  }

  /** Works until the deadline, so that a frame stays short. */
  run(deadline: number) {
    while (!this.finished && performance.now() < deadline)
      this.testPairs(Math.min(BATCH, (NUMBERS_TO_TEST - this.tested) / 2));
  }

  tally(band: number | null) {
    const sum = (values: number[]) =>
      band === null ? values.reduce((total, value) => total + value, 0) : values[band];
    return { routes: sum(this.routes), dots: sum(this.dots) };
  }
}

/** Paints visits with one fixed exposure, so a band's brightness can be compared with the rest. */
export function paintVisits(pixels: Uint32Array, run: RouteRun, band: number | null) {
  const last = VISIT_PIXELS.length - 1;
  if (band !== null) {
    const counts = run.visits[band];
    for (let i = 0; i < pixels.length; i++) pixels[i] = VISIT_PIXELS[Math.min(last, counts[i])];
    return;
  }
  const [a, b, c] = run.visits;
  for (let i = 0; i < pixels.length; i++)
    pixels[i] = VISIT_PIXELS[Math.min(last, a[i] + b[i] + c[i])];
}

/** Paints the numbers that started these routes over the shape of the numbers that never escape. */
export function paintStarts(
  pixels: Uint32Array,
  run: RouteRun | null,
  band: number | null,
  inside: Uint8Array,
) {
  const last = START_PIXELS.length - 1;
  for (let i = 0; i < pixels.length; i++) {
    let count = 0;
    if (run) {
      if (band !== null) count = run.starts[band][i];
      else count = run.starts[0][i] + run.starts[1][i] + run.starts[2][i];
    }
    pixels[i] = count > 0 ? START_PIXELS[Math.min(last, count)] : inside[i] ? INSIDE : OUTSIDE;
  }
}

// The second lesson. Its numbers are all long routes, so it tests only near the edge of the shape.
export const STEPS_SHOWN = 20;
const WANTED_NUMBERS = 60_000;
const CELL = 0.02;
const CELL_PROBES = 4;

export function edgeCells() {
  const cells: number[] = [];
  for (let row = 0; row < 2 / CELL; row++) {
    for (let column = 0; column < 4 / CELL; column++) {
      const x = -2 + column * CELL;
      const y = row * CELL;
      let leaves = false;
      let stays = false;
      let slow = false;
      for (let a = 0; a < CELL_PROBES; a++) {
        for (let b = 0; b < CELL_PROBES; b++) {
          const length = routeLength(
            x + (a * CELL) / (CELL_PROBES - 1),
            y + (b * CELL) / (CELL_PROBES - 1),
          );
          if (length === 0) stays = true;
          else leaves = true;
          if (length >= 30) slow = true;
        }
      }
      if (slow || (leaves && stays)) cells.push(x, y);
    }
  }
  return cells;
}

/** Long routes, kept so that any one step of all of them can be drawn at once. */
export class LongRoutes {
  readonly numbers = new Float64Array(WANTED_NUMBERS * 2);
  readonly allSteps = new Uint32Array(PICTURE_WIDTH * PICTURE_HEIGHT);
  found = 0;
  tested = 0;
  private cells = edgeCells();
  private seed = 88172645;

  get finished() {
    return this.found >= WANTED_NUMBERS;
  }

  private random() {
    let seed = this.seed;
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    this.seed = seed;
    return (seed >>> 0) / 4294967296;
  }

  find(tests: number) {
    for (let test = 0; test < tests && !this.finished; test++) {
      const cell = Math.floor(this.random() * (this.cells.length / 2)) * 2;
      const cx = this.cells[cell] + this.random() * CELL;
      const cy = this.cells[cell + 1] + this.random() * CELL;
      this.tested++;
      const length = routeLength(cx, cy);
      if (routeBand(length) !== LONG_ROUTES) continue;
      this.numbers[this.found * 2] = cx;
      this.numbers[this.found * 2 + 1] = cy;
      this.found++;
      let x = 0;
      let y = 0;
      for (let step = 1; step < length; step++) {
        const next = x * x - y * y + cx;
        y = 2 * x * y + cy;
        x = next;
        addMirrored(this.allSteps, x, y);
      }
    }
  }

  run(deadline: number) {
    while (!this.finished && performance.now() < deadline) this.find(64);
  }

  /** Where every number is after this many steps. Step 1 is the number itself. */
  stepCounts(step: number, counts: Uint32Array) {
    counts.fill(0);
    for (let i = 0; i < this.found; i++) {
      const cx = this.numbers[i * 2];
      const cy = this.numbers[i * 2 + 1];
      let x = 0;
      let y = 0;
      for (let k = 0; k < step; k++) {
        const next = x * x - y * y + cx;
        y = 2 * x * y + cy;
        x = next;
      }
      addMirrored(counts, x, y);
    }
  }
}

function addMirrored(counts: Uint32Array, x: number, y: number) {
  const across = (y - PICTURE.left) * BINS_PER_UNIT;
  const down = (x - PICTURE.top) * BINS_PER_UNIT;
  if (across < 0 || across >= PICTURE_WIDTH || down < 0 || down >= PICTURE_HEIGHT) return;
  const column = across | 0;
  const row = (down | 0) * PICTURE_WIDTH;
  counts[row + column]++;
  counts[row + PICTURE_WIDTH - 1 - column]++;
}

/**
 * Each picture is brightened on its own, because a single step holds far fewer dots than all.
 * A pixel with the average count reaches about this share of full brightness.
 */
export function paintCounts(pixels: Uint32Array, counts: Uint32Array, averageLight: number) {
  let total = 0;
  let occupied = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] === 0) continue;
    total += counts[i];
    occupied++;
  }
  const exposure = -Math.log(1 - averageLight) / Math.max(1, total / Math.max(1, occupied));
  for (let i = 0; i < counts.length; i++)
    pixels[i] = counts[i] === 0 ? OUTSIDE : gray(1 - Math.exp(-counts[i] * exposure));
}
