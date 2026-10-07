import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Navbar.module.css";

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
    <nav className={styles.navigationElement}>
      <Link legacyBehavior as={prev} href={prev}>
        <a className={styles.linkButton}>
          <span className="icon-arrow-left">
            <span className="screen-reader-only">
              Arrow Left Icon - When clicked, go to the previous fractal in the exhibition.
            </span>
          </span>
        </a>
      </Link>
      <Link legacyBehavior as={home} href={home}>
        <a className={styles.linkButton}>
          <span className="icon-home3">
            <span className="screen-reader-only">
              Home Icon - When clicked, go back to the Home Page of the Exhibition.
            </span>
          </span>
        </a>
      </Link>
      <Link legacyBehavior as={next} href={next}>
        <a className={styles.linkButton}>
          <span className="icon-arrow-right">
            <span className="screen-reader-only">
              Arrow Right Icon - When clicked, go to the next fractal in the exhibition.
            </span>
          </span>
        </a>
      </Link>
    </nav>
  );
};
