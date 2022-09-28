import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

export async function getStaticProps() {
  const description = await getDescription("sierpinski-curve.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const SierpinskiCurve = ({ description }: Props) => {
  const sierpinskiCurve: Ruleset = {
    color: "#f7ad1c",
    minIterations: 1,
    maxIterations: 7,
    axiom: "F+XF+F+XF",
    replace: {
      X: "XF-F+F-XF+F+XF-F+F-X",
    },
    angle: 90,
    initLength: (sizes) => Math.min(sizes.width, sizes.height) * 0.25,
    initTranslation(sizes, initialLength) {
      return [sizes.width / 2 - initialLength * 1.6, sizes.height / 2];
    },
    divideFactor: 2.05,
  };
  return (
    <main className={styles.fullScreen}>
      <LSystem ruleset={sierpinskiCurve} />
      <SideDrawer description={description} />

      <NavElement />
    </main>
  );
};

export default SierpinskiCurve;
