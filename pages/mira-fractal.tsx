import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { PlacesMenu } from "../components/FractalPlaces";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useCanvasViewport } from "../utils/hooks/useCanvasViewport";
import { useFractalFrame } from "../utils/hooks/useFractalFrame";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import {
  extendMiraOrbit,
  MIRA_PLACES,
  type MiraPlace,
  orbitBounds,
  paintOrbit,
} from "../utils/miraMap";
import { registerPngExporter, renderCanvasPng } from "../utils/pngExport";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  a: number;
  b: number;
  x0: number;
  y0: number;
  steps: number;
  coloring: "density" | "age";
  pointSize: number;
  background: string;
  color: string;
  colorEnd: string;
};

const MAX_STEPS = 3000000;
const STEPS_PER_FRAME = 120000;
const PADDING = 0.08;
// The first points set the framing. Later points fall inside it or wander off it for good.
const FRAMING_POINTS = 50000;

const MiraFractal = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const framing = useFractalFrame(width, height);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const viewport = useCanvasViewport(ctx?.canvas ?? null);
  const [config, setConfig] = useState<Config>({
    ...MIRA_PLACES[1].settings,
    steps: 300000,
    coloring: "density",
    pointSize: 1,
    background: "#1d1c22",
    color: "#7a3fb0",
    colorEnd: "#ffe9c2",
  });
  const [count, setCount] = useState(0);
  const points = useRef(new Float32Array(MAX_STEPS * 2));
  const resume = useRef<[number, number]>([config.x0, config.y0]);
  const { a, b, x0, y0, steps } = config;

  // biome-ignore lint/correctness/useExhaustiveDependencies: any new map or start restarts the orbit
  useEffect(() => {
    resume.current = [x0, y0];
    setCount(0);
  }, [a, b, x0, y0]);

  useEffect(() => {
    if (count >= steps) return;
    const frame = requestAnimationFrame(() => {
      const target = Math.min(steps, count + STEPS_PER_FRAME);
      const reached = extendMiraOrbit(
        { a, b, x0, y0 },
        points.current,
        count,
        target,
        resume.current,
      );
      // An orbit that leaves for good ends where it is; do not retry it each frame.
      setCount(reached < target ? steps : reached);
    });
    return () => cancelAnimationFrame(frame);
  }, [a, b, x0, y0, steps, count]);

  const framed = Math.min(count, FRAMING_POINTS);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the array fills in place as count grows
  const bounds = useMemo(() => orbitBounds(points.current, framed), [framed, a, b, x0, y0]);

  useEffect(() => {
    if (!ctx || !width || !height) return;
    const canvas = ctx.canvas;
    const draw = () => {
      const ratio = canvas.width / width;
      const zoom = viewport.zoom;
      const side = Math.min(width, height);
      const top = framing?.top ?? 0;
      const fitHeight = height - top - (framing?.bottom ?? 0);
      const scale =
        Math.min(
          (width * (1 - 2 * PADDING)) / Math.max(bounds.maxX - bounds.minX, 1e-6),
          (fitHeight * (1 - 2 * PADDING)) / Math.max(bounds.maxY - bounds.minY, 1e-6),
        ) *
        zoom *
        ratio;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const image = ctx.createImageData(canvas.width, canvas.height);
      const panX = -viewport.x * side * zoom * ratio;
      const panY = -viewport.y * side * zoom * ratio;
      const frameTop = top + fitHeight / 2 - height / 2;
      paintOrbit(
        image.data,
        canvas.width,
        canvas.height,
        points.current,
        count,
        {
          scale,
          originX: canvas.width / 2 + panX - centerX * scale,
          originY: canvas.height / 2 + panY + frameTop * zoom * ratio + centerY * scale,
        },
        { ...config, pointSize: config.pointSize * ratio },
      );
      ctx.putImageData(image, 0, 0);
    };
    draw();
    canvas.addEventListener("garden:redraw", draw);
    const unregister = registerPngExporter(canvas, (size) => renderCanvasPng(canvas, size, draw));
    return () => {
      unregister();
      canvas.removeEventListener("garden:redraw", draw);
    };
  }, [ctx, width, height, viewport, framing, config, count, bounds]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };
  const matches = (place: MiraPlace) =>
    place.settings.a === a &&
    place.settings.b === b &&
    place.settings.x0 === x0 &&
    place.settings.y0 === y0;

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          data={config}
          mode="pattern"
          onUpdate={handleUpdate}
          onRestore={setConfig}
          places={
            <PlacesMenu
              views={MIRA_PLACES}
              activePlace={MIRA_PLACES.find(matches)}
              onSelect={(place) => setConfig((old) => ({ ...old, ...place.settings }))}
            />
          }
        >
          <PanelNumber path="a" min={-1} max={1} step={0.001} />
          <PanelNumber path="b" min={0.9} max={1} step={0.0001} />
          <PanelNumber path="x0" label="Start x" min={-30} max={30} step={0.1} />
          <PanelNumber path="y0" label="Start y" min={-30} max={30} step={0.1} />
          <PanelNumber path="steps" label="Steps" min={1000} max={MAX_STEPS} step={1000} />
          <PanelSelect
            path="coloring"
            label="Coloring"
            options={["density", "age"]}
            optionLabels={["How often visited", "When visited"]}
          />
          <PanelNumber path="pointSize" min={1} max={4} step={1} />
          <PanelColor path="background" />
          <PanelColor path="color" label="First color" />
          <PanelColor path="colorEnd" label="Last color" />
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
        >
          {framing && <Canvas setCtx={setCtx} width={width} height={height} />}
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default MiraFractal;

export async function getStaticProps() {
  const description = await getDescription("mira-fractal.md");
  return {
    props: {
      description,
    },
  };
}
