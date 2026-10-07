import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { radians } from "../utils/ctxHelpers";
import { useShaderViewportControls } from "../utils/hooks/useShaderViewportControls";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import {
  type Bounds,
  getVisibleTriangles,
  MAX_ITERATIONS,
  type PenroseStart,
  type PenroseVariant,
  PHI,
  type RobinsonTriangle,
} from "../utils/penroseTiling";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = {
  variant: PenroseVariant;
  start: PenroseStart;
  iterations: number;
  animateIterations: boolean;
  rotation: number;
  background: string;
  kiteColor: string;
  dartColor: string;
  thinColor: string;
  thickColor: string;
  showOutline: boolean;
  outlineColor: string;
  lineWidth: number;
};

const PADDING = 0.06;
const INITIAL_ZOOM_SIZE = 1 / (1 - 2 * PADDING);
const MIN_ZOOM_SIZE = 0.005;
const MAX_ZOOM_SIZE = 5000;
// Zoomed far out, draw coarser supertiles to keep roughly this many half-tiles
// on screen. A half-tile with edge e covers about e² / 4.
const MAX_VISIBLE_TRIANGLES = 100000;

const variantOptions: PenroseVariant[] = ["p2", "p3"];
const variantLabels: Record<PenroseVariant, string> = {
  p2: "P2 kite and dart",
  p3: "P3 rhombus",
};

const startOptions: PenroseStart[] = ["sun", "star"];
const startLabels: Record<PenroseStart, string> = {
  sun: "Sun",
  star: "Star",
};

// No closePath: fill closes each subpath anyway, and Chrome slows down
// quadratically when closing tens of thousands of subpaths in one path.
function traceTriangle(ctx: CanvasRenderingContext2D, { a, b, c }: RobinsonTriangle) {
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
}

// Outline only the real tile edges, not the seam where two halves meet: the
// leg AB in P2, the base BC in P3.
function traceTileEdges(
  ctx: CanvasRenderingContext2D,
  { a, b, c }: RobinsonTriangle,
  variant: PenroseVariant,
) {
  const [first, middle, last] = variant === "p2" ? [a, c, b] : [b, a, c];
  ctx.moveTo(first[0], first[1]);
  ctx.lineTo(middle[0], middle[1]);
  ctx.lineTo(last[0], last[1]);
}

