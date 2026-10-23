import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Navbar.module.css";
import { getFractalName, PAGE_SEO } from "../utils/pageSeo";

function useLinks() {
  const router = useRouter();
  const fractalLinks = [
    "/mandelbrot",
    "/julia-set",
    "/burning-ship",
    "/mosely-snowflake",
    "/vicsek-fractal-3d",
    "/menger-sponge",
    "/mandelbulb",
    "/buddhabrot",
    "/newton-fractal",
    "/pythagoras-tree",
    "/barnsley-fern",
    "/sierpinski-carpet",
    "/l-system/levy-curve",
    "/l-system/dragon-curve",
    "/l-system/gosper-curve",
    "/l-system/fern-1",
    "/l-system/fern-2",
    "/l-system/fern-3",
    "/l-system/fern-4",
    "/l-system/board",
    "/l-system/sierpinski-triangle",
    "/fractal-canopy",
    "/l-system/quadratic-snowflake",
    "/l-system/koch-snowflake",
    "/l-system/hilbert-curve",
    "/l-system/sierpinski-curve",
    "/l-system/crystal",
    "/l-system/sierpinski-arrowhead",
    "/l-system/fibonacci-word-fractal",
    "/l-system/explorer",
    "/t-square-fractal",
    "/n-flake",
    "/vicsek-fractal-2d",
    "/apollonian-gasket",
    "/logistic-map",
    "/diffusion-limited-aggregation",
    "/jerusalem-cube",
    "/quadratic-koch-3d",
    "/l-system/twindragon",
    "/l-system/terdragon",
    "/l-system/cesaro-fractal",
    "/l-system/minkowski-sausage",
    "/l-system/quadratic-koch-island",
    "/l-system/koch-anti-snowflake",
    "/lorenz-attractor",
    "/rossler-attractor",
    "/l-system/hilbert-curve-3d",
    "/penrose-tiling",
    "/h-tree",
    "/rauzy-fractal",
    "/sierpinski-tetrahedron",
    "/polyhedron-flake",
    "/koch-surface",
  ];

  // Exact match first, so "/l-system/hilbert-curve-3d" doesn't resolve to "/l-system/hilbert-curve".
  const exactIndex = fractalLinks.indexOf(router.pathname);
  const i =
    exactIndex >= 0
      ? exactIndex
      : fractalLinks.findIndex((link) => {
          return router.pathname.includes(link);
        });

  if (i === -1) return ["/", "/", "/"];

  const prevIndex = i - 1 >= 0 ? i - 1 : fractalLinks.length - 1;
  const prev = fractalLinks[prevIndex];

  const nextIndex = i + 1 <= fractalLinks.length - 1 ? i + 1 : 0;
  const next = fractalLinks[nextIndex];

  return [prev, "/", next];
}

function NavigationArrow({ previous = false }: { previous?: boolean }) {
  return (
    <svg
      width="32"
      height="18"
      viewBox="0 0 32 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={previous ? "M30 9H2m7-7L2 9l7 7" : "M2 9h28m-7-7 7 7-7 7"} />
    </svg>
  );
}

export const NavElement = () => {
  const [prev, , next] = useLinks();

  return (
    <nav aria-label="Fractal navigation" data-fractal-chrome>
      <Link
        className={`${styles.linkButton} ${styles.previous}`}
        href={prev}
        aria-label={`Previous fractal: ${getFractalName(prev)}`}
        title={`Previous fractal: ${getFractalName(prev)}`}
      >
        <span className={styles.direction}>
          <NavigationArrow previous />
          <span>Previous</span>
        </span>
        <span className={styles.destination}>
          <Image
            className={styles.preview}
            src={PAGE_SEO[prev].imagePath}
            alt=""
            width={24}
            height={24}
          />
          <span className={styles.fractalName}>{getFractalName(prev)}</span>
        </span>
      </Link>
      <Link
        className={`${styles.linkButton} ${styles.next}`}
        href={next}
        aria-label={`Next fractal: ${getFractalName(next)}`}
        title={`Next fractal: ${getFractalName(next)}`}
      >
        <span className={styles.direction}>
          <span>Next</span>
          <NavigationArrow />
        </span>
        <span className={styles.destination}>
          <Image
            className={styles.preview}
            src={PAGE_SEO[next].imagePath}
            alt=""
            width={24}
            height={24}
          />
          <span className={styles.fractalName}>{getFractalName(next)}</span>
        </span>
      </Link>
    </nav>
  );
};
