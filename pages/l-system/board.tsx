import LSystem from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

type Props = {
  description: string;
};

const Board = ({ description }: Props) => {
  return (
    <main className={styles.fullScreen}>
      <LSystem fractal="Board" />
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
