import { useEffect, useState } from "react";
import { Canvas } from "../../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { useWindowSize } from "../../utils/hooks/useWindowResize";
import { getDescription } from "../../utils/readFiles";
import {
  fitBounds,
  prepareCanvas,
  rewriteSentence,
  toCanvasPath,
  traceTurtle,
} from "../../utils/turtleCurves";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  background: string;
  color: string;
  lineWidth: number;
};

const MAX_ITERATIONS = 11;
const TURN_ANGLE = (2 * Math.PI) / 3;
const PADDING = 0.08;

const Terdragon = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: MAX_ITERATIONS,
    animateIterations: true,
    background: "#252424",
    color: "#7ee8a2",
    lineWidth: 1.5,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations === MAX_ITERATIONS ? 1800 : 900;

    const id = setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations:
          old.iterations >= MAX_ITERATIONS ? 1 : Math.min(old.iterations + 1, MAX_ITERATIONS),
      }));
    }, delay);

    return () => clearTimeout(id);
  }, [config.animateIterations, config.iterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const sentence = rewriteSentence("F", { F: "F+F-F" }, config.iterations);
    // Each iteration turns the chord by 30°, so counter-rotate to keep it level.
    const { points, bounds } = traceTurtle(sentence, {
      turnAngle: TURN_ANGLE,
      startAngle: (-config.iterations * Math.PI) / 6,
    });
    const transform = fitBounds(bounds, width, height, PADDING);

    prepareCanvas(ctx, width, height, config.background, config.lineWidth);
    ctx.strokeStyle = config.color;
    ctx.stroke(toCanvasPath(points, transform));
  }, [config, ctx, width, height]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="color" />
          <PanelNumber path="iterations" min={1} max={MAX_ITERATIONS} step={1} />
          <PanelNumber path="lineWidth" min={0.5} max={4} step={0.1} />
          <PanelBoolean path="animateIterations" />
        </ExplorerPanel>
        <div className={styles.fullScreen}>
          <Canvas setCtx={setCtx} width={width} height={height} />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default Terdragon;

export async function getStaticProps() {
  const description = await getDescription("terdragon.md");
  return {
    props: {
      description,
    },
  };
}
