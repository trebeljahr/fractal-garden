import { useState } from "react";
import { PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";
import type { BuddhabrotParams } from "../utils/render/buddhabrot";

type Props = {
  description: string;
};

type Config = BuddhabrotParams;

const INITIAL_CONFIG: Config = {
  maxIterations: 160,
  minOrbitLength: 25,
  samplesPerFrame: 450,
  exposure: 0.9,
  background: "#252424",
  color: "#b8f4ff",
};

const Buddhabrot = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [config, setConfig] = useState(INITIAL_CONFIG);

  // Sampling runs on a worker, so high sample counts no longer stall the page.
  const { containerRef } = useRenderSurface({ kind: "buddhabrot", params: config, width, height });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          controlsHint="Sampling, exposure, and color for the glowing orbit trails."
          controlsTitle="Orbit Studio"
          data={config}
          mode="pattern"
          onUpdate={handleUpdate}
        >
          <PanelColor path="background" />
          <PanelColor path="color" />
          <PanelNumber path="maxIterations" min={40} max={400} step={10} />
          <PanelNumber path="minOrbitLength" min={0} max={100} step={5} />
          <PanelNumber path="samplesPerFrame" min={50} max={2000} step={50} />
          <PanelNumber path="exposure" min={0.1} max={3} step={0.1} />
        </ExplorerPanel>
        <div className={styles.fullScreen} ref={containerRef} />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default Buddhabrot;

export async function getStaticProps() {
  const description = await getDescription("buddhabrot.md");
  return {
    props: {
      description,
    },
  };
}
