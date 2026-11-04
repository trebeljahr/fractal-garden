import { useCallback, useMemo, useState } from "react";
import { EndlessZoom } from "../../components/EndlessZoom";
import { PanelBoolean, PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { TWINDRAGON_TILING_CONSTRUCTION_MAX } from "../../utils/constructionLimits";
import { useFractalRenderer } from "../../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../../utils/hooks/useFractalViewportSize";
import { TWINDRAGON_LEAD } from "../../utils/lessons/twindragonDigits";
import { fittedFrame } from "../../utils/lsystem/pageZoom";
import {
  TILING_PADDING,
  TWIN_PADDING,
  twindragonLevel,
  twindragonSpec,
} from "../../utils/lsystem/twindragon";
import { getDescription } from "../../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  showTiling: boolean;
  background: string;
  firstDragon: string;
  secondDragon: string;
  lineWidth: number;
};

const MAX_ITERATIONS = 16;

const Twindragon = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>({
    iterations: 1,
    showTiling: false,
    background: "#252424",
    firstDragon: "#ffb86b",
    secondDragon: "#c792ea",
    lineWidth: 1.5,
  });

  // The zoom draws the tiling on top. Under it this canvas only sets the opening
  // level, which should not drop because of copies the zoom can skip cheaply.
  const params = useMemo(() => ({ ...config, showTiling: false }), [config]);

  const { containerRef, ready } = useFractalRenderer({
    kind: "twindragon",
    storageKey: "twindragon",
    config,
    setConfig,
    params,
    constructionMax: (settings) =>
      settings.showTiling ? TWINDRAGON_TILING_CONSTRUCTION_MAX : MAX_ITERATIONS,
    width,
    height,
    min: 1,
    max: MAX_ITERATIONS,
    stepDelay: 900,
    holdDelay: 1800,
    constructionLead: TWINDRAGON_LEAD,
  });

  const { firstDragon, secondDragon, background, lineWidth, showTiling } = config;
  const iterations = twindragonLevel(config);
  const spec = useMemo(() => twindragonSpec({ ...config, iterations }), [config, iterations]);
  // The tiling is fitted around its middle tile, so the frame comes from one tile.
  const frame = useCallback(
    (fitWidth: number, fitHeight: number) =>
      fittedFrame(
        twindragonSpec({
          iterations,
          firstDragon,
          secondDragon,
          background,
          lineWidth,
          showTiling: false,
        }),
        iterations,
        fitWidth,
        fitHeight,
        showTiling ? TILING_PADDING : TWIN_PADDING,
        1,
      ),
    [iterations, firstDragon, secondDragon, background, lineWidth, showTiling],
  );

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.lSystem}>
        <ExplorerPanel
          data={config}
          mode="pattern"
          onUpdate={handleUpdate}
          explorationControls={<PanelBoolean path="showTiling" />}
        >
          <PanelColor path="background" />
          <PanelColor path="firstDragon" />
          <PanelColor path="secondDragon" />
          <PanelNumber path="iterations" min={1} max={MAX_ITERATIONS} step={1} />
          <PanelNumber path="lineWidth" min={0.5} max={4} step={0.1} />
          <PanelBoolean path="showTiling" />
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
          ref={containerRef}
        />
        <EndlessZoom
          ready={ready}
          spec={spec}
          generation={iterations}
          frame={frame}
          width={width}
          height={height}
        />
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
