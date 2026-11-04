import LSystem, { type Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { QUADRATIC_LEAD, QUADRATIC_STARTS } from "../../utils/lessons/quadraticStart";
import { getDescription } from "../../utils/readFiles";

export async function getStaticProps() {
  const description = await getDescription("quadratic-snowflake.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const quadraticAxiom = (settings: Record<string, unknown>) =>
  QUADRATIC_STARTS[settings.start as string];

const QuadraticSnowflake = ({ description }: Props) => {
  const quadraticSnowflake: Ruleset = {
    color: "#80b8f9",
    minIterations: 1,
    maxIterations: 7,
    axiom: "FF+FF+FF+FF",
    replace: {
      F: "F+F-F-F+F",
    },
    angle: 90,
    initLength: (sizes) => Math.min(sizes.width, sizes.height) / 2.5,
    initTranslation: (sizes, initialLength) => [
      sizes.width / 2 - initialLength,
      sizes.height / 2 + initialLength,
    ],
    divideFactor: 3,
  };
  return (
    <>
      <main className={styles.lSystem}>
        <LSystem
          ruleset={quadraticSnowflake}
          constructionLead={QUADRATIC_LEAD}
          constructionAxiom={quadraticAxiom}
        />
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default QuadraticSnowflake;
