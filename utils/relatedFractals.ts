type Family = { paths: string[]; reason: string };

const families: Family[] = [
  {
    paths: ["/mandelbrot", "/julia-set", "/burning-ship", "/buddhabrot"],
    reason: "Explore another view of quadratic iteration in the complex plane.",
  },
  {
    paths: ["/newton-fractal", "/mandelbrot", "/julia-set", "/burning-ship"],
    reason: "Compare the patterns made by iterating complex numbers.",
  },
  {
    paths: [
      "/l-system/sierpinski-triangle",
      "/sierpinski-carpet",
      "/sierpinski-tetrahedron",
      "/menger-sponge",
    ],
    reason: "See how removing smaller copies changes a triangle, square or solid.",
  },
  {
    paths: ["/menger-sponge", "/sierpinski-carpet", "/jerusalem-cube", "/mosely-snowflake"],
    reason: "Compare recursive holes in squares and cubes.",
  },
  {
    paths: ["/mandelbulb", "/menger-sponge", "/polyhedron-flake", "/jerusalem-cube"],
    reason: "Rotate another fractal solid and explore its surface.",
  },
  {
    paths: [
      "/l-system/dragon-curve",
      "/l-system/twindragon",
      "/l-system/terdragon",
      "/l-system/levy-curve",
    ],
    reason: "Compare folding curves built from repeated turns.",
  },
  {
    paths: [
      "/l-system/koch-snowflake",
      "/l-system/koch-anti-snowflake",
      "/l-system/cesaro-fractal",
      "/koch-surface",
    ],
    reason: "See what happens when Koch-style spikes turn inward or grow in 3D.",
  },
  {
    paths: [
      "/l-system/quadratic-snowflake",
      "/l-system/quadratic-koch-island",
      "/l-system/minkowski-sausage",
      "/quadratic-koch-3d",
    ],
    reason: "Compare recursive edges built from right-angle turns.",
  },
  {
    paths: [
      "/l-system/hilbert-curve",
      "/l-system/hilbert-curve-3d",
      "/l-system/gosper-curve",
      "/l-system/sierpinski-curve",
    ],
    reason: "Watch another curve fold into the space around it.",
  },
  {
    paths: [
      "/barnsley-fern",
      "/l-system/fern-1",
      "/l-system/fern-2",
      "/l-system/fern-3",
      "/l-system/fern-4",
    ],
    reason: "Compare fern shapes made with transformations and rewriting rules.",
  },
  {
    paths: ["/pythagoras-tree", "/fractal-canopy", "/h-tree", "/l-system/explorer"],
    reason: "Try another way to grow a branching structure.",
  },
  {
    paths: ["/lorenz-attractor", "/rossler-attractor", "/logistic-map", "/julia-set"],
    reason: "Compare patterns made by nonlinear equations.",
  },
  {
    paths: ["/vicsek-fractal-2d", "/vicsek-fractal-3d", "/mosely-snowflake", "/n-flake"],
    reason: "Compare smaller copies arranged around a shared center.",
  },
  {
    paths: ["/polyhedron-flake", "/sierpinski-tetrahedron", "/koch-surface", "/menger-sponge"],
    reason: "Build another recursive shape from triangular faces or solid copies.",
  },
  {
    paths: [
      "/l-system/levy-curve",
      "/l-system/dragon-curve",
      "/l-system/sierpinski-arrowhead",
      "/l-system/koch-snowflake",
    ],
    reason: "Compare curves that replace each segment with a bent path.",
  },
  {
    paths: [
      "/l-system/fibonacci-word-fractal",
      "/rauzy-fractal",
      "/l-system/hilbert-curve",
      "/l-system/gosper-curve",
    ],
    reason: "See how repeated symbol rules become geometric patterns.",
  },
  {
    paths: [
      "/apollonian-gasket",
      "/sierpinski-carpet",
      "/menger-sponge",
      "/l-system/sierpinski-triangle",
    ],
    reason: "Explore another pattern that repeats inside its gaps.",
  },
  {
    paths: [
      "/diffusion-limited-aggregation",
      "/barnsley-fern",
      "/fractal-canopy",
      "/pythagoras-tree",
    ],
    reason: "Compare branching forms made by different growth rules.",
  },
  {
    paths: [
      "/penrose-tiling",
      "/l-system/gosper-curve",
      "/l-system/twindragon",
      "/l-system/hilbert-curve",
    ],
    reason: "Compare different ways to cover the plane.",
  },
  {
    paths: ["/t-square-fractal", "/h-tree", "/vicsek-fractal-2d", "/l-system/board"],
    reason: "Grow another recursive pattern from squares and right angles.",
  },
  {
    paths: [
      "/l-system/board",
      "/l-system/crystal",
      "/l-system/explorer",
      "/l-system/quadratic-koch-island",
    ],
    reason: "Explore another drawing made from L-system rules.",
  },
];

const specific: Record<string, Record<string, string>> = {
  "/mandelbrot": {
    "/julia-set":
      "Keep the same equation, fix c, and explore a different Julia set for each value.",
    "/burning-ship": "Fold the real and imaginary parts before squaring to make the ship's ridges.",
    "/buddhabrot":
      "Draw the paths of escaping Mandelbrot points instead of their starting positions.",
  },
  "/julia-set": {
    "/mandelbrot": "Explore the parameter plane that connects this family of Julia sets.",
  },
  "/burning-ship": { "/mandelbrot": "Compare the same iteration without the absolute-value fold." },
};

export function getRelatedFractals(path: string) {
  const found = new Map<string, string>();
  for (const family of families) {
    if (!family.paths.includes(path)) continue;
    for (const target of family.paths) {
      if (target !== path && !found.has(target))
        found.set(target, specific[path]?.[target] ?? family.reason);
    }
  }
  return Array.from(found, ([href, reason]) => ({ href, reason })).slice(0, 4);
}
