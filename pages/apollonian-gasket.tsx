import { useEffect, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import type { CanvasViewport } from "../utils/canvasViewport";
import { useCanvasViewport } from "../utils/hooks/useCanvasViewport";
import { useFractalRenderer } from "../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  viewport?: CanvasViewport;
  iterations: number;
  background: string;
  color: string;
  fillCircles: boolean;
  strokeCircles: boolean;
  lineWidth: number;
  showOuterCircle: boolean;
};

const MAX_ITERATIONS = 7;

const ApollonianGasket = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>({
    iterations: 0,
    background: "#252424",
    color: "#efdfb6",
    fillCircles: false,
    strokeCircles: true,
    lineWidth: 1,
    showOuterCircle: true,
  });

  const { containerRef, canvas, setParams } = useFractalRenderer({
    kind: "apollonianGasket",
    storageKey: "apollonian-gasket",
    config,
    setConfig,
    params: config,
    width,
    height,
    max: MAX_ITERATIONS,
    stepDelay: 1050,
  });

  const viewport = useCanvasViewport(canvas);
  useEffect(() => {
    setParams({ ...config, viewport });
  }, [config, viewport, setParams]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="color" />
          <PanelNumber path="iterations" min={0} max={MAX_ITERATIONS} step={1} />
          <PanelNumber path="lineWidth" min={0.4} max={3} step={0.1} />
          <PanelBoolean path="fillCircles" />
          <PanelBoolean path="strokeCircles" />
          <PanelBoolean path="showOuterCircle" />
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
          ref={containerRef}
        />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default ApollonianGasket;

export async function getStaticProps() {
  const description = await getDescription("apollonian-gasket.md");
  return {
    props: {
      description,
    },
  };
}
