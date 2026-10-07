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
  background: string;
  color: string;
  lineWidth: number;
};

const MAX_ITERATIONS = 16;

const DragonCurve = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [config, setConfig] = useState<Config>({
    iterations: 1,
    animateIterations: true,
    background: "#252424",
    color: "#9af4ff",
    lineWidth: 1.5,
  });

  const { containerRef, animateLabel } = useGrowingFractal({
    kind: "dragonCurve",
    storageKey: "dragon-curve",
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
          <PanelColor path="color" />
          <PanelNumber path="iterations" min={1} max={MAX_ITERATIONS} step={1} />
          <PanelNumber path="lineWidth" min={0.5} max={4} step={0.1} />
          <PanelBoolean path="animateIterations" label={animateLabel} />
        </ExplorerPanel>
        <div className={styles.fullScreen} ref={containerRef} />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default DragonCurve;

export async function getStaticProps() {
  const description = await getDescription("dragon-curve.md");
  return {
    props: {
      description,
    },
  };
}
