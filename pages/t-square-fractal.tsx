import { useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useGrowingFractal } from "../utils/hooks/useGrowingFractal";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  ratio: number;
  background: string;
  color: string;
  fillSquares: boolean;
  strokeSquares: boolean;
  lineWidth: number;
};

const MAX_ITERATIONS = 9;

const TSquareFractal = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [config, setConfig] = useState<Config>({
    iterations: 0,
    animateIterations: true,
    ratio: 0.5,
    background: "#252424",
    color: "#ffffff",
    fillSquares: true,
    strokeSquares: false,
    lineWidth: 0.8,
  });

  const { containerRef, animateLabel } = useGrowingFractal({
    kind: "tSquare",
    storageKey: "t-square-fractal",
    config,
    setConfig,
    params: config,
    width,
    height,
    max: MAX_ITERATIONS,
    stepDelay: 850,
  });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="color" />
          <PanelNumber path="iterations" min={0} max={MAX_ITERATIONS} step={1} />
          <PanelNumber path="ratio" min={0.25} max={0.75} step={0.01} />
          <PanelNumber path="lineWidth" min={0.5} max={4} step={0.1} />
          <PanelBoolean path="animateIterations" label={animateLabel} />
          <PanelBoolean path="fillSquares" />
          <PanelBoolean path="strokeSquares" />
        </ExplorerPanel>
        <div className={styles.fullScreen} ref={containerRef} />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default TSquareFractal;

export async function getStaticProps() {
  const description = await getDescription("t-square-fractal.md");
  return {
    props: {
      description,
    },
  };
}
