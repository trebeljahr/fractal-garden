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
    "/l-system/levy-curve",
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
        <a className={styles.linkButton}>
          <span className="icon-arrow-left"></span>
        </a>
      </Link>
      <Link as={home} href={home}>
        <a className={styles.linkButton}>
          <span className="icon-home3"></span>
        </a>
      </Link>
      <Link as={next} href={next}>
        <a className={styles.linkButton}>
          <span className="icon-arrow-right"></span>
        </a>
      </Link>
    </nav>
  );
};
