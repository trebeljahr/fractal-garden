import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

const LévyCurve = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Lévy Curve" />
      <NavElement />
    </main>
  );
};

export default LévyCurve;
