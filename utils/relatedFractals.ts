import type { FractalTilePath } from "./fractalTiles";

type Family = { paths: FractalTilePath[] };

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
    paths: ["/mandelbar-set", "/mandelbrot", "/burning-ship", "/cactus-fractal", "/julia-set"],
  },
  {
    paths: ["/cactus-fractal", "/mandelbrot", "/mandelbar-set", "/newton-fractal", "/julia-set"],
  },
  {
    paths: [
      "/barnsley-tree",
      "/julia-set",
      "/l-system/twindragon",
      "/barnsley-fern",
      "/mandelbrot",
    ],
  },
  {
    paths: [
      "/mira-fractal",
      "/lorenz-attractor",
      "/rossler-attractor",
      "/logistic-map",
      "/barnsley-fern",
    ],
  },
  {
    paths: [
      "/star-fractal",
      "/n-flake",
      "/l-system/koch-snowflake",
      "/vicsek-fractal-2d",
      "/l-system/sierpinski-triangle",
    ],
  },
  {
    paths: [
      "/gosper-island",
      "/l-system/gosper-curve",
      "/l-system/koch-snowflake",
      "/l-system/twindragon",
      "/penrose-tiling",
    ],
  },
  {
    paths: [
      "/l-system/peano-curve",
      "/l-system/hilbert-curve",
      "/l-system/gosper-curve",
      "/gosper-island",
      "/l-system/sierpinski-curve",
    ],
  },
  {
    paths: [
      "/l-system/levy-tapestry",
      "/l-system/levy-curve",
      "/l-system/dragon-curve",
      "/l-system/twindragon",
      "/l-system/quadratic-koch-island",
    ],
  },
  {
    paths: ["/circles-and-squares", "/logistic-map", "/sierpinski-carpet", "/julia-set"],
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

export function getRelatedFractals(path: string) {
  const found = new Set<FractalTilePath>();
  for (const family of families) {
    if (!family.paths.some((member) => member === path)) continue;
    for (const target of family.paths) {
      if (target !== path) found.add(target);
    }
  }
  return Array.from(found, (href) => ({ href })).slice(0, 4);
}
