import { useEffect, useState } from "react";
import { Canvas } from "../../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { useWindowSize } from "../../utils/hooks/useWindowResize";
import { getDescription } from "../../utils/readFiles";
import { drawFittedCurve, expandLSystem, traceTurtle } from "../../utils/turtleCurve";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  island: boolean;
  animateIterations: boolean;
  background: string;
  color: string;
  lineWidth: number;
};

const MAX_ITERATIONS = 5;
// Quadratic type 2 Koch curve. The island puts four curves on a square.
const SAUSAGE_AXIOM = "F";
const ISLAND_AXIOM = "F+F+F+F";
const RULES = { F: "F+F-F-FF+F+F-F" };
const TURNS = { "+": 90, "-": -90 };

const MinkowskiSausage = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: 4,
    island: false,
    animateIterations: true,
    background: "#252424",
    color: "#ff8fab",
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

    const axiom = config.island ? ISLAND_AXIOM : SAUSAGE_AXIOM;
    const sentence = expandLSystem(axiom, RULES, config.iterations);
    const curve = traceTurtle(sentence, TURNS);
    drawFittedCurve(ctx, curve, { width, height, ...config, closePath: config.island });
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
          <PanelBoolean path="island" label="Minkowski island" />
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

export default MinkowskiSausage;

export async function getStaticProps() {
  const description = await getDescription("minkowski-sausage.md");
  return {
    props: {
      description,
    },
  };
}
