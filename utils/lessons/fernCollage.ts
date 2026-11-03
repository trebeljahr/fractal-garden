export type FernMove = number[];
export type FernBox = { left: number; right: number; bottom: number; top: number };
export type FernSpot = { x: number; y: number };

// The rectangle around the whole fern, which runs from x = -2.18 to 2.66 and y = 0 to 10.
export const FERN_BOX: FernBox = { left: -2.2, right: 2.7, bottom: 0, top: 10 };
// The picture leaves room around the four parallelograms to drag them.
export const FERN_WINDOW: FernBox = { left: -3.6, right: 3.9, bottom: -0.6, top: 10.6 };

// Three corners fix a parallelogram, so the first corner follows the other three.
export const HANDLE_CORNERS = [1, 2, 3];

/** Where a move (a, b, c, d, e, f) sends the box's bottom left, bottom right, top right and top left. */
export function moveCorners([a, b, c, d, e, f]: FernMove, box = FERN_BOX): FernSpot[] {
  return [
    [box.left, box.bottom],
    [box.right, box.bottom],
    [box.right, box.top],
    [box.left, box.top],
  ].map(([x, y]) => ({ x: a * x + b * y + e, y: c * x + d * y + f }));
}

/** The move whose parallelogram has this corner here, with the other two handles left in place. */
export function moveWithCorner(
  move: FernMove,
  corner: number,
  spot: FernSpot,
  box = FERN_BOX,
): FernMove {
  const corners = moveCorners(move, box);
  corners[corner] = spot;
  const [, bottomRight, topRight, topLeft] = corners;
  const width = box.right - box.left;
  const height = box.top - box.bottom;
  const a = (topRight.x - topLeft.x) / width;
  const c = (topRight.y - topLeft.y) / width;
  const b = (topRight.x - bottomRight.x) / height;
  const d = (topRight.y - bottomRight.y) / height;
  return [
    a,
    b,
    c,
    d,
    bottomRight.x - a * box.right - b * box.bottom,
    bottomRight.y - c * box.right - d * box.bottom,
  ];
}

/** Half-size copies of the box, one per quarter: bottom left, top right, top left, bottom right. */
export function coverMoves(box = FERN_BOX): FernMove[] {
  return [
    [box.left, box.bottom],
    [box.right, box.top],
    [box.left, box.top],
    [box.right, box.bottom],
  ].map(([x, y]) => [0.5, 0, 0, 0.5, x / 2, y / 2]);
}

const PIXEL_FINISHED = 0.35;
const SMALL_ENOUGH_TO_CHECK = 4;
const FIELDS = 6;
const MOVE_COUNT = 4;
const MOST_WAITING = 512;
const MOST_VISITS = 12_000_000;

// Dots this far out belong to moves that no longer shrink. They start again instead of overflowing.
const LOST = 1000;
const SETTLING_DOTS = 32;

/** Pixels a fern is drawn into. Each pixel takes the color of the move that last landed there. */
export class FernPlot {
  dots = 0;
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint32Array;
  readonly window: FernBox;
  readonly scaleX: number;
  readonly scaleY: number;
  private readonly colors: number[];
  readonly emptyPixel: number;
  private x = 0;
  private y = 0;
  private settling = SETTLING_DOTS;
  private random = 88172645;

  constructor(
    width: number,
    height: number,
    pixels: Uint32Array,
    colors: number[],
    background: number,
    window = FERN_WINDOW,
  ) {
    this.width = width;
    this.height = height;
    this.pixels = pixels;
    this.colors = colors;
    this.emptyPixel = background;
    this.window = window;
    this.scaleX = width / (window.right - window.left);
    this.scaleY = height / (window.top - window.bottom);
    this.clear();
  }

  clear() {
    this.pixels.fill(this.emptyPixel);
    this.dots = 0;
    this.x = 0;
    this.y = 0;
    this.settling = SETTLING_DOTS;
  }

  mark(x: number, y: number, move: number) {
    const column = (x - this.window.left) * this.scaleX;
    const row = (this.window.top - y) * this.scaleY;
    if (column >= 0 && column < this.width && row >= 0 && row < this.height)
      this.pixels[Math.floor(row) * this.width + Math.floor(column)] = this.colors[move];
  }

  /** Plays the game: pick a move by its chance, apply it to the dot, draw the dot. */
  sow(moves: FernMove[], chances: number[], count: number) {
    const first = chances[0];
    const second = first + chances[1];
    const third = second + chances[2];
    const numbers = new Float64Array(moves.flat());
    let x = this.x;
    let y = this.y;
    let random = this.random;
    for (let k = 0; k < count; k++) {
      random ^= random << 13;
      random ^= random >>> 17;
      random ^= random << 5;
      const pick = (random >>> 0) / 4294967296;
      const index = pick < first ? 0 : pick < second ? 1 : pick < third ? 2 : 3;
      const at = index * FIELDS;
      const nextX = numbers[at] * x + numbers[at + 1] * y + numbers[at + 4];
      y = numbers[at + 2] * x + numbers[at + 3] * y + numbers[at + 5];
      x = nextX;
      if (!(Math.abs(x) < LOST && Math.abs(y) < LOST)) {
        x = 0;
        y = 0;
        this.settling = SETTLING_DOTS;
      }
      if (this.settling > 0) {
        this.settling--;
        continue;
      }
      this.mark(x, y, index);
      this.dots++;
    }
    this.x = x;
    this.y = y;
    this.random = random;
  }
}

