import { useState } from "react";
import { PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { RecursivePatternZoom } from "../components/RecursivePatternZoom";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useFractalRenderer } from "../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { getDescription } from "../utils/readFiles";

type Config = {
  iterations: number;
  color: string;
  holeColor: string;
  background: string;
};

type Props = {
  description: string;
};

const MIN_ITERATIONS = 1;
const MAX_ITERATIONS = 5;

const SierpinskiCarpetComponent = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>({
    iterations: MIN_ITERATIONS,
    color: "#ffe100",
    background: "#252424",
    holeColor: "#000000",
  });
  const { width, height } = useFractalViewportSize();

  const { containerRef } = useFractalRenderer({
    kind: "sierpinskiCarpet",
    storageKey: "sierpinski-carpet",
    config,
    setConfig,
    params: config,
    width,
    height,
    min: MIN_ITERATIONS,
    max: MAX_ITERATIONS,
    stepDelay: 2000,
    holdDelay: 2000,
  });

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => ({ ...prevState, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          data={config}
          mode="pattern"
          lines={["Remove the centre square. Repeat in the eight that remain."]}
          onUpdate={handleUpdate}
        >
          <PanelColor path="background" />
          <PanelNumber
            path="iterations"
            label="Depth"
            min={MIN_ITERATIONS}
            max={MAX_ITERATIONS}
            step={1}
          />
          <PanelColor path="color" />
          <PanelColor path="holeColor" />
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
          ref={containerRef}
        />
        <RecursivePatternZoom pattern={{ kind: "carpet", config }} width={width} height={height} />
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default SierpinskiCarpetComponent;

export async function getStaticProps() {
  const description = await getDescription("sierpinski-carpet.md");
  return {
    props: {
      description,
    },
  };
}
