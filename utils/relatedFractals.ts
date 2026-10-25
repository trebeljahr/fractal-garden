type Family = { paths: string[] };

const families: Family[] = [
  {
    paths: ["/mandelbrot", "/julia-set", "/burning-ship", "/buddhabrot", "/newton-fractal"],
  },
  {
    paths: ["/newton-fractal", "/mandelbrot", "/julia-set", "/burning-ship", "/buddhabrot"],
  },
  {
    paths: [
      "/l-system/sierpinski-triangle",
      "/sierpinski-carpet",
      "/sierpinski-tetrahedron",
      "/menger-sponge",
      "/jerusalem-cube",
    ],
  },
  {
    paths: [
      "/menger-sponge",
      "/sierpinski-carpet",
      "/jerusalem-cube",
      "/mosely-snowflake",
      "/vicsek-fractal-3d",
    ],
  },
  {
    paths: [
      "/mandelbulb",
      "/romanesco",
      "/menger-sponge",
      "/polyhedron-flake",
      "/jerusalem-cube",
      "/sierpinski-tetrahedron",
    ],
  },
  {
    paths: [
      "/l-system/dragon-curve",
      "/l-system/twindragon",
      "/l-system/terdragon",
      "/l-system/levy-curve",
      "/l-system/sierpinski-arrowhead",
    ],
  },
  {
    paths: [
      "/l-system/koch-snowflake",
      "/l-system/koch-anti-snowflake",
      "/l-system/cesaro-fractal",
      "/koch-surface",
      "/l-system/quadratic-snowflake",
    ],
  },
  {
    paths: [
      "/l-system/quadratic-snowflake",
      "/l-system/quadratic-koch-island",
      "/l-system/minkowski-sausage",
      "/quadratic-koch-3d",
      "/l-system/board",
    ],
  },
  {
    paths: [
      "/l-system/hilbert-curve",
      "/l-system/hilbert-curve-3d",
      "/l-system/gosper-curve",
      "/l-system/sierpinski-curve",
      "/l-system/dragon-curve",
    ],
  },
  {
    paths: [
      "/barnsley-fern",
      "/l-system/fern-1",
      "/l-system/fern-2",
      "/l-system/fern-3",
      "/l-system/fern-4",
    ],
  },
  {
    paths: [
      "/pythagoras-tree",
      "/fractal-canopy",
      "/h-tree",
      "/l-system/explorer",
      "/l-system/fern-1",
    ],
  },
  {
    paths: [
      "/lorenz-attractor",
      "/rossler-attractor",
      "/logistic-map",
      "/julia-set",
      "/mandelbrot",
    ],
  },
  {
    paths: [
      "/vicsek-fractal-2d",
      "/vicsek-fractal-3d",
      "/mosely-snowflake",
      "/n-flake",
      "/t-square-fractal",
    ],
  },
  {
    paths: [
      "/polyhedron-flake",
      "/sierpinski-tetrahedron",
      "/koch-surface",
      "/menger-sponge",
      "/jerusalem-cube",
    ],
  },
  {
    paths: [
      "/l-system/levy-curve",
      "/l-system/dragon-curve",
      "/l-system/sierpinski-arrowhead",
      "/l-system/koch-snowflake",
      "/l-system/terdragon",
    ],
  },
  {
    paths: [
      "/l-system/fibonacci-word-fractal",
      "/rauzy-fractal",
      "/l-system/hilbert-curve",
      "/l-system/gosper-curve",
      "/l-system/sierpinski-curve",
    ],
  },
  {
    paths: [
      "/apollonian-gasket",
      "/sierpinski-carpet",
      "/menger-sponge",
      "/l-system/sierpinski-triangle",
      "/sierpinski-tetrahedron",
    ],
  },
  {
    paths: [
      "/diffusion-limited-aggregation",
      "/barnsley-fern",
      "/fractal-canopy",
      "/pythagoras-tree",
      "/l-system/fern-2",
    ],
  },
  {
    paths: [
      "/penrose-tiling",
      "/l-system/gosper-curve",
      "/l-system/twindragon",
      "/l-system/hilbert-curve",
      "/l-system/sierpinski-curve",
    ],
  },
  {
    paths: [
      "/t-square-fractal",
      "/h-tree",
      "/vicsek-fractal-2d",
      "/l-system/board",
      "/l-system/quadratic-koch-island",
    ],
  },
  {
    paths: [
      "/l-system/board",
      "/l-system/crystal",
      "/l-system/explorer",
      "/l-system/quadratic-koch-island",
      "/l-system/minkowski-sausage",
    ],
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
  const found = new Map<string, string | undefined>();
  for (const family of families) {
    if (!family.paths.includes(path)) continue;
    for (const target of family.paths) {
      if (target !== path && !found.has(target)) found.set(target, specific[path]?.[target]);
    }
  }
  return Array.from(found, ([href, reason]) => ({ href, reason })).slice(0, 4);
}
