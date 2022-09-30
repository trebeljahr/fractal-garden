import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";
import Head from "next/head";

export async function getStaticProps() {
  const description = await getDescription("crystal.md");
  return {
    props: {
      description,
    },
  };
}

type Props = {
  description: string;
};

const Crystal = ({ description }: Props) => {
  const crystal: Ruleset = {
    color: "#18fce0",
    minIterations: 1,
    maxIterations: 7,
    axiom: "F+F+F+F",
    replace: {
      F: "FF+F++F+F",
    },
    angle: 90,
    initLength: (sizes) => Math.min(sizes.width, sizes.height) * 0.7,
    initTranslation: (sizes, initialLength) => [
      sizes.width / 2 - initialLength / 2,
      sizes.height / 2 + initialLength / 2,
    ],
    divideFactor: 3,
  };
  return (
    <>
      <Head>
        <title>L-System Crystal</title>
        <meta
          name="description"
          content={`An interactive fractal implementation of a L-System "Crystal". You can specify the colors, and play around with the iterations as well as loop through and animate them.`}
        />
      </Head>
      <main className={styles.fullScreen}>
        <LSystem ruleset={crystal} />
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default Crystal;
