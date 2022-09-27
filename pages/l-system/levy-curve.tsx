import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

export async function getStaticProps() {
  const description = await getDescription("levy-curve.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const LévyCurve = ({ description }: Props) => {
  const levyCurve: Ruleset = {
    color: "#54bffc",
    minIterations: 1,
    maxIterations: 17,
    axiom: "F",

    replace: {
      F: "-F++F-",
    },
    angle: 45,
    initLength: (p5) =>
      Math.min(p5.width, p5.height) * (p5.width > p5.height * 1.3 ? 0.7 : 0.45),
    initTranslation: (p5, initialLength) => [
      p5.width / 2 - initialLength / 2,
      p5.height / 2 + initialLength / 2.6,
    ],
    initRotation: (p5) => p5.rotate(90),
    divideFactor: 1.417,
  };
  return (
    <main className={styles.fullScreen}>
      <LSystem ruleset={levyCurve} />
      <SideDrawer description={description} />

      <NavElement />
    </main>
  );
};

export default LévyCurve;
