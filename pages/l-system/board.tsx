import LSystem, { type Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { timesDrawnLead } from "../../utils/lessons/timesDrawn";
import { getDescription } from "../../utils/readFiles";

type Props = {
  description: string;
};

const BOARD_LEAD = timesDrawnLead("F+F+F+F", "FF+F+F+F+FF");

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
    initLength: (sizes) => Math.min(sizes.width, sizes.height) * 0.7,
    initTranslation: (sizes, initialLength) => [
      sizes.width / 2 - initialLength / 2,
      sizes.height / 2 + initialLength / 2,
    ],
    divideFactor: 3,
  };
  return (
    <>
      <main className={styles.lSystem}>
        <LSystem ruleset={board} constructionLead={BOARD_LEAD} />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
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
