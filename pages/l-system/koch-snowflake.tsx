import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";
import Head from "next/head";

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
    <>
      <Head>
        <title>L-System Koch Snowflake</title>
        <meta
          name="description"
          content={`An interactive fractal implementation of the Koch Snowflake as an L-System. You can specify the colors, and play around with the iterations as well as loop through and animate them.`}
        />
      </Head>
      <main className={styles.fullScreen}>
        <LSystem ruleset={kochSnowflake} />
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default KochSnowflake;
