import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

const Fern3 = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Fern 3" />
      <NavElement />
    </main>
  );
};

export default Fern3;
