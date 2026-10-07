import { useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useGrowingFractal } from "../utils/hooks/useGrowingFractal";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";

type Config = {
  iterations: number;
  animateIterations: boolean;
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
    animateIterations: true,
    color: "#ffe100",
    background: "#252424",
    holeColor: "#000000",
  });
  const { width, height } = useWindowSize();

  const { containerRef, animateLabel } = useGrowingFractal({
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
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelNumber
            path="iterations"
            label="Depth"
            min={MIN_ITERATIONS}
            max={MAX_ITERATIONS}
            step={1}
          />
          <PanelBoolean path="animateIterations" label={animateLabel} />
          <PanelColor path="color" />
          <PanelColor path="holeColor" />
        </ExplorerPanel>
        <div className={styles.fullScreen} ref={containerRef} />
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
