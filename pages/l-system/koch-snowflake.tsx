import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

const KochSnowflake = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Koch Snowflake" />
      <NavElement />
    </main>
  );
};

export default KochSnowflake;
