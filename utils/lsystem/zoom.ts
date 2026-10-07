import { MAX_SEGMENTS } from "./engine";
import type { LSystemSpec } from "./spec";

// Endless zoom for flat, deterministic L-systems.
//
// The rewriting forms a tree: every symbol of generation n becomes its
// replacement in generation n + 1. Instead of building the whole string, the
// walker below descends that tree only where the view needs it. Off-screen
// subtrees are skipped in one step and subtrees smaller than a pixel are drawn
// as a single line, so the cost follows what is visible, not the full size.
//
// Skipping relies on a table of effects: what a symbol rewritten k times does
// to the turtle (where it ends, how it turns, how it changes step length and
// width), how many lines it draws, and a circle that holds its drawing. In a
// context-free system without random choices that is the same for every copy
// of the symbol, up to the turtle's position, heading and step length.

const DEG = Math.PI / 180;

// Deeper than this the drawing would need more than double precision.
export const MAX_ZOOM = 1e10;
// Lines worth drawing for one view. Past this, a coarser generation is used.
const LINE_BUDGET = 300_000;
// Subtrees whose circle is smaller than this many pixels become one line.
const MIN_RADIUS = 0.6;

// The drawing of a subtree in a frame where the turtle starts at the origin,
// heading along +x, with step length and width 1. r < 0: it draws nothing.
//
// Turns are counted exactly, as whole steps of the angle plus half turns
// from "|". Adding up floating point angles instead lets each copy's tiny
// error multiply with the number of copies, and after a few dozen
// generations the heading would be off by whole radians.
type Effect = {
  x: number;
  y: number;
  steps: number;
  halves: number;
  len: number;
  wid: number;
  lines: number;
  // Deepest bracket nesting reached, for the "branch depth" colors.
  nesting: number;
  cx: number;
  cy: number;
  r: number;
};

export type ZoomView = {
  // The drawing point at the middle of the view, in the drawing's units.
  centerX: number;
  centerY: number;
  // Screen pixels per drawing unit.
  scale: number;
  // Half the size of the area to fill, in pixels (the view plus a margin).
  halfWidth: number;
  halfHeight: number;
  zoom: number;
};

export type ZoomDetail = {
  // Six floats per line: x1 y1 0 x2 y2 0, in pixels from the view's middle,
  // with y pointing up like the drawing. Pixels keep float32 precise at any
  // zoom, where drawing units would not.
  positions: Float32Array;
  widths: Float32Array;
  colors: Float32Array;
  count: number;
  generation: number;
  limited: boolean;
  view: ZoomView;
};

export type ZoomSystem = {
  render: (view: ZoomView) => ZoomDetail;
};

function circleUnion(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): [number, number, number] {
  if (br < 0) return [ax, ay, ar];
  if (ar < 0) return [bx, by, br];
  const d = Math.hypot(bx - ax, by - ay);
  if (d + br <= ar) return [ax, ay, ar];
  if (d + ar <= br) return [bx, by, br];
  const r = (d + ar + br) / 2;
  const k = (r - ar) / d;
  return [ax + (bx - ax) * k, ay + (by - ay) * k, r];
}

function balanced(text: string) {
  let open = 0;
  for (const char of text) {
    if (char === "[") open++;
    else if (char === "]" && --open < 0) return false;
  }
  return open === 0;
}

// The number of angle steps that make a full circle, if a small one exists
// (4 for 90°, 3600 for 25.7°). Step counts are kept below it, so they stay
// small integers however many copies add up.
function stepsPerCircle(degrees: number) {
  for (let n = 1; n <= 100_000; n++) {
    const turns = (n * degrees) / 360;
    if (Math.abs(turns - Math.round(turns)) < 1e-9 && Math.round(turns) !== 0) return n;
  }
  return 0;
}

