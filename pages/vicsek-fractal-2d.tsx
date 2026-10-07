import { useState } from "react";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useGrowingFractal } from "../utils/hooks/useGrowingFractal";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";
import { VICSEK_OFFSETS, type VicsekVariant } from "../utils/render/drawings/vicsekFractal2D";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  variant: VicsekVariant;
  background: string;
  color: string;
  fillSquares: boolean;
  strokeSquares: boolean;
  lineWidth: number;
};

const MAX_ITERATIONS = 6;

const variantOptions = Object.keys(VICSEK_OFFSETS) as VicsekVariant[];
const variantLabels: Record<VicsekVariant, string> = {
  saltire: "Diagonal cross",
  cross: "Greek cross",
};

const VicsekFractal2D = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [config, setConfig] = useState<Config>({
    iterations: 0,
    animateIterations: true,
    variant: "saltire",
    background: "#252424",
    color: "#f2efde",
    fillSquares: true,
    strokeSquares: false,
    lineWidth: 0.8,
  });

  const { containerRef, animateLabel } = useGrowingFractal({
    kind: "vicsekFractal2D",
    storageKey: `vicsek-fractal-2d:${config.variant}`,
    config,
    setConfig,
    params: config,
    width,
    height,
    max: MAX_ITERATIONS,
  });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="color" />
          <PanelSelect
            path="variant"
            label="Layout"
            optionLabels={variantOptions.map((option) => variantLabels[option])}
            options={variantOptions}
          />
          <PanelNumber path="iterations" min={0} max={MAX_ITERATIONS} step={1} />
          <PanelBoolean path="animateIterations" label={animateLabel} />
          <PanelNumber path="lineWidth" min={0.2} max={3} step={0.1} />
          <PanelBoolean path="fillSquares" />
          <PanelBoolean path="strokeSquares" />
        </ExplorerPanel>
        <div className={styles.fullScreen} ref={containerRef} />
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default VicsekFractal2D;

export async function getStaticProps() {
  const description = await getDescription("vicsek-fractal-2d.md");
  return {
    props: {
      description,
    },
  };
}
