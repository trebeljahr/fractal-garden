// Rebuild the gallery tiles for the fractals added from MathWorld's list:
//   node scripts/generate-mathworld-tiles.mjs
// Every tile is computed from the same formulas as its page.
import sharp from "sharp";
import { paintCircles } from "../utils/circlesAndSquares.ts";
import { gosperIsland, latticeCenter, latticeTint, SEVEN_ISLANDS } from "../utils/gosperIsland.ts";
import { miraOrbit, orbitBounds, paintOrbit } from "../utils/miraMap.ts";
import { buildStars, starReach, touchingRatio, traceStars } from "../utils/starFractal.ts";

sharp.concurrency(1);
const SIZE = 1000;
const output = new URL("../public/assets/fractal-images/", import.meta.url);
const save = (image, name) =>
  image.jpeg({ quality: 88 }).toFile(new URL(`${name}.jpg`, output).pathname);
const raw = (pixels) => sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } });
const svg = (body, background) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${background}"/>${body}</svg>`,
    ),
  );

function classic(t, channel) {
  return Math.round(255 * (0.5 + 0.5 * Math.cos(6.28318 * (t + channel * 0.1))));
}

function escapeTile(sample, center, span, density, offset) {
  const pixels = Buffer.alloc(SIZE * SIZE * 4, 255);
  for (let row = 0; row < SIZE; row++) {
    for (let column = 0; column < SIZE; column++) {
      const x = center[0] + ((2 * (column + 0.5)) / SIZE - 1) * span;
      const y = center[1] + (1 - (2 * (row + 0.5)) / SIZE) * span;
      const value = sample(x, y);
      const at = (row * SIZE + column) * 4;
      for (let channel = 0; channel < 3; channel++)
        pixels[at + channel] =
          value === null ? 0 : classic((value / 40) * density + offset, channel);
    }
  }
  return raw(pixels);
}

const R = 65536;
await save(
  escapeTile(
    (cx, cy) => {
      let x = 0;
      let y = 0;
      for (let i = 0; i < 400; i++) {
        const next = x * x - y * y + cx;
        y = -2 * x * y + cy;
        x = next;
        const m = x * x + y * y;
        if (m > R) return i + 1 - Math.log2(Math.log(m) / 2);
      }
      return null;
    },
    [-0.25, 0],
    2.05,
    1,
    0.5,
  ),
  "mandelbar-set",
);
await save(
  escapeTile(
    (cx, cy) => {
      let x = cx;
      let y = cy;
      for (let i = 0; i < 400; i++) {
        const fx = x * x - y * y + cx - 1;
        const fy = 2 * x * y + cy;
        const next = fx * x - fy * y - cx;
        y = fx * y + fy * x - cy;
        x = next;
        const m = x * x + y * y;
        if (m > R) return i + 1 - Math.log(Math.log(m) / 2) / Math.log(3);
      }
      return null;
    },
    [-0.45, 0],
    1.6,
    1,
    0.5,
  ),
  "cactus-fractal",
);
await save(
  escapeTile(
    (zx, zy) => {
      const cr = 0.6;
      const ci = 1.1;
      let x = zx;
      let y = zy;
      for (let i = 0; i < 100; i++) {
        const u = x - Math.sign(x);
        const next = cr * u - ci * y;
        y = cr * y + ci * u;
        x = next;
        const size = Math.hypot(x, y);
        if (size > 2) return i + 1 - Math.log(size / 2) / Math.log(Math.hypot(cr, ci));
      }
      return null;
    },
    [0, 0],
    2.3,
    3,
    0.5,
  ),
  "barnsley-tree",
);

const mira = new Uint8ClampedArray(SIZE * SIZE * 4);
const steps = 3000000;
const orbit = miraOrbit({ a: 0.31, b: 1, x0: 12, y0: 0 }, steps);
const bounds = orbitBounds(orbit, steps);
const miraScale = (SIZE * 0.86) / Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
paintOrbit(
  mira,
  SIZE,
  SIZE,
  orbit,
  steps,
  {
    scale: miraScale,
    originX: SIZE / 2 - ((bounds.minX + bounds.maxX) / 2) * miraScale,
    originY: SIZE / 2 + ((bounds.minY + bounds.maxY) / 2) * miraScale,
  },
  {
    background: "#1d1c22",
    color: "#7a3fb0",
    colorEnd: "#ffe9c2",
    coloring: "density",
    pointSize: 1,
  },
);
await save(raw(Buffer.from(mira.buffer)), "mira-fractal");

