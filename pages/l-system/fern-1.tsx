import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

export async function getStaticProps() {
  const description = await getDescription("fern-1.md");
  return {
    props: {
      description,
    },
  };
}

type Props = {
  description: string;
};

const Fern1 = ({ description }: Props) => {
  const fern1: Ruleset = {
    color: "#adff00",
    minIterations: 1,
    maxIterations: 8,
    axiom: "X",
    replace: {
      X: "F+[[X]-X]-F[-FX]+X",
      F: "FF",
    },
    angle: -25,
    initLength: (p5) => p5.height * 0.37,
    initTranslation: (p5) => [p5.width / 2, p5.height],
    divideFactor: 2,
  };
  return (
    <main className={styles.fullScreen}>
      <LSystem ruleset={fern1} />
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default Fern1;
