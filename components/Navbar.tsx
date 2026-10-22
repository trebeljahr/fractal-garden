import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Navbar.module.css";
import { getFractalName } from "../utils/pageSeo";

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

export const NavElement = () => {
  const [prev, home, next] = useLinks();

  return (
    <nav aria-label="Fractal navigation" data-fractal-chrome>
      <Link legacyBehavior href={home}>
        <a href={home} className={styles.homeLink} aria-label="Fractal Garden home">
          Fractal Garden
        </a>
      </Link>
      <Link legacyBehavior href={prev}>
        <a
          className={`${styles.linkButton} ${styles.previous}`}
          href={prev}
          aria-label={`Previous fractal: ${getFractalName(prev)}`}
        >
          <span className="icon-arrow-left" aria-hidden="true" />
          <span className={styles.destination}>
            <span className={styles.direction}>Prev</span>
            <span className={styles.fractalName}>{getFractalName(prev)}</span>
          </span>
        </a>
      </Link>
      <Link legacyBehavior href={next}>
        <a
          className={`${styles.linkButton} ${styles.next}`}
          href={next}
          aria-label={`Next fractal: ${getFractalName(next)}`}
        >
          <span className={styles.destination}>
            <span className={styles.direction}>Next</span>
            <span className={styles.fractalName}>{getFractalName(next)}</span>
          </span>
          <span className="icon-arrow-right" aria-hidden="true" />
        </a>
      </Link>
    </nav>
  );
};
