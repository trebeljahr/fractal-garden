import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

type Props = {
  description: string;
};

const Board = ({ description }: Props) => {
  const board: Ruleset = {
    color: "#339ffc",
    minIterations: 1,
    maxIterations: 6,
    axiom: "F+F+F+F",
    replace: {
      F: "FF+F+F+F+FF",
    },
    angle: 90,
    initLength: (p5) => Math.min(p5.width, p5.height) * 0.7,
    initTranslation: (p5, initialLength) => [
      p5.width / 2 - initialLength / 2,
      p5.height / 2 + initialLength / 2,
    ],
    divideFactor: 3,
  };
  return (
    <main className={styles.fullScreen}>
      <LSystem ruleset={board} />
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default Board;

export async function getStaticProps() {
  const description = await getDescription("board.md");
  return {
    props: {
      description,
    },
  };
}
