type SeoEntry = {
  title: string;
  description: string;
  imagePath: string;
};

const SITE_NAME = "Fractal Garden";
const DEFAULT_SITE_URL = "https://fractal.garden";

const PAGE_SEO: Record<string, SeoEntry> = {
  "/": {
    title: "Fractal Garden",
    description:
      "Explore interactive fractals, mathematical patterns, and shareable visualizations across classic sets, L-systems, and 3D recursive forms.",
    imagePath: "/assets/fractal-images/mandelbrot.jpg",
  },
  "/mandelbrot": {
    title: "Mandelbrot Set",
    description:
      "Zoom through the Mandelbrot Set in an interactive WebGL explorer and discover one of the most famous fractals in mathematics.",
    imagePath: "/assets/fractal-images/mandelbrot.jpg",
  },
  "/buddhabrot": {
    title: "Buddhabrot",
    description:
      "Watch the Buddhabrot emerge from millions of escaping Mandelbrot orbits in a glowing interactive density rendering.",
    imagePath: "/assets/fractal-images/buddhabrot.jpg",
  },
  "/newton-fractal": {
    title: "Newton Fractal",
    description:
      "Explore the Newton Fractal for z^3 - 1 and see how Newton's method splits the complex plane into colorful root basins.",
    imagePath: "/assets/fractal-images/newton-fractal.jpg",
  },
  "/burning-ship": {
    title: "Burning Ship Fractal",
    description:
      "Dive into the Burning Ship fractal with an interactive WebGL renderer and navigate its fiery folds and filament structures.",
    imagePath: "/assets/fractal-images/burning-ship.jpg",
  },
  "/barnsley-fern": {
    title: "Barnsley Fern",
    description:
      "Grow a Barnsley Fern from simple affine transformations and compare several fern variants in an interactive fractal renderer.",
    imagePath: "/assets/fractal-images/barnsley-fern.jpg",
  },
  "/sierpinski-carpet": {
    title: "Sierpinski Carpet",
    description:
      "Explore the Sierpinski Carpet and watch a simple square subdivision rule open up into a classic planar fractal.",
    imagePath: "/assets/fractal-images/sierpinski-carpet.jpg",
  },
  "/fractal-canopy": {
    title: "Fractal Canopy",
    description:
      "Experiment with branch angles, growth, and color in an interactive Fractal Canopy inspired by recursive botanical forms.",
    imagePath: "/assets/fractal-images/fractal-canopy.jpg",
  },
  "/julia-set": {
    title: "Julia Set",
    description:
      "Navigate a vivid Julia Set and compare its structure to the Mandelbrot family through an interactive WebGL fractal view.",
    imagePath: "/assets/fractal-images/julia-set.jpg",
  },
  "/apollonian-gasket": {
    title: "Apollonian Gasket",
    description:
      "See circles pack into circles in an Apollonian Gasket and explore one of the most elegant geometric fractal constructions.",
    imagePath: "/assets/fractal-images/apollonian-gasket.jpg",
  },
  "/logistic-map": {
    title: "Logistic Map",
    description:
      "Inspect the logistic map bifurcation diagram and trace the route from order to chaos with interactive zoom and pan controls.",
    imagePath: "/assets/fractal-images/logistic-map.jpg",
  },
  "/mandelbulb": {
    title: "Mandelbulb",
    description:
      "Orbit around the Mandelbulb in 3D and explore a volumetric relative of the Mandelbrot Set with live controls.",
    imagePath: "/assets/fractal-images/mandelbulb.jpg",
  },
  "/menger-sponge": {
    title: "Menger Sponge",
    description:
      "Rotate a 3D Menger Sponge and follow its recursive construction as holes open through the cube at every level.",
    imagePath: "/assets/fractal-images/menger-sponge.jpg",
  },
  "/mosely-snowflake": {
    title: "Mosely Snowflake",
    description:
      "Explore the Mosely Snowflake in 3D and compare its lighter and heavier recursive cube-based variants.",
    imagePath: "/assets/fractal-images/mosely-snowflake.jpg",
  },
  "/n-flake": {
    title: "N-Flake",
    description:
      "Generate N-Flake polyfractals by changing the number of polygon sides and watching the recursive copies bloom outward.",
    imagePath: "/assets/fractal-images/n-flake.jpg",
  },
  "/pythagoras-tree": {
    title: "Pythagoras Tree",
    description:
      "Build a Pythagoras Tree from nested right triangles and squares in an interactive recursive branching fractal.",
    imagePath: "/assets/fractal-images/pythagoras-tree.jpg",
  },
  "/t-square-fractal": {
    title: "T-Square Fractal",
    description:
      "Explore the T-Square fractal and see how recursive corner-attached squares create a dense geometric construction.",
    imagePath: "/assets/fractal-images/t-square-fractal.jpg",
  },
  "/vicsek-fractal-2d": {
    title: "2D Vicsek Fractal",
    description:
      "View the 2D Vicsek Fractal and follow its cross-shaped recursive pattern across each successive iteration.",
    imagePath: "/assets/fractal-images/vicsek-fractal-2d.jpg",
  },
  "/vicsek-fractal-3d": {
    title: "3D Vicsek Fractal",
    description:
      "Rotate the 3D Vicsek Fractal and step through its cube-based recursive construction in an interactive viewer.",
    imagePath: "/assets/fractal-images/vicsek-fractal-3d.jpg",
  },
  "/l-system/board": {
    title: "L-System Board",
    description:
      "Draw the Board curve with an interactive L-system renderer and watch each iteration extend the square-based pattern.",
    imagePath: "/assets/fractal-images/l-system-board.jpg",
  },
  "/l-system/crystal": {
    title: "L-System Crystal",
    description:
      "Explore the Crystal curve through a configurable L-system drawing that grows into a delicate angular snowflake.",
    imagePath: "/assets/fractal-images/l-system-crystal.jpg",
  },
  "/l-system/dragon-curve": {
    title: "Dragon Curve",
    description:
      "Watch the Dragon Curve fold itself into place through an interactive L-system renderer and animated iterations.",
    imagePath: "/assets/fractal-images/l-system-dragon-curve.jpg",
  },
  "/l-system/fern-1": {
    title: "L-System Fern 1",
    description:
      "Grow an L-System Fern with adjustable iterations and color to see how simple rewriting rules mimic branching plants.",
    imagePath: "/assets/fractal-images/l-system-fern-1.jpg",
  },
  "/l-system/fern-2": {
    title: "L-System Fern 2",
    description:
      "Compare a second L-system fern variant and explore how small rule changes reshape the overall plant form.",
    imagePath: "/assets/fractal-images/l-system-fern-2.jpg",
  },
  "/l-system/fern-3": {
    title: "L-System Fern 3",
    description:
      "Follow another fern-like L-system pattern and animate its recursive growth from stem to branching leaflets.",
    imagePath: "/assets/fractal-images/l-system-fern-3.jpg",
  },
  "/l-system/fern-4": {
    title: "L-System Fern 4",
    description:
      "Explore a fourth L-system fern and compare its branching rhythm and silhouette with the other fern constructions.",
    imagePath: "/assets/fractal-images/l-system-fern-4.jpg",
  },
  "/l-system/fibonacci-word-fractal": {
    title: "Fibonacci Word Fractal",
    description:
      "Trace the Fibonacci Word Fractal and see how a simple symbolic growth rule creates a rich self-similar path.",
    imagePath: "/assets/fractal-images/l-system-fibonacci-word-fractal.jpg",
  },
  "/l-system/gosper-curve": {
    title: "Gosper Curve",
    description:
      "Explore the Gosper Curve, a flowing space-filling L-system with a distinctive hexagonal rhythm and sweep.",
    imagePath: "/assets/fractal-images/l-system-gosper-curve.jpg",
  },
  "/l-system/hilbert-curve": {
    title: "Hilbert Curve",
    description:
      "Follow the Hilbert Curve as it recursively fills the plane and demonstrates one of the best-known space-filling paths.",
    imagePath: "/assets/fractal-images/l-system-hilbert-curve.jpg",
  },
  "/l-system/koch-snowflake": {
    title: "Koch Snowflake",
    description:
      "Build the Koch Snowflake and explore one of the classic fractals that turns a triangle into an infinitely jagged boundary.",
    imagePath: "/assets/fractal-images/l-system-koch-snowflake.jpg",
  },
  "/l-system/levy-curve": {
    title: "Levy Curve",
    description:
      "Zoom into the Levy Curve and see how repeated bends create a cloud-like recursive path from a simple segment.",
    imagePath: "/assets/fractal-images/l-system-levy.jpg",
  },
  "/l-system/quadratic-snowflake": {
    title: "Quadratic Snowflake",
    description:
      "Explore the Quadratic Snowflake through an L-system renderer and compare its squared-off edges to the Koch family.",
    imagePath: "/assets/fractal-images/l-system-quadratic-snowflake.jpg",
  },
  "/l-system/sierpinski-arrowhead": {
    title: "Sierpinski Arrowhead",
    description:
      "Trace the Sierpinski Arrowhead curve and watch it weave a triangular self-similar path through animated iterations.",
    imagePath: "/assets/fractal-images/sierpinski-arrowhead.jpg",
  },
  "/l-system/sierpinski-curve": {
    title: "Sierpinski Curve",
    description:
      "Explore the Sierpinski Curve as an interactive L-system and compare its path-based structure to triangular subdivisions.",
    imagePath: "/assets/fractal-images/l-system-sierpinski-curve.jpg",
  },
  "/l-system/sierpinski-triangle": {
    title: "Sierpinski Triangle",
    description:
      "Build the Sierpinski Triangle with an L-system renderer and see the iconic triangular void pattern appear step by step.",
    imagePath: "/assets/fractal-images/l-system-sierpinski-triangle.jpg",
  },
};

const DEFAULT_ENTRY = PAGE_SEO["/"];

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(
    /\/$/,
    ""
  );
}

function joinUrl(base: string, path: string) {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getPageSeo(pathname: string) {
  const entry = PAGE_SEO[pathname] || DEFAULT_ENTRY;
  const siteUrl = getSiteUrl();
  const canonicalPath = pathname === "/" ? "/" : pathname;
  const title = canonicalPath === "/" ? entry.title : `${entry.title} | ${SITE_NAME}`;

  return {
    ...entry,
    title,
    siteName: SITE_NAME,
    url: joinUrl(siteUrl, canonicalPath),
    imageUrl: joinUrl(siteUrl, entry.imagePath),
    keywords: [
      entry.title,
      "interactive fractal",
      "mathematics visualization",
      "fractal explorer",
      SITE_NAME,
    ].join(", "),
  };
}
