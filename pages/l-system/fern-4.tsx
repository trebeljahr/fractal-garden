import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

export async function getStaticProps() {
  const description = await getDescription("fern-4.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const Fern4 = ({ description }: Props) => {
  const fern4: Ruleset = {
    color: "#ffe10b",
    minIterations: 1,
    maxIterations: 9,
    axiom: "X",
    replace: {
      X: "F[+X]F[-X]+X",
      F: "FF",
    },
    divideFactor: 2,
    initLength(sizes) {
      return sizes.height * 0.4;
    },
    angle: 20,
    initTranslation(sizes) {
      return [sizes.width / 2, sizes.height];
    },
  };
  return (
    <main className={styles.fullScreen}>
      <LSystem ruleset={fern4} />
      <SideDrawer description={description} />

      <NavElement />
    </main>
  );
};

export default Fern4;
