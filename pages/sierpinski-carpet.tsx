import React from "react";
import P5 from "p5";
import dynamic from "next/dynamic";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";

// Will only import `react-p5` on client-side
const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

const SierpinskiCarpet = () => {
  return (
    <main className={styles.fullScreen}>
      <NavElement />
    </main>
  );
};
export default SierpinskiCarpet;
