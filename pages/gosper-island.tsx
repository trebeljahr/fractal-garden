import { useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { RecursivePatternZoom } from "../components/RecursivePatternZoom";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { gosperIslandConstructionMax } from "../utils/constructionLimits";
import { GOSPER_MAX_ROUND } from "../utils/gosperIsland";
import { useFractalRenderer } from "../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  view: "one" | "seven" | "plane";
  fillIslands: boolean;
  background: string;
  color: string;
  colorEnd: string;
  outline: string;
  lineWidth: number;
};

const GosperIsland = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>({
    iterations: 1,
    view: "seven",
    fillIslands: true,
    background: "#252424",
    color: "#2f6f73",
    colorEnd: "#b9e4c9",
    outline: "#10151a",
    lineWidth: 1,
  });

  const { containerRef, ready } = useFractalRenderer({
    kind: "gosperIsland",
    storageKey: `gosper-island:${config.view}`,
    config,
    setConfig,
    params: config,
    constructionMax: (settings) =>
      Math.min(GOSPER_MAX_ROUND, gosperIslandConstructionMax(settings.view)),
    width,
    height,
    min: 1,
    max: GOSPER_MAX_ROUND,
    stepDelay: 900,
    holdDelay: 1800,
  });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  const appearance = [
    <PanelSelect
      key="view"
      path="view"
      label="Show"
      options={["one", "seven", "plane"]}
      optionLabels={["One island", "Seven islands", "Whole plane"]}
    />,
    <PanelBoolean key="fillIslands" path="fillIslands" label="Fill islands" />,
    <PanelColor key="background" path="background" />,
    <PanelColor key="color" path="color" label="First tint" />,
    <PanelColor key="colorEnd" path="colorEnd" label="Last tint" />,
    <PanelColor key="outline" path="outline" label="Coastline" />,
    <PanelNumber key="lineWidth" path="lineWidth" min={0.2} max={4} step={0.1} />,
  ];

  return (
    <>
      <main className={styles.lSystem}>
        <ExplorerPanel
          data={config}
          mode="pattern"
          onUpdate={handleUpdate}
          explorationControls={appearance}
        >
          <PanelNumber path="iterations" min={1} max={GOSPER_MAX_ROUND} step={1} />
          {appearance}
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
          ref={containerRef}
        />
        <RecursivePatternZoom
          ready={ready}
          pattern={{ kind: "island", config }}
          width={width}
          height={height}
        />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default GosperIsland;

export async function getStaticProps() {
  const description = await getDescription("gosper-island.md");
  return {
    props: {
      description,
    },
  };
}
