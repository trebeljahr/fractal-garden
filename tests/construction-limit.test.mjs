import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");

// Just enough of React to run the real hooks: state, refs, memos and effects, in render order.
let current = null;
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const reactStub = {
  useState: (initial) => current.useState(initial),
  useRef: (value) => current.useRef(value),
  useMemo: (make, deps) => current.useMemo(make, deps),
  useCallback: (callback, deps) => current.useMemo(() => callback, deps),
  useEffect: (effect, deps) => current.useEffect(effect, deps),
};

function createRuntime() {
  const slots = [];
  let cursor = 0;
  let pending = [];
  const runtime = {
    dirty: false,
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === "function" ? initial() : initial };
      const slot = slots[index];
      const set = (next) => {
        slot.value = typeof next === "function" ? next(slot.value) : next;
        runtime.dirty = true;
      };
      return [slot.value, set];
    },
    useRef(value) {
      const index = cursor++;
      slots[index] ??= { current: value };
      return slots[index];
    },
    useMemo(make, deps) {
      const index = cursor++;
      if (!sameDeps(slots[index]?.deps, deps)) slots[index] = { value: make(), deps };
      return slots[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (sameDeps(slots[index]?.deps, deps)) return;
      const slot = { deps };
      slots[index]?.cleanup?.();
      slots[index] = slot;
      pending.push(() => {
        slot.cleanup = effect();
      });
    },
    render(component) {
      current = runtime;
      let result;
      for (let pass = 0; pass < 50; pass++) {
        runtime.dirty = false;
        cursor = 0;
        result = component();
        const effects = pending;
        pending = [];
        for (const effect of effects) effect();
        if (!runtime.dirty) return result;
      }
      throw new Error("The hook never settled");
    },
  };
  return runtime;
}

let registered = null;
let sendEvent = null;
const stubs = {
  react: reactStub,
  "../../components/FractalConstruction": {
    useConstructionRegistration: (spec) => {
      registered = spec;
    },
  },
  "./useRenderSurface": {
    useRenderSurface: ({ onEvent }) => {
      sendEvent = onEvent;
      return { setParams() {} };
    },
  },
};
const originalLoad = Module._load;
Module._load = function (request, ...rest) {
  return stubs[request] ?? originalLoad.call(this, request, ...rest);
};
const { useFractalRenderer } = require("../utils/hooks/useFractalRenderer.ts");
Module._load = originalLoad;

const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  location: { hash: "", pathname: "/figure" },
};
globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };

const BUDGET_KEY = "fractal-garden:iteration-budget:v2:figure";
const cost = (level, ms) => ({
  level,
  work: 10 * 2 ** level,
  buildMs: ms,
  frameMs: 0,
  continuous: false,
  offThread: true,
});

function openFigure(samples, options = {}) {
  storage.clear();
  registered = null;
  if (samples) {
    storage.set(BUDGET_KEY, JSON.stringify({ savedAt: Date.now(), samples }));
  }
  let config = { iterations: 0 };
  const runtime = createRuntime();
  const setConfig = (next) => {
    config = next(config);
    runtime.dirty = true;
  };
  const render = () =>
    useFractalRenderer({
      kind: "hTree",
      storageKey: "figure",
      config,
      setConfig,
      params: config,
      width: 720,
      height: 480,
      max: 11,
      ...options,
    });
  let result = runtime.render(render);
  return {
    cap: () => result.cap,
    openedOn: () => config.iterations,
    send(event) {
      current = runtime;
      sendEvent(event);
      result = runtime.render(render);
    },
  };
}

// Level 2 once went over budget, and that sample stays cached for a week.
const SLOW_BUDGET = {
  0: { load: 0.4, work: 10 },
  1: { load: 0.5, work: 20 },
  2: { load: 5, work: 40 },
};
const FAST_BUDGET = Object.fromEntries(
  Array.from({ length: 12 }, (_, level) => [level, { load: 0.01, work: 10 * 2 ** level }]),
);

