import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

export async function getStaticProps() {
  const description = await getDescription("fern-2.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const Fern2 = ({ description }: Props) => {
  const fern2: Ruleset = {
    color: "#3cf7d2",
    minIterations: 1,
    maxIterations: 9,
    axiom: "Y",
    replace: {
      X: "X[-FFF][+FFF]FX",
      Y: "YFX[+Y][-Y]",
    },
    angle: 25.7,
    initLength: (ctx) => ctx.height * 0.6,
    initTranslation: (ctx) => [ctx.width / 2, ctx.height],
    divideFactor: 2.05,
  };
  return (
    <main className={styles.fullScreen}>
      <LSystem ruleset={fern2} />
      <SideDrawer description={description} />

      <NavElement />
    </main>
  );
};

export default Fern2;
