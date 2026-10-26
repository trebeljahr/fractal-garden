import { useEffect, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useBuddhabrotSurface } from "../utils/hooks/useBuddhabrotSurface";
import { useCanvasViewport } from "../utils/hooks/useCanvasViewport";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { getDescription } from "../utils/readFiles";
import type { BuddhabrotParams } from "../utils/render/buddhabrot";
import { normalizeBuddhabrotParams } from "../utils/render/buddhabrotMath";

type Props = {
  description: string;
};

type Config = BuddhabrotParams;

const INITIAL_CONFIG: Config = {
  paused: false,
  maxIterations: 20,
  minOrbitLength: 0,
  samplesPerFrame: 65536,
  exposure: 0.9,
  background: "#000000",
  color: "#ffffff",
};

const Buddhabrot = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState(INITIAL_CONFIG);

  const { containerRef, canvas, setParams } = useBuddhabrotSurface(config, width, height);

  const viewport = useCanvasViewport(canvas);
  useEffect(() => {
    setParams({ ...config, viewport });
  }, [config, viewport, setParams]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => normalizeBuddhabrotParams({ ...old, ...newData }));
  };

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
        <PanelBoolean path="paused" />
        <PanelColor path="background" />
        <PanelColor path="color" />
        <PanelNumber
          path="maxIterations"
          label="Maximum iterations"
          min={1}
          max={20000}
          step={1}
          disableSlider
        />
        <PanelNumber
          path="minOrbitLength"
          label="Minimum orbit length"
          min={0}
          max={config.maxIterations}
          step={1}
        />
        <PanelNumber path="samplesPerFrame" min={256} max={65536} step={256} />
        <PanelNumber path="exposure" min={0.1} max={3} step={0.1} />
      </ExplorerPanel>
      <div
        data-fractal-viewport
        className={styles.viewport}
        style={{ background: config.background }}
        ref={containerRef}
      />
      <SideDrawer description={description} />
      <NavElement />
    </main>
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
