import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";
import Head from "next/head";

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
    <>
      <Head>
        <title>L-System Fern-4</title>
        <meta
          name="description"
          content={`An interactive fractal implementation of a L-System Fern. You can specify the colors, and play around with the iterations as well as loop through and animate them.`}
        />
      </Head>
      <main className={styles.fullScreen}>
        <LSystem ruleset={fern4} />
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default Fern4;
