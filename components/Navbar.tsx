import styles from "../styles/Navbar.module.css";
import Link from "next/link";
import { useState } from "react";

function createLinkFor(to: "next" | "prev" | "home") {
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
    return window.location.href.includes(link);
  });

  if (i === -1) {
    return "/";
  }
  if (to === "prev") {
    const newIndex = i - 1 >= 0 ? i - 1 : fractalLinks.length - 1;
    return fractalLinks[newIndex];
  }
  if (to === "next") {
    const newIndex = i + 1 <= fractalLinks.length - 1 ? i + 1 : 0;
    return fractalLinks[newIndex];
  }
  if (to === "home") {
    return "/";
  }
  return "/";
}

export const NavElement = () => {
  const nextFractal = createLinkFor("next");
  const prevFractal = createLinkFor("prev");
  const home = createLinkFor("home");

  return (
    <nav className={styles.navigationElement}>
      <Link as={prevFractal} href={prevFractal}>
        <a>
          <span className="icon-arrow-left"></span>
        </a>
      </Link>
      <Link as={home} href={home}>
        <a>
          <span className="icon-home3"></span>
        </a>
      </Link>
      <Link as={nextFractal} href={nextFractal}>
        <a>
          <span className="icon-arrow-right"></span>
        </a>
      </Link>
    </nav>
  );
};