// Returns the system, or the reason endless zoom cannot work for it.
export function prepareZoom(spec: LSystemSpec, iterations: number): ZoomSystem | string {
  if (spec.dimension !== "2d") return "it only works for 2D systems";
  const rules = new Map<string, string>();
  for (const rule of spec.rules) {
    if (!rule.symbol) continue;
    if (rules.has(rule.symbol)) return "a symbol with several random rules differs in every copy";
    rules.set(rule.symbol, rule.replacement);
  }
  if (!balanced(spec.axiom) || Array.from(rules.values()).some((r) => !balanced(r))) {
    return "every rule needs matching [ and ]";
  }

  const draw = new Set(spec.drawSymbols);
  const move = new Set(spec.moveSymbols);
  const angle = spec.angle * DEG;
  const circle = stepsPerCircle(Math.abs(spec.angle));
  const reduceSteps = (steps: number) => (circle ? ((steps % circle) + circle) % circle : steps);
  const headingOf = (steps: number, halves: number) => steps * angle + (halves & 1) * Math.PI;

  const memo = new Map<string, Effect[]>();
  const effectOf = (symbol: string, depth: number): Effect => {
    let list = memo.get(symbol);
    if (!list) {
      list = [];
      memo.set(symbol, list);
    }
    let effect = list[depth];
    if (!effect) {
      effect = fold(rules.get(symbol) ?? "", depth - 1);
      list[depth] = effect;
    }
    return effect;
  };

  // What `text` does after `depth` rewritings, built from the effects of its
  // symbols. Mirrors the turtle in engine.ts: "+" turns clockwise on screen.
  function fold(text: string, depth: number): Effect {
    let x = 0;
    let y = 0;
    let steps = 0;
    let halves = 0;
    let len = 1;
    let wid = 1;
    let nesting = 0;
    let deepest = 0;
    let lines = 0;
    let bound: [number, number, number] = [0, 0, -1];
    const stack: number[] = [];

    for (const char of text) {
      if (depth > 0 && rules.has(char)) {
        const e = effectOf(char, depth);
        const heading = headingOf(steps, halves);
        const cos = Math.cos(heading) * len;
        const sin = Math.sin(heading) * len;
        if (e.r >= 0) {
          bound = circleUnion(
            ...bound,
            x + e.cx * cos - e.cy * sin,
            y + e.cx * sin + e.cy * cos,
            e.r * len,
          );
        }
        x += e.x * cos - e.y * sin;
        y += e.x * sin + e.y * cos;
        steps = reduceSteps(steps + e.steps);
        halves = (halves + e.halves) & 1;
        len *= e.len;
        wid *= e.wid;
        lines += e.lines;
        deepest = Math.max(deepest, nesting + e.nesting);
        continue;
      }
      if (draw.has(char) || move.has(char)) {
        const heading = headingOf(steps, halves);
        const nx = x + Math.cos(heading) * len;
        const ny = y + Math.sin(heading) * len;
        if (draw.has(char)) {
          bound = circleUnion(...bound, (x + nx) / 2, (y + ny) / 2, len / 2);
          lines++;
        }
        x = nx;
        y = ny;
        continue;
      }
      switch (char) {
        case "+":
          steps = reduceSteps(steps - 1);
          break;
        case "-":
          steps = reduceSteps(steps + 1);
          break;
        case "|":
          halves ^= 1;
          break;
        case "[":
          stack.push(x, y, steps, halves, len, wid, nesting);
          nesting++;
          if (nesting > deepest) deepest = nesting;
          break;
        case "]":
          [x, y, steps, halves, len, wid, nesting] = stack.splice(stack.length - 7, 7);
          break;
        case ">":
          len *= spec.lengthFactor;
          break;
        case "<":
          len /= spec.lengthFactor;
          break;
        case "!":
          wid *= spec.widthFactor;
          break;
        case "#":
          wid /= spec.widthFactor;
          break;
      }
    }

    const [cx, cy, r] = bound;
    return { x, y, steps, halves, len, wid, lines, nesting: deepest, cx, cy, r };
  }

  // How the drawing changes from one generation to the next: a scale and a
  // turn. Drawing generation n + m shrunk and turned back by that much lines
  // it up with generation n, so zooming in can swap in later generations.
  // It is read off the symbol whose end point moves most consistently. Some
  // curves only repeat their orientation every few generations (the
  // Sierpinski arrowhead flips each time), so a period of up to 4 is allowed.
  const growthOf = () => {
    const texts = [spec.axiom, ...Array.from(rules.keys())];
    const tracks = texts.map((text) => {
      const track: Effect[] = [];
      for (let k = 1; k <= 64; k++) {
        const effect = fold(text, k);
        track.push(effect);
        if (effect.r > 1e12 || Math.hypot(effect.x, effect.y) > 1e12) break;
      }
      return track;
    });
    const ratio = (a: Effect, b: Effect) => {
      const n = b.x * b.x + b.y * b.y;
      return [(a.x * b.x + a.y * b.y) / n, (a.y * b.x - a.x * b.y) / n];
    };
    for (let period = 1; period <= 4; period++) {
      let best: { scale: number; turn: number; reach: number } | null = null;
      for (const track of tracks) {
        const last = track.length - 1;
        if (last - period - 1 < 0) continue;
        const end = track[last];
        const before = track[last - period];
        const reach = Math.hypot(end.x, end.y) / Math.max(end.r, 1e-12);
        if (reach < 1e-6 || Math.hypot(before.x, before.y) < before.r * 1e-6) continue;
        const [ax, ay] = ratio(end, before);
        const [bx, by] = ratio(track[last - 1], track[last - 1 - period]);
        if (Math.hypot(ax - bx, ay - by) > 1e-4 * Math.hypot(ax, ay)) continue;
        if (!best || reach > best.reach) {
          best = { scale: Math.hypot(ax, ay), turn: Math.atan2(ay, ax), reach };
        }
      }
      if (best) return { period, scale: best.scale, turn: best.turn };
    }
    // Nothing moves consistently: fall back to the size of the whole drawing.
    const track = tracks[0];
    const last = track.length - 1;
    if (last < 1 || track[last - 1].r <= 0) return { period: 1, scale: 0, turn: 0 };
    return { period: 1, scale: track[last].r / track[last - 1].r, turn: 0 };
  };

  const { period, scale: growth, turn: rotation } = growthOf();
  if (!(growth > 1.05)) return "its drawing does not grow from one generation to the next";

  const startTurn = Math.PI / 2 - spec.startAngle * DEG;

  // Draws generation `iterations + steps * period`. Stops after `budget`
  // lines and sets `limited`.
  const attempt = (view: ZoomView, periods: number, budget: number): ZoomDetail => {
    const generation = iterations + periods * period;
    const whole = fold(spec.axiom, generation);
    const totalLines = Math.max(whole.lines - 1, 1);
    const deepest = Math.max(whole.nesting, 1);
    const mode = spec.colorMode;
    const { centerX, centerY, scale, halfWidth, halfHeight } = view;

    let capacity = 1 << 14;
    let positions = new Float32Array(capacity * 6);
    let widths = new Float32Array(capacity);
    let colors = new Float32Array(capacity);
    let count = 0;
    let limited = false;

    // Shrinking and turning back by `periods` generations lines the result
    // up with the starting generation.
    const base = startTurn - periods * rotation;
    let x = 0;
    let y = 0;
    let steps = 0;
    let halves = 0;
    let len = growth ** -periods;
    let wid = 1;
    let nesting = 0;
    let index = 0;

    const emit = (x2: number, y2: number) => {
      if (count >= budget) {
        limited = true;
        return;
      }
      if (count === capacity) {
        capacity *= 2;
        const p = new Float32Array(capacity * 6);
        p.set(positions);
        positions = p;
        const w = new Float32Array(capacity);
        w.set(widths);
        widths = w;
        const c = new Float32Array(capacity);
        c.set(colors);
        colors = c;
      }
      const o = count * 6;
      positions[o] = (x - centerX) * scale;
      positions[o + 1] = (y - centerY) * scale;
      positions[o + 3] = (x2 - centerX) * scale;
      positions[o + 4] = (y2 - centerY) * scale;
      widths[count] = wid;
      colors[count] =
        mode === "gradient" ? index / totalLines : mode === "depth" ? nesting / deepest : 0;
      count++;
    };

    const onScreen = (px: number, py: number, radius: number) =>
      Math.abs(px - centerX) * scale - radius < halfWidth &&
      Math.abs(py - centerY) * scale - radius < halfHeight;

    const walk = (text: string, depth: number) => {
      const stack: number[] = [];
      for (const char of text) {
        if (limited) return;
        if (depth > 0 && rules.has(char)) {
          const e = effectOf(char, depth);
          const heading = base + headingOf(steps, halves);
          const cos = Math.cos(heading) * len;
          const sin = Math.sin(heading) * len;
          const endX = x + e.x * cos - e.y * sin;
          const endY = y + e.x * sin + e.y * cos;
          if (e.r >= 0) {
            const radius = e.r * len * scale;
            const visible = onScreen(
              x + e.cx * cos - e.cy * sin,
              y + e.cx * sin + e.cy * cos,
              radius,
            );
            if (visible && radius >= MIN_RADIUS) {
              walk(rules.get(char) ?? "", depth - 1);
              continue;
            }
            if (visible && e.lines > 0) emit(endX, endY);
          }
          x = endX;
          y = endY;
          steps = reduceSteps(steps + e.steps);
          halves = (halves + e.halves) & 1;
          len *= e.len;
          wid *= e.wid;
          index += e.lines;
          continue;
        }
        if (draw.has(char) || move.has(char)) {
          const heading = base + headingOf(steps, halves);
          const nx = x + Math.cos(heading) * len;
          const ny = y + Math.sin(heading) * len;
          if (draw.has(char)) {
            if (onScreen((x + nx) / 2, (y + ny) / 2, (len / 2) * scale)) emit(nx, ny);
            index++;
          }
          x = nx;
          y = ny;
          continue;
        }
        switch (char) {
          case "+":
            steps = reduceSteps(steps - 1);
            break;
          case "-":
            steps = reduceSteps(steps + 1);
            break;
          case "|":
            halves ^= 1;
            break;
          case "[":
            stack.push(x, y, steps, halves, len, wid, nesting);
            nesting++;
            break;
          case "]":
            [x, y, steps, halves, len, wid, nesting] = stack.splice(stack.length - 7, 7);
            break;
          case ">":
            len *= spec.lengthFactor;
            break;
          case "<":
            len /= spec.lengthFactor;
            break;
          case "!":
            wid *= spec.widthFactor;
            break;
          case "#":
            wid /= spec.widthFactor;
            break;
        }
      }
    };

    walk(spec.axiom, generation);

    return {
      positions: positions.slice(0, count * 6),
      widths: widths.slice(0, count),
      colors: colors.slice(0, count),
      count,
      generation,
      limited,
      view,
    };
  };

  // How much denser the drawing gets per period: a bush whose every step
  // sprouts 8 new ones while only doubling in size gains lines faster than
  // area, so each deeper period multiplies the lines in view by this.
  const density = (() => {
    let k = 1;
    while (k < 40 && fold(spec.axiom, k + period).lines < 1e6) k++;
    const before = fold(spec.axiom, k).lines;
    const after = fold(spec.axiom, k + period).lines;
    return before > 0 ? after / before / growth ** (2 * period) : 1;
  })();

  // The generation picked for the last view, to start the next search near.
  let last: { zoom: number; periods: number } | null = null;

  const render = (view: ZoomView): ZoomDetail => {
    // Keep the lines about as long on screen as at the starting zoom. Systems
    // that grow denser each generation (bushes, the Penrose tiling) can then
    // need more lines than the budget, so the deepest period that fits is
    // searched for: near the last view's pick first, by halving otherwise.
    const zoom = Math.min(Math.max(view.zoom, 1), MAX_ZOOM);
    const perPeriod = Math.log(growth ** period);
    const deepest = Math.floor(Math.log(zoom) / perPeriod);
    const fits = (periods: number) => {
      const detail = attempt(view, periods, periods === 0 ? MAX_SEGMENTS : LINE_BUDGET);
      return detail.limited && periods > 0 ? null : detail;
    };
    const pick = (detail: ZoomDetail, periods: number) => {
      last = { zoom, periods };
      return detail;
    };

    if (deepest <= 0) return pick(attempt(view, 0, MAX_SEGMENTS), 0);
    let guess = deepest;
    if (last) {
      const moved = Math.round(Math.log(zoom / last.zoom) / perPeriod);
      guess = Math.min(deepest, Math.max(0, last.periods + moved));
    }

    let low = -1;
    let lowDetail: ZoomDetail | null = null;
    let high = deepest + 1;
    const first = fits(guess);
    if (first) {
      low = guess;
      lowDetail = first;
      // Gallop upwards while it still fits, unless the next period would
      // clearly overflow anyway.
      for (let step = 1; low < deepest; step *= 2) {
        if (lowDetail.count * density ** step > LINE_BUDGET) {
          high = low + step;
          break;
        }
        const next = Math.min(deepest, low + step);
        const detail = fits(next);
        if (!detail) {
          high = next;
          break;
        }
        low = next;
        lowDetail = detail;
      }
    } else {
      high = guess;
    }
    if (low < 0) {
      low = 0;
      lowDetail = attempt(view, 0, MAX_SEGMENTS);
    }
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      const detail = fits(middle);
      if (detail) {
        low = middle;
        lowDetail = detail;
      } else {
        high = middle;
      }
    }
    return pick(lowDetail as ZoomDetail, low);
  };

  return { render, growth, rotation, period } as ZoomSystem;
}
