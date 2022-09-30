import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";
import { radians } from "../../utils/ctxHelpers";
import Head from "next/head";

export async function getStaticProps() {
  const description = await getDescription("levy-curve.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const LévyCurve = ({ description }: Props) => {
  const levyCurve: Ruleset = {
    color: "#54bffc",
    minIterations: 1,
    maxIterations: 17,
    axiom: "F",

    replace: {
      F: "-F++F-",
    },
    angle: 45,
    initLength: (sizes) =>
      Math.min(sizes.width, sizes.height) *
      (sizes.width > sizes.height * 1.3 ? 0.7 : 0.45),
    initTranslation: (sizes, initialLength) => [
      sizes.width / 2 - initialLength / 2,
      sizes.height / 2 + initialLength / 2.6,
    ],
    initRotation: (ctx) => ctx.rotate(radians(90)),
    divideFactor: 1.417,
  };
  return (
    <>
      <Head>
        <title>L-System Lévy Curve</title>
        <meta
          name="description"
          content={`An interactive fractal implementation of the Lévy Curve as an L-System. You can specify the colors, and play around with the iterations as well as loop through and animate them.`}
        />
      </Head>
      <main className={styles.fullScreen}>
        <LSystem ruleset={levyCurve} />
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default LévyCurve;
