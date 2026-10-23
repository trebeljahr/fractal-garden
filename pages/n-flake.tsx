import { useCallback, useEffect, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { RecursivePatternZoom } from "../components/RecursivePatternZoom";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { useGrowingFractal } from "../utils/hooks/useGrowingFractal";
import { getDescription } from "../utils/readFiles";
import { getMaxIterations, usesCenterPolygon } from "../utils/render/drawings/nFlake";

type Props = {
  description: string;
};

type Config = {
  sides: number;
  iterations: number;
  animateIterations: boolean;
  includeCenter: boolean;
  rotation: number;
  background: string;
  color: string;
  fillPolygons: boolean;
  strokePolygons: boolean;
  lineWidth: number;
};

const MIN_SIDES = 3;
const MAX_SIDES = 10;

const NFlake = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>({
    sides: 5,
    iterations: 0,
    animateIterations: true,
    includeCenter: true,
    rotation: 0,
    background: "#252424",
    color: "#94f0d7",
    fillPolygons: true,
    strokePolygons: true,
    lineWidth: 0.8,
  });

  const maxIterations = getMaxIterations(config.sides, config.includeCenter);
  const centeredVariant = usesCenterPolygon(config.sides, config.includeCenter);

  useEffect(() => {
    if (config.iterations <= maxIterations) return;

    setConfig((old) => ({
      ...old,
      iterations: maxIterations,
    }));
  }, [config.iterations, maxIterations]);

  const { containerRef, animateLabel } = useGrowingFractal({
    kind: "nFlake",
    storageKey: `n-flake:${config.sides}${centeredVariant ? "-center" : ""}`,
    config,
    setConfig,
    params: config,
    width,
    height,
    max: maxIterations,
  });

  const onZoomActive = useCallback(() => {
    setConfig((old) => ({ ...old, animateIterations: false }));
  }, []);

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
          <PanelNumber path="sides" min={MIN_SIDES} max={MAX_SIDES} step={1} />
          <PanelNumber path="iterations" min={0} max={maxIterations} step={1} />
          <PanelBoolean path="animateIterations" label={animateLabel} />
          <PanelBoolean path="includeCenter" />
          <PanelNumber path="rotation" min={-180} max={180} step={1} />
          <PanelNumber path="lineWidth" min={0.2} max={3} step={0.1} />
          <PanelBoolean path="fillPolygons" />
          <PanelBoolean path="strokePolygons" />
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
          ref={containerRef}
        />
        <RecursivePatternZoom
          pattern={{ kind: "flake", config }}
          width={width}
          height={height}
          onActive={onZoomActive}
        />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default NFlake;

export async function getStaticProps() {
  const description = await getDescription("n-flake.md");
  return {
    props: {
      description,
    },
  };
}
