import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";
import Head from "next/head";

export async function getStaticProps() {
  const description = await getDescription("fern-1.md");
  return {
    props: {
      description,
    },
  };
}

type Props = {
  description: string;
};

const Fern1 = ({ description }: Props) => {
  const fern1: Ruleset = {
    color: "#adff00",
    minIterations: 1,
    maxIterations: 8,
    axiom: "X",
    replace: {
      X: "F+[[X]-X]-F[-FX]+X",
      F: "FF",
    },
    angle: -25,
    initLength: (sizes) => sizes.height * 0.37,
    initTranslation: (sizes) => [sizes.width / 2, sizes.height],
    divideFactor: 2,
  };
  return (
    <>
      <Head>
        <title>L-System Fern-1</title>
        <meta
          name="description"
          content={`An interactive fractal implementation of a L-System Fern. You can specify the colors, and play around with the iterations as well as loop through and animate them.`}
        />
      </Head>
      <main className={styles.fullScreen}>
        <LSystem ruleset={fern1} />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default Fern1;
