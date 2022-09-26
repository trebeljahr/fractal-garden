import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

const SierpinskiCurve = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Sierpinski Curve" />
      <NavElement />
    </main>
  );
};

export default SierpinskiCurve;