const PenroseTiling = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    variant: "p2",
    start: "sun",
    iterations: 5,
    animateIterations: true,
    rotation: 0,
    background: "#252424",
    kiteColor: "#f2b134",
    dartColor: "#3d7ea6",
    thinColor: "#e4572e",
    thickColor: "#76b041",
    showOutline: true,
    outlineColor: "#1b1a1a",
    lineWidth: 1,
  });
  const viewportRef = useRef({
    center: [0, 0] as [number, number],
    zoomSize: INITIAL_ZOOM_SIZE,
  });
  const renderRef = useRef<(() => void) | null>(null);
  const frameRef = useRef(0);

  const requestRender = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      renderRef.current?.();
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  useShaderViewportControls({
    canvas: ctx?.canvas ?? null,
    viewportRef,
    minZoomSize: MIN_ZOOM_SIZE,
    maxZoomSize: MAX_ZOOM_SIZE,
    onViewportChange: requestRender,
    flipY: true,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations >= MAX_ITERATIONS ? 1800 : 950;

    const id = setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations: old.iterations >= MAX_ITERATIONS ? 0 : old.iterations + 1,
      }));
    }, delay);

    return () => clearTimeout(id);
  }, [config.animateIterations, config.iterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const { center, zoomSize } = viewportRef.current;
      const pixelsPerUnit = Math.min(width, height) / (2 * zoomSize);
      // Tiles at level L have edges PHI^-L long.
      const minTilePx = Math.sqrt((4 * width * height) / MAX_VISIBLE_TRIANGLES);
      const level = Math.min(
        config.iterations,
        Math.floor(Math.log(pixelsPerUnit / minTilePx) / Math.log(PHI)),
      );

      // The view rectangle, rotated back into tiling coordinates.
      const angle = radians(config.rotation);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const halfWidth = (width / 2 + config.lineWidth) / pixelsPerUnit;
      const halfHeight = (height / 2 + config.lineWidth) / pixelsPerUnit;
      const extentX = Math.abs(cos) * halfWidth + Math.abs(sin) * halfHeight;
      const extentY = Math.abs(sin) * halfWidth + Math.abs(cos) * halfHeight;
      const centerX = cos * center[0] + sin * center[1];
      const centerY = -sin * center[0] + cos * center[1];
      const bounds: Bounds = {
        minX: centerX - extentX,
        maxX: centerX + extentX,
        minY: centerY - extentY,
        maxY: centerY + extentY,
      };
      const triangles = getVisibleTriangles(config.variant, config.start, level, bounds);
      const colors =
        config.variant === "p2"
          ? [config.kiteColor, config.dartColor]
          : [config.thinColor, config.thickColor];

      ctx.resetTransform();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, width, height);

      ctx.translate(width / 2, height / 2);
      ctx.scale(pixelsPerUnit, pixelsPerUnit);
      ctx.translate(-center[0], -center[1]);
      ctx.rotate(angle);

      for (const type of [0, 1] as const) {
        ctx.beginPath();
        for (const triangle of triangles) {
          if (triangle.type === type) traceTriangle(ctx, triangle);
        }
        ctx.fillStyle = colors[type];
        ctx.fill();
      }

      if (config.showOutline && config.lineWidth > 0) {
        ctx.beginPath();
        for (const triangle of triangles) {
          traceTileEdges(ctx, triangle, config.variant);
        }
        ctx.strokeStyle = config.outlineColor;
        ctx.lineWidth = config.lineWidth / pixelsPerUnit;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      }
    };

    renderRef.current = draw;
    draw();

    return () => {
      renderRef.current = null;
    };
  }, [config, ctx, height, width]);

  const resetView = useCallback(() => {
    viewportRef.current = {
      center: [0, 0],
      zoomSize: INITIAL_ZOOM_SIZE,
    };
    requestRender();
  }, [requestRender]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          actions={[{ label: "Reset view", onClick: resetView }]}
          data={config}
          lines={[
            "Drag to pan. Scroll or pinch to zoom. The tiling has no edge, so you can travel as far as you like.",
          ]}
          mode="pattern"
          onUpdate={handleUpdate}
        >
          <PanelSelect
            path="variant"
            optionLabels={variantOptions.map((option) => variantLabels[option])}
            options={variantOptions}
          />
          <PanelSelect
            path="start"
            label="Start"
            optionLabels={startOptions.map((option) => startLabels[option])}
            options={startOptions}
          />
          <PanelNumber path="iterations" min={0} max={MAX_ITERATIONS} step={1} />
          <PanelBoolean path="animateIterations" />
          <PanelNumber path="rotation" label="Rotation" min={-180} max={180} step={1} />
          <PanelColor path="background" />
          {config.variant === "p2" ? (
            <PanelColor key="kiteColor" path="kiteColor" label="Kite color" />
          ) : (
            <PanelColor key="thinColor" path="thinColor" label="Thin rhombus color" />
          )}
          {config.variant === "p2" ? (
            <PanelColor key="dartColor" path="dartColor" label="Dart color" />
          ) : (
            <PanelColor key="thickColor" path="thickColor" label="Thick rhombus color" />
          )}
          <PanelBoolean path="showOutline" label="Outline" />
          <PanelColor path="outlineColor" label="Outline color" />
          <PanelNumber path="lineWidth" min={0} max={4} step={0.1} />
        </ExplorerPanel>
        <div className={styles.fullScreen}>
          <Canvas setCtx={setCtx} width={width} height={height} />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default PenroseTiling;

export async function getStaticProps() {
  const description = await getDescription("penrose-tiling.md");
  return {
    props: {
      description,
    },
  };
}
