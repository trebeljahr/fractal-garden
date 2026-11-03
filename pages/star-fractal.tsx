import { useEffect, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { RecursivePatternZoom } from "../components/RecursivePatternZoom";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { starConstructionMax } from "../utils/constructionLimits";
import { useFractalRenderer } from "../utils/hooks/useFractalRenderer";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { getDescription } from "../utils/readFiles";
import { largestStarDepth, touchingRatio } from "../utils/starFractal";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  points: number;
  skip: number;
  ratio: number;
  offset: number;
  rotation: number;
  smallestOnly: boolean;
  fillStars: boolean;
  background: string;
  color: string;
  colorEnd: string;
  lineWidth: number;
};

const StarFractal = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [config, setConfig] = useState<Config>({
    iterations: 1,
    points: 5,
    skip: 2,
    ratio: touchingRatio(5),
    offset: 1,
    rotation: 0,
    smallestOnly: false,
    fillStars: false,
    background: "#252424",
    color: "#ffd166",
    colorEnd: "#ef476f",
    lineWidth: 1,
  });
  const maxIterations = largestStarDepth(config.points);

  useEffect(() => {
    if (config.iterations > maxIterations)
      setConfig((old) => ({ ...old, iterations: maxIterations }));
  }, [config.iterations, maxIterations]);

  const { containerRef, ready } = useFractalRenderer({
    kind: "starFractal",
    storageKey: `star-fractal:${config.points}`,
    config,
    setConfig,
    params: config,
    constructionMax: (settings) => starConstructionMax(settings.points),
    width,
    height,
    min: 0,
    max: maxIterations,
    stepDelay: 900,
    holdDelay: 1800,
  });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
      // A new star count starts where its neighboring copies touch.
      ratio: newData.points !== old.points ? touchingRatio(newData.points) : newData.ratio,
      skip: Math.min(newData.skip, newData.points - 1),
    }));
  };

  const shape = [
    <PanelNumber key="points" path="points" label="Tips" min={3} max={12} step={1} />,
    <PanelNumber key="skip" path="skip" label="Tips skipped per line" min={1} max={5} step={1} />,
    <PanelNumber key="ratio" path="ratio" label="Copy size" min={0.1} max={0.7} step={0.001} />,
    <PanelNumber
      key="offset"
      path="offset"
      label="Distance from center"
      min={0.2}
      max={1.4}
      step={0.01}
    />,
    <PanelNumber key="rotation" path="rotation" min={-180} max={180} step={1} />,
    <PanelBoolean key="smallestOnly" path="smallestOnly" label="Only the smallest stars" />,
    <PanelBoolean key="fillStars" path="fillStars" label="Fill stars" />,
    <PanelColor key="background" path="background" />,
    <PanelColor key="color" path="color" label="Largest star" />,
    <PanelColor key="colorEnd" path="colorEnd" label="Smallest star" />,
    <PanelNumber key="lineWidth" path="lineWidth" min={0.2} max={4} step={0.1} />,
  ];

  return (
    <>
      <main className={styles.lSystem}>
        <ExplorerPanel
          data={config}
          mode="pattern"
          onUpdate={handleUpdate}
          explorationControls={shape}
        >
          <PanelNumber path="iterations" min={0} max={maxIterations} step={1} />
          {shape}
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
          ref={containerRef}
        />
        <RecursivePatternZoom
          ready={ready}
          pattern={{ kind: "star", config }}
          width={width}
          height={height}
        />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default StarFractal;

export async function getStaticProps() {
  const description = await getDescription("star-fractal.md");
  return {
    props: {
      description,
    },
  };
}
