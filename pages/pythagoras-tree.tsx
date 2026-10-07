import { useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useGrowingFractal } from "../utils/hooks/useGrowingFractal";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";
import { PYTHAGORAS_MAX_ITERATIONS as MAX_ITERATIONS } from "../utils/render/drawings/pythagorasTree";

type Config = {
  iterations: number;
  animateIterations: boolean;
  angle: number;
  background: string;
  fillTriangles: boolean;
  fillSquares: boolean;
};

type Props = {
  description: string;
};

const PythagorasTreeComponent = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>({
    iterations: 0,
    animateIterations: true,
    angle: 45,
    background: "#252424",
    fillTriangles: true,
    fillSquares: true,
  });

  const { width, height } = useWindowSize();

  const { containerRef, animateLabel } = useGrowingFractal({
    kind: "pythagorasTree",
    storageKey: "pythagoras-tree",
    config,
    setConfig,
    params: config,
    width,
    height,
    max: MAX_ITERATIONS,
    stepDelay: 600,
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
          <PanelNumber path="angle" min={30} max={60} step={1} />
          <PanelNumber path="iterations" min={0} max={MAX_ITERATIONS} step={1} />
          <PanelBoolean path="animateIterations" label={animateLabel} />
          <PanelBoolean path="fillTriangles" />
          <PanelBoolean path="fillSquares" />
        </ExplorerPanel>

        <div className={styles.fullScreen} ref={containerRef} />

        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
  );
};

export default PythagorasTreeComponent;

export async function getStaticProps() {
  const description = await getDescription("pythagoras-tree.md");
  return {
    props: {
      description,
    },
  };
}
