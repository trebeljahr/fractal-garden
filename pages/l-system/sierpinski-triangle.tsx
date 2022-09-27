import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

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
    initLength: (p5) => Math.min(p5.width, p5.height),
    initTranslation: (p5, initialLength) => {
      const totalHeight = (initialLength * Math.sqrt(3)) / 2;
      return [
        p5.width / 2 - initialLength / 2,
        p5.height - (p5.height - totalHeight) / 2,
      ];
    },
    initRotation: (p5) => p5.rotate(90),
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
