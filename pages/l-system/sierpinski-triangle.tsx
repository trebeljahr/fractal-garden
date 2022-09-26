import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

const SierpinskiTriangle = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Sierpinski Triangle" />
      <NavElement />
    </main>
  );
};

export default SierpinskiTriangle;
