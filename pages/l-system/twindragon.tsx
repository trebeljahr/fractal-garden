import { useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { useGrowingFractal } from "../../utils/hooks/useGrowingFractal";
import { useWindowSize } from "../../utils/hooks/useWindowResize";
import { getDescription } from "../../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  showTiling: boolean;
  background: string;
  firstDragon: string;
  secondDragon: string;
  lineWidth: number;
};

const MAX_ITERATIONS = 16;

const Twindragon = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [config, setConfig] = useState<Config>({
    iterations: 1,
    animateIterations: true,
    showTiling: false,
    background: "#252424",
    firstDragon: "#ffb86b",
    secondDragon: "#c792ea",
    lineWidth: 1.5,
  });

  const { containerRef, animateLabel } = useGrowingFractal({
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

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="firstDragon" />
          <PanelColor path="secondDragon" />
          <PanelNumber path="iterations" min={1} max={MAX_ITERATIONS} step={1} />
          <PanelNumber path="lineWidth" min={0.5} max={4} step={0.1} />
          <PanelBoolean path="showTiling" />
          <PanelBoolean path="animateIterations" label={animateLabel} />
        </ExplorerPanel>
        <div className={styles.fullScreen} ref={containerRef} />
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
