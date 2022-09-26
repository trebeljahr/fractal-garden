import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

const KochCurve = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Koch Curve" />
      <NavElement />
    </main>
  );
};

export default KochCurve;
