import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

const Fern2 = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Fern 2" />
      <NavElement />
    </main>
  );
};

export default Fern2;
