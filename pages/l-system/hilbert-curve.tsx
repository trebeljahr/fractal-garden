import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

const HilbertCurve = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Hilbert Curve" />
      <NavElement />
    </main>
  );
};

export default HilbertCurve;
