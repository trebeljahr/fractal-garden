import { useEffect, useMemo, useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useRenderSurface } from "../utils/hooks/useRenderSurface";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";
import type { FractalCanopyParams } from "../utils/render/drawings/fractalCanopy";

const defaultTree = {
  angle: 43,
  animateAngle: true,
  maxIterations: 7,
  branches: 3,
  background: "#252424",
  lengthFactor: 0.6,
  widthFactor: 0.8,
  rootWidth: 16,
};

const hTree = {
  angle: 180,
  animateAngle: false,
  maxIterations: 9,
  branches: 2,
  background: "#252424",
  lengthFactor: 0.7,
  widthFactor: 0.8,
  rootWidth: 20,
};

const sierpinski = {
  angle: 120,
  animateAngle: false,
  maxIterations: 8,
  branches: 3,
  background: "#252424",
  lengthFactor: 0.5,
  widthFactor: 0.8,
  rootWidth: 17,
};

const snowflake = {
  angle: 90,
  animateAngle: false,
  maxIterations: 5,
  branches: 5,
  background: "#252424",
  lengthFactor: 0.4,
  widthFactor: 0.8,
  rootWidth: 17,
};

const sixFold = {
  angle: 60,
  animateAngle: false,
  maxIterations: 5,
  branches: 6,
  background: "#252424",
  lengthFactor: 0.4,
  widthFactor: 0.7,
  rootWidth: 10.5,
};

const broccoli = {
  angle: 52,
  animateAngle: false,
  maxIterations: 6,
  branches: 4,
  background: "#252424",
  lengthFactor: 0.54,
  widthFactor: 0.9,
  rootWidth: 47.5,
};

const configs: Record<string, Config> = {
  defaultTree,
  broccoli,
  sierpinski,
  snowflake,
  sixFold,
  hTree,
};

const canopyOptions = Object.keys(configs) as Array<keyof typeof configs>;
const canopyLabels: Record<keyof typeof configs, string> = {
  defaultTree: "Classic canopy",
  broccoli: "Broccoli bloom",
  sierpinski: "Triangle tower",
  snowflake: "Snowflake burst",
  sixFold: "Sixfold lantern",
  hTree: "H-Tree",
};

type Config = {
  angle: number;
  animateAngle?: boolean;
  maxIterations: number;
  branches: number;
  background: string;
  lengthFactor: number;
  widthFactor: number;
  rootWidth: number;
  option?: string;
};

type Props = {
  description: string;
};

const FractalTree = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>(defaultTree);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (!config.animateAngle) return;
    const id = setInterval(() => {
      setConfig((old) => {
        return { ...old, angle: (old.angle + 1) % 360 };
      });
    }, 100);
    return () => clearInterval(id);
  }, [config.animateAngle]);

  const params = useMemo<FractalCanopyParams>(
    () => ({
      iterations: config.maxIterations,
      angle: config.angle,
      branches: config.branches,
      background: config.background,
      lengthFactor: config.lengthFactor,
      widthFactor: config.widthFactor,
      rootWidth: config.rootWidth,
    }),
    [config],
  );

  // Drawn on a worker: deep, many-branched trees take a while to stroke.
  const { containerRef } = useRenderSurface({ kind: "fractalCanopy", params, width, height });

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => {
      if (newData.option) {
        return configs[newData.option];
      }
      return { ...prevState, ...newData };
    });
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          controlsHint="Start with a canopy idea, then steer the branches into your own version."
          controlsTitle="Branch Studio"
          data={config}
          mode="pattern"
          onUpdate={handleUpdate}
        >
          <PanelColor path="background" />
          <PanelSelect
            path="option"
            label="Starting shape"
            optionLabels={canopyOptions.map((option) => canopyLabels[option])}
            options={canopyOptions}
          />
          <PanelNumber path="angle" min={0} max={360} step={1} />
          <PanelBoolean path="animateAngle" />
          <PanelNumber path="maxIterations" min={1} max={9} step={1} />
          <PanelNumber path="branches" min={2} max={6} step={1} />
          <PanelNumber path="lengthFactor" min={0} max={1} step={0.01} />
          <PanelNumber path="widthFactor" min={0} max={2} step={0.1} />
          <PanelNumber path="rootWidth" min={1} max={60} step={0.5} />
        </ExplorerPanel>
        <div className={styles.fullScreen} ref={containerRef} />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default FractalTree;

export async function getStaticProps() {
  const description = await getDescription("fractal-canopy.md");
  return {
    props: {
      description,
    },
  };
}
