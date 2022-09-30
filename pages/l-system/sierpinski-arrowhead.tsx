import LSystem, { Ruleset } from "../../components/LSystem";
import { NavElement } from "../../components/Navbar";
import styles from "../../styles/Fullscreen.module.css";
import { SideDrawer } from "../../components/SideDrawer";
import { getDescription } from "../../utils/readFiles";
import { radians } from "../../utils/ctxHelpers";
import Head from "next/head";

export async function getStaticProps() {
  const description = await getDescription("sierpinski-arrowhead.md");
  return {
    props: {
      description,
    },
  };
}
type Props = {
  description: string;
};

const SierpinskiArrowhead = ({ description }: Props) => {
  const sierpinskiArrowhead: Ruleset = {
    maxIterations: 11,
    minIterations: 1,
    color: "#FCD227",
    axiom: "YF",
    replace: {
      X: "YF+XF+Y",
      Y: "XF-YF-X",
    },
    angle: 60,
    initLength: (sizes) => Math.min(sizes.width, sizes.height),
    initTranslation: (sizes, initialLength) => {
      const totalHeight = (initialLength * Math.sqrt(3)) / 2;
      return [
        sizes.width / 2 - initialLength / 2,
        sizes.height - (sizes.height - totalHeight) / 2,
      ];
    },
    initRotation: (ctx, config) => {
      ctx.rotate(radians(30));
      if (config && config.iterations % 2 === 0) ctx.rotate(radians(60));
      if (config && config.iterations < 5) ctx.lineWidth = 2;
    },
    divideFactor: 2,
  };

  return (
    <>
      <Head>
        <title>L-System Sierpinski Arrowhead</title>
        <meta
          name="description"
          content={`An interactive fractal implementation of the Sierpinski Arrowhead Curve as an L-System. You can specify the colors, and play around with the iterations as well as loop through and animate them.`}
        />
      </Head>
      <main className={styles.fullScreen}>
        <LSystem ruleset={sierpinskiArrowhead} />
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default SierpinskiArrowhead;
