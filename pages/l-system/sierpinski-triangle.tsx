import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";
import { radians } from "../../utils/ctxHelpers";

export async function getStaticProps() {
  const description = await getDescription("sierpinski-triangle.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const SierpinskiTriangle = ({ description }: Props) => {
  const sierpinskiTriangle: Ruleset = {
    color: "#fc366b",
    minIterations: 1,
    maxIterations: 10,
    axiom: "F-G-G",
    replace: {
      F: "F-G+F+G-F",
      G: "GG",
    },
    angle: 120,
    initLength: (sizes) => Math.min(sizes.width, sizes.height),
    initTranslation: (sizes, initialLength) => {
      const totalHeight = (initialLength * Math.sqrt(3)) / 2;
      return [
        sizes.width / 2 - initialLength / 2,
        sizes.height - (sizes.height - totalHeight) / 2,
      ];
    },
    initRotation: (ctx) => ctx.rotate(radians(90)),
    divideFactor: 2,
  };
  return (
    <main className={styles.fullScreen}>
      <LSystem ruleset={sierpinskiTriangle} />
      <SideDrawer description={description} />

      <NavElement />
    </main>
  );
};

export default SierpinskiTriangle;
