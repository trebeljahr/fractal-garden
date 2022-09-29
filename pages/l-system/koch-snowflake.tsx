import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";

export async function getStaticProps() {
  const description = await getDescription("koch-snowflake.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const KochSnowflake = ({ description }: Props) => {
  const kochSnowflake: Ruleset = {
    color: "#b1e5e8",
    minIterations: 1,
    maxIterations: 7,
    axiom: "F++F++F",
    replace: {
      F: "F-F++F-F",
    },
    angle: 60,
    initLength: (sizes) => Math.min(sizes.width, sizes.height) * 0.8,
    initTranslation: (sizes, initialLength) => [
      sizes.width / 2 - initialLength / 3,
      sizes.height / 2 + initialLength / 2,
    ],
    divideFactor: 3,
  };
  return (
    <main className={styles.fullScreen}>
      <LSystem ruleset={kochSnowflake} />
      <SideDrawer description={description} />

      <NavElement />
    </main>
  );
};

export default KochSnowflake;
