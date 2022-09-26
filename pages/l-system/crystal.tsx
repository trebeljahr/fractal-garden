import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

const Crystal = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Crystal" />
      <NavElement />
    </main>
  );
};

export default Crystal;