test("a slow cached budget lowers where the explorer opens but not the lesson's limit", () => {
  const figure = openFigure(SLOW_BUDGET);
  assert.equal(figure.cap(), 1);
  assert.equal(figure.openedOn(), 1);
  assert.equal(registered.max, 11);
});

test("a slow frame during the visit lowers the explorer's budget but not the lesson's limit", () => {
  const figure = openFigure(FAST_BUDGET);
  assert.equal(figure.cap(), 11);
  assert.equal(registered.max, 11);
  figure.send({ type: "cost", report: cost(5, 5000) });
  assert.equal(figure.cap(), 4);
  assert.equal(registered.max, 11);
  assert.ok(JSON.parse(storage.get(BUDGET_KEY)).samples[5].load > 1);
});

test("the first-visit sweep picks the explorer's opening level and leaves the lesson alone", () => {
  const figure = openFigure(null);
  assert.equal(registered, null);
  figure.send({ type: "calibrated", reports: [cost(0, 5), cost(1, 10), cost(2, 5000)] });
  assert.equal(figure.cap(), 1);
  assert.equal(figure.openedOn(), 1);
  assert.equal(registered.max, 11);
});

test("a figure's own limit reaches the lesson unchanged", () => {
  openFigure(SLOW_BUDGET, { constructionMax: (settings) => settings.top });
  assert.equal(registered.maxForConfig({ top: 7 }), 7);
});

const {
  gosperIslandConstructionMax,
  gosperIslandLines,
  LEVY_TAPESTRY_CONSTRUCTION_MAX,
  MAX_CONSTRUCTION_LINES,
  QUADRATIC_KOCH_ISLAND_CONSTRUCTION_MAX,
  starConstructionMax,
  starLines,
  TERDRAGON_CONSTRUCTION_MAX,
  TWINDRAGON_TILING_CONSTRUCTION_MAX,
} = require("../utils/constructionLimits.ts");
const { buildPlayback, playbackSource } = require("../utils/lsystem/playback.ts");
const { preparePlaybackDrawing } = require("../utils/lsystem/playbackDrawing.ts");
const { buildStars, largestStarDepth, touchingRatio } = require("../utils/starFractal.ts");
const { GOSPER_MAX_ROUND, gosperIsland } = require("../utils/gosperIsland.ts");

class CountingPath {
  lines = 0;
  moveTo() {}
  lineTo() {
    this.lines++;
  }
  rect() {}
  closePath() {}
}
globalThis.Path2D = CountingPath;

/** A canvas that only counts strokes, so a test can count what a real drawing asks for. */
function countingContext() {
  return new Proxy(
    { strokes: [] },
    {
      get: (target, key) =>
        key in target
          ? target[key]
          : key === "stroke"
            ? (path) => target.strokes.push(path)
            : () => {},
      set: () => true,
    },
  );
}

const LEGACY_FIGURES = readdirSync(`${root}pages/l-system`)
  .map((file) => [file, read(`pages/l-system/${file}`)])
  .filter(([, source]) => source.includes("maxIterations:") && source.includes("axiom:"));
const TURTLE_FIGURES = {
  "dragon-curve": "dragonCurve",
  terdragon: "terdragon",
  "gosper-curve": "gosperCurve",
  "peano-curve": "peanoCurve",
  "koch-anti-snowflake": "kochAntiSnowflake",
  "levy-tapestry": "levyTapestry",
  "quadratic-koch-island": "quadraticKochIsland",
  "minkowski-sausage": "minkowskiSausage",
  "cesaro-fractal": "cesaroFractal",
  "fibonacci-word-fractal": "fibonacciWordFractal",
  twindragon: "twindragon",
};
const OWN_LIMITS = {
  "levy-tapestry": LEVY_TAPESTRY_CONSTRUCTION_MAX,
  "quadratic-koch-island": QUADRATIC_KOCH_ISLAND_CONSTRUCTION_MAX,
  terdragon: TERDRAGON_CONSTRUCTION_MAX,
};