/** A box that holds the moves' final shape, from applying all four to it until it settles. */
export function fernExtent(moves: FernMove[]) {
  let box = { x: 0, y: 0, rx: 1, ry: 1 };
  for (let k = 0; k < 96; k++) {
    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.POSITIVE_INFINITY;
    let top = Number.NEGATIVE_INFINITY;
    for (const [a, b, c, d, e, f] of moves) {
      const x = a * box.x + b * box.y + e;
      const y = c * box.x + d * box.y + f;
      const rx = Math.abs(a) * box.rx + Math.abs(b) * box.ry;
      const ry = Math.abs(c) * box.rx + Math.abs(d) * box.ry;
      left = Math.min(left, x - rx);
      right = Math.max(right, x + rx);
      bottom = Math.min(bottom, y - ry);
      top = Math.max(top, y + ry);
    }
    box = {
      x: (left + right) / 2,
      y: (bottom + top) / 2,
      rx: Math.min((right - left) / 2, LOST),
      ry: Math.min((top - bottom) / 2, LOST),
    };
  }
  return box;
}

/**
 * Applies all four moves to everything, with no chance involved. It follows every sequence of
 * moves until what remains of the fern is smaller than a pixel.
 */
export class FernWalk {
  private readonly waiting = new Float64Array(MOST_WAITING * FIELDS);
  private readonly colors = new Uint8Array(MOST_WAITING);
  private readonly moves: Float64Array;
  private readonly plot: FernPlot;
  private readonly extent: ReturnType<typeof fernExtent>;
  private size = 1;
  private visits = 0;

  constructor(moves: FernMove[], plot: FernPlot) {
    this.moves = new Float64Array(moves.flat());
    this.plot = plot;
    this.extent = fernExtent(moves);
    this.waiting.set([1, 0, 0, 1, 0, 0]);
  }

  private covered(column: number, row: number, wide: number, tall: number) {
    const { width, height, pixels } = this.plot;
    const background = this.plot.emptyPixel;
    const lastRow = Math.min(height - 1, Math.floor(row + tall));
    const firstColumn = Math.max(0, Math.floor(column - wide));
    const lastColumn = Math.min(width - 1, Math.floor(column + wide));
    for (let y = Math.max(0, Math.floor(row - tall)); y <= lastRow; y++)
      for (let x = firstColumn; x <= lastColumn; x++)
        if (pixels[y * width + x] === background) return false;
    return true;
  }

  /** Works until the deadline. Returns true once the shape is finished. */
  run(deadline = Number.POSITIVE_INFINITY) {
    const waiting = this.waiting;
    const colors = this.colors;
    const moves = this.moves;
    const plot = this.plot;
    const extent = this.extent;
    const { scaleX, scaleY, window } = plot;
    let checked = 0;
    while (this.size > 0) {
      if (this.visits > MOST_VISITS) return true;
      if (++checked === 4096) {
        checked = 0;
        if (performance.now() > deadline) return false;
      }
      this.visits++;
      this.size--;
      const at = this.size * FIELDS;
      const a = waiting[at];
      const b = waiting[at + 1];
      const c = waiting[at + 2];
      const d = waiting[at + 3];
      const e = waiting[at + 4];
      const f = waiting[at + 5];
      const color = colors[this.size];
      const x = a * extent.x + b * extent.y + e;
      const y = c * extent.x + d * extent.y + f;
      const wide = (Math.abs(a) * extent.rx + Math.abs(b) * extent.ry) * scaleX;
      const tall = (Math.abs(c) * extent.rx + Math.abs(d) * extent.ry) * scaleY;
      const finished = wide < PIXEL_FINISHED && tall < PIXEL_FINISHED;
      if (finished || this.size + MOVE_COUNT > MOST_WAITING) {
        plot.mark(x, y, color);
        continue;
      }
      if (
        wide < SMALL_ENOUGH_TO_CHECK &&
        tall < SMALL_ENOUGH_TO_CHECK &&
        this.covered((x - window.left) * scaleX, (window.top - y) * scaleY, wide, tall)
      )
        continue;
      const root = this.visits === 1;
      for (let move = 0; move < MOVE_COUNT; move++) {
        const m = move * FIELDS;
        const next = this.size * FIELDS;
        waiting[next] = a * moves[m] + b * moves[m + 2];
        waiting[next + 1] = a * moves[m + 1] + b * moves[m + 3];
        waiting[next + 2] = c * moves[m] + d * moves[m + 2];
        waiting[next + 3] = c * moves[m + 1] + d * moves[m + 3];
        waiting[next + 4] = a * moves[m + 4] + b * moves[m + 5] + e;
        waiting[next + 5] = c * moves[m + 4] + d * moves[m + 5] + f;
        // The color says which move came last: the one split off at the very start.
        colors[this.size] = root ? move : color;
        this.size++;
      }
    }
    return true;
  }
}
