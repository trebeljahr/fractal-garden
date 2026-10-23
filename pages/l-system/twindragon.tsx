import { useEffect, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import type { CanvasViewport } from "../../utils/canvasViewport";
import { useCanvasViewport } from "../../utils/hooks/useCanvasViewport";
import { useFractalRenderer } from "../../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../../utils/hooks/useFractalViewportSize";
import { getDescription } from "../../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  viewport?: CanvasViewport;
  iterations: number;
  showTiling: boolean;
  background: string;
  firstDragon: string;
  secondDragon: string;
  lineWidth: number;
};

const MAX_ITERATIONS = 16;

const Twindragon = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>({
    iterations: 1,
    showTiling: false,
    background: "#252424",
    firstDragon: "#ffb86b",
    secondDragon: "#c792ea",
    lineWidth: 1.5,
  });

  const { containerRef, canvas, setParams } = useFractalRenderer({
    kind: "twindragon",
    storageKey: `twindragon:${config.showTiling ? "tiling" : "single"}`,
    config,
    setConfig,
    params: config,
    width,
    height,
    min: 1,
    max: MAX_ITERATIONS,
    stepDelay: 900,
    holdDelay: 1800,
  });

  const viewport = useCanvasViewport(canvas);
  useEffect(() => {
    setParams({ ...config, viewport });
  }, [config, viewport, setParams]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.lSystem}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="firstDragon" />
          <PanelColor path="secondDragon" />
          <PanelNumber path="iterations" min={1} max={MAX_ITERATIONS} step={1} />
          <PanelNumber path="lineWidth" min={0.5} max={4} step={0.1} />
          <PanelBoolean path="showTiling" />
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

export default Twindragon;

export async function getStaticProps() {
  const description = await getDescription("twindragon.md");
  return {
    props: {
      description,
    },
  };
}