function turtleModel(kind, level, settings = {}) {
  const source = playbackSource(kind, {
    iterations: level,
    angle: 60,
    island: true,
    color: "#fff",
    background: "#000",
    lineWidth: 1,
    ...settings,
  });
  return buildPlayback(
    source.spec,
    level,
    source.legacy,
    source.turns,
    source.repeat,
    source.fibonacci,
    source.copies,
  );
}

test("no L-system figure's top level draws more than the line budget", () => {
  assert.ok(LEGACY_FIGURES.length >= 13);
  for (const [file, source] of LEGACY_FIGURES) {
    const axiom = source.match(/axiom:\s*"([^"]*)"/)[1];
    const block = source.match(/replace:\s*\{([\s\S]*?)\}/)[1];
    const replace = Object.fromEntries(
      Array.from(block.matchAll(/["']?([A-Za-z])["']?:\s*"([^"]*)"/g), (m) => [m[1], m[2]]),
    );
    const level = Number(source.match(/maxIterations:\s*(\d+)/)[1]);
    const { spec, legacy } = playbackSource("lsystem2d", {
      axiom,
      replace,
      angle: 60,
      startAngle: 0,
      color: "#fff",
      background: "#000",
      lineWidth: 1,
    });
    const lines = buildPlayback(spec, level - 1, legacy).geometry.count;
    assert.ok(lines > 0 && lines <= MAX_CONSTRUCTION_LINES, `${file}: ${lines} lines`);
  }
  for (const [slug, kind] of Object.entries(TURTLE_FIGURES)) {
    const source = read(`pages/l-system/${slug}.tsx`);
    const level = OWN_LIMITS[slug] ?? Number(source.match(/const MAX_ITERATIONS = (\d+)/)[1]);
    const lines = turtleModel(kind, level).geometry.count;
    assert.ok(lines > 0 && lines <= MAX_CONSTRUCTION_LINES, `${slug}: ${lines} lines`);
  }
});

test("figures over the budget stop at the last level within it", () => {
  const over = (kind, level) => turtleModel(kind, level + 1).geometry.count;
  assert.ok(over("levyTapestry", LEVY_TAPESTRY_CONSTRUCTION_MAX) > MAX_CONSTRUCTION_LINES);
  assert.ok(
    over("quadraticKochIsland", QUADRATIC_KOCH_ISLAND_CONSTRUCTION_MAX) > MAX_CONSTRUCTION_LINES,
  );
});

test("the terdragon's limit counts all six copies", () => {
  const lines = (level) => turtleModel("terdragon", level, { copies: 6 }).geometry.count;
  assert.ok(lines(TERDRAGON_CONSTRUCTION_MAX) <= MAX_CONSTRUCTION_LINES);
  assert.ok(lines(TERDRAGON_CONSTRUCTION_MAX + 1) > MAX_CONSTRUCTION_LINES);
});

test("a twindragon tiling counts every copy the player draws", () => {
  const drawnLines = (level, width, height) => {
    const model = turtleModel("twindragon", level);
    const paint = preparePlaybackDrawing(width, height, model, false, {
      showTiling: true,
      background: "#000",
      color: "#fff",
      lineWidth: 1,
      zoom: 1,
      x: 0,
      y: 0,
    });
    const ctx = countingContext();
    paint(ctx, 0, 1, false);
    return ctx.strokes.reduce((lines, path) => lines + path.lines, 0);
  };
  // The player's canvas on a phone, a tablet, a laptop and a wide window.
  for (const [width, height] of [
    [357, 180],
    [752, 659],
    [1176, 493],
    [2353, 659],
  ]) {
    const lines = drawnLines(TWINDRAGON_TILING_CONSTRUCTION_MAX, width, height);
    assert.ok(lines <= MAX_CONSTRUCTION_LINES, `${width}x${height}: ${lines} lines`);
  }
  assert.ok(drawnLines(TWINDRAGON_TILING_CONSTRUCTION_MAX + 1, 2353, 659) > MAX_CONSTRUCTION_LINES);
});

test("star depths are counted from the stars the renderer builds", () => {
  for (let points = 3; points <= 12; points++) {
    const depth = starConstructionMax(points);
    const settings = {
      points,
      skip: 2,
      ratio: touchingRatio(points),
      offset: 1,
      rotation: 0,
    };
    assert.ok(depth <= largestStarDepth(points));
    assert.equal(starLines(points, depth), buildStars(settings, depth).length * points);
    assert.ok(starLines(points, depth) <= MAX_CONSTRUCTION_LINES);
  }
  // The opening star. Level 7 took 11 seconds to draw.
  assert.equal(starConstructionMax(5), 6);
});

test("Gosper island rounds are counted for every island the player's canvas can show", () => {
  const { drawGosperIsland } = require("../utils/render/drawings/turtleCurves.ts");
  assert.ok(gosperIslandConstructionMax("one") >= GOSPER_MAX_ROUND);
  assert.equal(gosperIslandConstructionMax("seven"), 7);
  assert.equal(gosperIslandConstructionMax("plane"), 5);
  for (const view of ["one", "seven", "plane"]) {
    const round = gosperIslandConstructionMax(view);
    assert.equal(gosperIsland(round).length, 6 * 3 ** round);
    assert.ok(gosperIslandLines(view, round) <= MAX_CONSTRUCTION_LINES);
    // Real drawings at the player's sizes, from a phone to a 4K window.
    for (const [width, height] of [
      [357, 550],
      [752, 793],
      [1176, 655],
      [2353, 793],
      [3530, 793],
    ]) {
      const drawn = drawGosperIsland(countingContext(), width, height, {
        iterations: round,
        view,
        fillIslands: false,
        background: "#000",
        color: "#000000",
        colorEnd: "#ffffff",
        outline: "#000",
        lineWidth: 1,
      });
      assert.ok(drawn <= gosperIslandLines(view, round), `${view} ${width}x${height}: ${drawn}`);
    }
  }
});

test("every level an article names exists in its construction figure", () => {
  const limitOf = (slug) => {
    if (OWN_LIMITS[slug]) return OWN_LIMITS[slug];
    const page = [`pages/l-system/${slug}.tsx`, `pages/${slug}.tsx`].find((path) =>
      existsSync(`${root}${path}`),
    );
    const source = read(page);
    const own = source.match(/const MAX_ITERATIONS = (\d+)|maxIterations: (\d+)/);
    if (own) return Number(own[1] ?? own[2]);
    if (source.includes("PYTHAGORAS_MAX_ITERATIONS")) {
      const drawing = read("utils/render/drawings/pythagorasTree.ts");
      return Number(drawing.match(/PYTHAGORAS_MAX_ITERATIONS = (\d+)/)[1]);
    }
    return null;
  };
  const named = [];
  for (const file of readdirSync(`${root}fractal-descriptions`)) {
    const article = read(`fractal-descriptions/${file}`);
    if (!article.includes("data-construction-player")) continue;
    const body = article.split(/\n#+ (?:Further exploring|Sources and notes)/)[0];
    const slug = file.replace(/\.md$/, "");
    for (const match of body.matchAll(/\b(?:level|round)s?(?: to)? (\d+)\b/gi)) {
      const limit = limitOf(slug);
      assert.notEqual(limit, null, `${slug} names ${match[0]} but its limit was not found`);
      assert.ok(Number(match[1]) <= limit, `${slug} names ${match[0]} and stops at ${limit}`);
      named.push(`${slug}:${match[1]}`);
    }
  }
  // These instructions are why the limit is fixed.
  assert.ok(named.includes("pythagoras-tree:6"));
  assert.ok(named.includes("cesaro-fractal:7"));
});
