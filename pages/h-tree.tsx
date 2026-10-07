import { useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useGrowingFractal } from "../utils/hooks/useGrowingFractal";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";
import { H_TREE_MAX_ITERATIONS as MAX_ITERATIONS } from "../utils/render/drawings/hTree";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  ratio: number;
  rootWidth: number;
  widthFactor: number;
  background: string;
  rootColor: string;
  tipColor: string;
};

const HTree = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [config, setConfig] = useState<Config>({
    iterations: 0,
    animateIterations: true,
    ratio: Math.SQRT1_2,
    rootWidth: 10,
    widthFactor: 0.78,
    background: "#252424",
    rootColor: "#f5b971",
    tipColor: "#7fd8e8",
  });

  const { containerRef, animateLabel } = useGrowingFractal({
    kind: "hTree",
    storageKey: "h-tree",
    config,
    setConfig,
    params: config,
    width,
    height,
    max: MAX_ITERATIONS,
    stepDelay: 650,
  });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="rootColor" label="Root color" />
          <PanelColor path="tipColor" label="Tip color" />
          <PanelNumber path="iterations" min={0} max={MAX_ITERATIONS} step={1} />
          <PanelBoolean path="animateIterations" label={animateLabel} />
          <PanelNumber path="ratio" min={0.5} max={0.8} step={0.001} />
          <PanelNumber path="rootWidth" min={0.5} max={30} step={0.5} />
          <PanelNumber path="widthFactor" min={0.5} max={1} step={0.01} />
        </ExplorerPanel>
        <div className={styles.fullScreen} ref={containerRef} />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default HTree;

export async function getStaticProps() {
  const description = await getDescription("h-tree.md");
  return {
    props: {
      description,
    },
  };
}
