import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";

const Board = () => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Board" />
      <NavElement />
    </main>
  );
};

export default Board;