const circles = new Uint32Array(SIZE * SIZE);
paintCircles(
  circles,
  SIZE,
  SIZE,
  2,
  { step: Math.sqrt(2 / 128), modulus: 2, squarings: 1, centerX: 0, centerY: 0 },
  { background: "#10151a", color: "#eee8ce", bands: "two" },
);
await save(raw(Buffer.from(circles.buffer)), "circles-and-squares");

const star = { points: 5, skip: 2, ratio: touchingRatio(5), offset: 1, rotation: 0 };
const starDepth = 4;
const starScale = (SIZE * 0.45) / starReach(star, starDepth);
const stars = buildStars(star, starDepth);
const starPaths = Array.from({ length: starDepth + 1 }, (_, level) => {
  let d = "";
  traceStars(
    {
      moveTo: (x, y) => {
        d += `M${x.toFixed(2)} ${y.toFixed(2)}`;
      },
      lineTo: (x, y) => {
        d += `L${x.toFixed(2)} ${y.toFixed(2)}`;
      },
      closePath: () => {
        d += "Z";
      },
    },
    stars.filter((entry) => entry.depth === level),
    star,
    (x, y) => [SIZE / 2 + x * starScale, SIZE * 0.53 + y * starScale],
  );
  const t = level / starDepth;
  const stroke = `rgb(${255 - 16 * t},${209 - 138 * t},${102 + 9 * t})`;
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${3.2 - level * 0.55}" stroke-linejoin="round"/>`;
});
await save(svg(starPaths.join(""), "#252424"), "star-fractal");

const island = gosperIsland(4);
const islandScale = (SIZE * 0.46) / (Math.sqrt(7) * 1.08);
const islandPath = (dx, dy) =>
  `${island
    .map(
      ([x, y], index) =>
        `${index ? "L" : "M"}${(SIZE / 2 + (x + dx) * islandScale).toFixed(2)} ${(SIZE / 2 - (y + dy) * islandScale).toFixed(2)}`,
    )
    .join("")}Z`;
const islands = SEVEN_ISLANDS.map(([a, b]) => {
  const [x, y] = latticeCenter(a, b);
  const t = latticeTint(a, b) / 6;
  const fill = `rgb(${47 + 138 * t},${111 + 117 * t},${115 + 86 * t})`;
  return `<path d="${islandPath(x, y)}" fill="${fill}" stroke="#10151a" stroke-width="2"/>`;
});
await save(svg(islands.join(""), "#252424"), "gosper-island");

function turtlePath(axiom, rules, turn, rounds) {
  let word = axiom;
  for (let i = 0; i < rounds; i++) {
    let next = "";
    for (const symbol of word) next += rules[symbol] ?? symbol;
    word = next;
  }
  let x = 0;
  let y = 0;
  let heading = 0;
  const points = [[0, 0]];
  for (const symbol of word) {
    if (symbol === "F") {
      x += Math.cos(heading);
      y += Math.sin(heading);
      points.push([x, y]);
    } else if (symbol === "+") heading += turn;
    else if (symbol === "-") heading -= turn;
  }
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = (SIZE * 0.86) / Math.max(maxX - minX, maxY - minY);
  return points
    .map(
      ([px, py], index) =>
        `${index ? "L" : "M"}${(SIZE / 2 + (px - (minX + maxX) / 2) * scale).toFixed(2)} ${(SIZE / 2 - (py - (minY + maxY) / 2) * scale).toFixed(2)}`,
    )
    .join("");
}

await save(
  svg(
    `<path d="${turtlePath("X", { X: "XFYFX+F+YFXFY-F-XFYFX", Y: "YFXFY-F-XFYFX+F+YFXFY" }, Math.PI / 2, 3)}" fill="none" stroke="#b1e5e8" stroke-width="3" stroke-linejoin="round"/>`,
    "#252424",
  ),
  "l-system-peano-curve",
);
await save(
  svg(
    `<path d="${turtlePath("F++F++F++F", { F: "-F++F-" }, Math.PI / 4, 12)}Z" fill="none" stroke="#f2c6de" stroke-width="1.4"/>`,
    "#252424",
  ),
  "l-system-levy-tapestry",
);
console.log("Wrote nine tiles.");
