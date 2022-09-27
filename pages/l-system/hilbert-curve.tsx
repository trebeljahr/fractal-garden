import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";

import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

export async function getStaticProps() {
  const description = await getDescription("hilbert-curve.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const HilbertCurve = ({ description }: Props) => {
  const hilbertCurve: Ruleset = {
    color: "#fc79ff",
    minIterations: 1,
    maxIterations: 9,
    axiom: "W",
    replace: {
      V: "-WF+VFV+FW-",
      W: "+VF-WFW-FV+",
    },
    angle: 90,
    initLength: (p5) => Math.min(p5.width, p5.height) * 0.7,
    initTranslation: (p5, initialLength) => [
      p5.width / 2 - initialLength / 2,
      p5.height / 2 + initialLength / 2,
    ],
    divideFactor: 2,
  };
  return (
    <main className={styles.fullScreen}>
      <LSystem ruleset={hilbertCurve} />
      <SideDrawer description={description} />

      <NavElement />
    </main>
  );
};

export default HilbertCurve;
