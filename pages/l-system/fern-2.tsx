import LSystem, { type Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { FERN2_LEAD } from "../../utils/lessons/fern2OldPlant";
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
    fitToViewport: true,
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
    <>
      <main className={styles.lSystem}>
        <LSystem ruleset={fern2} constructionLead={FERN2_LEAD} />
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default Fern2;
