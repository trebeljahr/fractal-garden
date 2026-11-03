import { useState } from "react";
import { PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import { TurtleCurveZoom } from "../../components/TurtleCurveZoom";
import styles from "../../styles/Fullscreen.module.css";
import { useFractalRenderer } from "../../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../../utils/hooks/useFractalViewportSize";
import { GOSPER_LEAD } from "../../utils/lessons/gosperCopies";
import { getDescription } from "../../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  background: string;
  color: string;
  lineWidth: number;
};

const MAX_ITERATIONS = 6;

const GosperCurve = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>({
    iterations: 1,
    background: "#252424",
    color: "#89f7d1",
    lineWidth: 1.3,
  });

  const { containerRef, ready } = useFractalRenderer({
    kind: "gosperCurve",
    storageKey: "gosper-curve",
    config,
    setConfig,
    params: config,
    width,
    height,
    min: 1,
    max: MAX_ITERATIONS,
    stepDelay: 1100,
    holdDelay: 1800,
    constructionLead: GOSPER_LEAD,
  });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.lSystem}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="color" />
          <PanelNumber path="iterations" min={1} max={MAX_ITERATIONS} step={1} />
          <PanelNumber path="lineWidth" min={0.5} max={4} step={0.1} />
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
          ref={containerRef}
        />
        <TurtleCurveZoom
          ready={ready}
          axiom={"FX"}
          rules={{ X: "X+YF++YF-FX--FXFX-YF+", Y: "-FX+YFYF++YF+FX--FX-Y" }}
          turn={60}
          start={0}
          draw={"F"}
          minSpan={1}
          config={config}
          width={width}
          height={height}
        />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default GosperCurve;

export async function getStaticProps() {
  const description = await getDescription("gosper-curve.md");
  return {
    props: {
      description,
    },
  };
}
