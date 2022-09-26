import styles from "../styles/Navbar.module.css";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";

function useLinks() {
  const router = useRouter();
  const fractalLinks = [
    "/mandelbrot",
    "/barnsley-fern",
    "/sierpinski-carpet",
    // "/l-system/index.html?fractal=l%C3%A9vy-curve",
    // "/l-system/index.html?fractal=fern-1",
    // "/l-system/index.html?fractal=fern-2",
    // "/l-system/index.html?fractal=fern-3",
    // "/l-system/index.html?fractal=fern-4",
    // "/l-system/index.html?fractal=board",
    // "/l-system/index.html?fractal=sierpinski-triangle",
    // "/fractal-tree",
    // "/l-system/index.html?fractal=quadratic-snowflake",
    // "/l-system/index.html?fractal=koch-snowflake",
    // "/l-system/index.html?fractal=hilbert-curve",
    // "/l-system/index.html?fractal=sierpinski-square",
    // "/l-system/index.html?fractal=crystal",
  ];

  const i = fractalLinks.findIndex((link) => {
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
      <Link as={prev} href={prev}>
        <a>
          <span className="icon-arrow-left"></span>
        </a>
      </Link>
      <Link as={home} href={home}>
        <a>
          <span className="icon-home3"></span>
        </a>
      </Link>
      <Link as={next} href={next}>
        <a>
          <span className="icon-arrow-right"></span>
        </a>
      </Link>
    </nav>
  );
};
