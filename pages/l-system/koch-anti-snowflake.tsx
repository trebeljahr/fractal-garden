import { useState } from "react";
import { PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import { TurtleCurveZoom } from "../../components/TurtleCurveZoom";
import styles from "../../styles/Fullscreen.module.css";
import { useFractalRenderer } from "../../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../../utils/hooks/useFractalViewportSize";
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

const MAX_ITERATIONS = 7;

const KochAntiSnowflake = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>({
    iterations: 1,
    background: "#252424",
    color: "#c3b1e1",
    lineWidth: 1.5,
  });

  const { containerRef, ready } = useFractalRenderer({
    kind: "kochAntiSnowflake",
    storageKey: "koch-anti-snowflake",
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
          axiom={"F++F++F"}
          rules={{ F: "F+F--F+F" }}
          turn={60}
          start={0}
          draw={"FG"}
          minSpan={1e-9}
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

export default KochAntiSnowflake;

export async function getStaticProps() {
  const description = await getDescription("koch-anti-snowflake.md");
  return {
    props: {
      description,
    },
  };
}
