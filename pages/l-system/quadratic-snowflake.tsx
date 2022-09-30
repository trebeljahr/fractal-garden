import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";
import Head from "next/head";

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
      <Head>
        <title>L-System Quadratic Snowflake</title>
        <meta
          name="description"
          content={`An interactive fractal implementation of a Quadratic Snowflake as an L-System. You can specify the colors, and play around with the iterations as well as loop through and animate them.`}
        />
      </Head>
      <main className={styles.fullScreen}>
        <LSystem ruleset={quadraticSnowflake} />
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default QuadraticSnowflake;
