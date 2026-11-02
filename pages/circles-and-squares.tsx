import { useEffect, useRef, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { PlacesMenu } from "../components/FractalPlaces";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { CIRCLES_PLACES, type CirclesPlace, paintCircles } from "../utils/circlesAndSquares";
import { isRecord } from "../utils/explorerShare";
import { useExplorerPart } from "../utils/hooks/useExplorerPart";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { registerPngExporter, renderCanvasPng } from "../utils/pngExport";
import { getDescription } from "../utils/readFiles";
import { createZoomWheelGuard, listenForZoomWheel, zoomWheelDelta } from "../utils/shouldZoomWheel";

type Props = {
  description: string;
};

type Config = {
  step: number;
  modulus: number;
  squarings: number;
  dotSize: number;
  bands: "two" | "gradient";
  background: string;
  color: string;
};

const MIN_STEP = 0.002;
const MAX_STEP = 4;

const CirclesAndSquares = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    step: CIRCLES_PLACES[0].step,
    modulus: CIRCLES_PLACES[0].modulus,
    squarings: 1,
    dotSize: 1,
    bands: "two",
    background: "#10151a",
    color: "#eee8ce",
  });
  // Where the middle dot sits, counted in dots, so changing the step keeps that dot still.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvas = ctx?.canvas ?? null;
  const latest = useRef({ config, pan });
  latest.current = { config, pan };

  useExplorerPart(
    "circlesPan",
    () => latest.current.pan,
    (saved) => {
      if (isRecord(saved) && typeof saved.x === "number" && typeof saved.y === "number")
        setPan({ x: saved.x, y: saved.y });
    },
    Boolean(canvas),
  );

  useEffect(() => {
    if (!canvas) return;
    const pointers = new Map<number, { x: number; y: number }>();
    const guard = createZoomWheelGuard(canvas);
    const wheel = (event: WheelEvent) => {
      // Past the opening spacing, a scroll down belongs to the page, as on every explorer.
      if (!guard.shouldZoom(event, latest.current.config.step >= CIRCLES_PLACES[0].step)) return;
      event.preventDefault();
      const factor = Math.exp(zoomWheelDelta(event, canvas) * 0.1);
      setConfig((old) => ({
        ...old,
        step: Math.max(MIN_STEP, Math.min(MAX_STEP, old.step * factor)),
      }));
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const move = (event: PointerEvent) => {
      const before = pointers.get(event.pointerId);
      if (!before) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const size = Math.max(1, latest.current.config.dotSize);
      setPan((old) => ({
        x: old.x - (event.clientX - before.x) / size,
        y: old.y - (event.clientY - before.y) / size,
      }));
    };
    const up = (event: PointerEvent) => pointers.delete(event.pointerId);
    const reset = () => setPan({ x: 0, y: 0 });
    const previousTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    const stopWheel = listenForZoomWheel(canvas, wheel);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("dblclick", reset);
    window.addEventListener("garden:reset-pose", reset);
    return () => {
      guard.dispose();
      stopWheel();
      canvas.style.touchAction = previousTouchAction;
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("dblclick", reset);
      window.removeEventListener("garden:reset-pose", reset);
    };
  }, [canvas]);

  useEffect(() => {
    if (!ctx || !canvas || !width || !height) return;
    const draw = () => {
      const ratio = canvas.width / width;
      const image = ctx.createImageData(canvas.width, canvas.height);
      paintCircles(
        new Uint32Array(image.data.buffer),
        canvas.width,
        canvas.height,
        config.dotSize * ratio,
        {
          step: config.step,
          modulus: config.modulus,
          squarings: config.squarings,
          centerX: Math.round(pan.x) * config.step,
          centerY: Math.round(pan.y) * config.step,
        },
        config,
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
  }, [ctx, canvas, width, height, config, pan]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };
  const matches = (place: CirclesPlace) =>
    Math.abs(place.step - config.step) < 1e-9 &&
    place.modulus === config.modulus &&
    place.squarings === config.squarings;

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          data={config}
          mode="pattern"
          lines={["Scroll or pinch to change the step. Drag to pan."]}
          onUpdate={handleUpdate}
          onRestore={setConfig}
          places={
            <PlacesMenu
              views={CIRCLES_PLACES}
              activePlace={CIRCLES_PLACES.find(matches)}
              onSelect={({ step, modulus, squarings }) => {
                setPan({ x: 0, y: 0 });
                setConfig((old) => ({ ...old, step, modulus, squarings }));
              }}
            />
          }
        >
          <PanelNumber
            path="step"
            label="Step between dots"
            min={MIN_STEP}
            max={MAX_STEP}
            step={0.001}
          />
          <PanelNumber path="modulus" label="Modulus m" min={0.5} max={16} step={0.5} />
          <PanelNumber path="squarings" label="Squarings" min={1} max={4} step={1} />
          <PanelNumber path="dotSize" label="Dot size" min={1} max={6} step={1} />
          <PanelSelect
            path="bands"
            label="Colors"
            options={["two", "gradient"]}
            optionLabels={["Two colors", "Gradient"]}
          />
          <PanelColor path="background" />
          <PanelColor path="color" />
        </ExplorerPanel>
        <div
          data-fractal-viewport
          className={styles.viewport}
          style={{ background: config.background }}
        >
          <Canvas setCtx={setCtx} width={width} height={height} />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default CirclesAndSquares;

export async function getStaticProps() {
  const description = await getDescription("circles-and-squares.md");
  return {
    props: {
      description,
    },
  };
}
