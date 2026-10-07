import { useEffect, useState } from "react";
import { Canvas } from "../../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber } from "../../components/ExplorerControls";
import { ExplorerPanel } from "../../components/ExplorerPanel";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { useWindowSize } from "../../utils/hooks/useWindowResize";
import { getDescription } from "../../utils/readFiles";
import {
  extendBounds,
  fitBounds,
  prepareCanvas,
  rewriteSentence,
  toCanvasPath,
  traceTurtle,
  type Vec2D,
} from "../../utils/turtleCurves";

type Props = {
  description: string;
};

type Config = {
  iterations: number;
  animateIterations: boolean;
  showTiling: boolean;
  background: string;
  firstDragon: string;
  secondDragon: string;
  lineWidth: number;
};

const MAX_ITERATIONS = 16;
const TURN_ANGLE = Math.PI / 2;
const PADDING = 0.08;
const TILING_PADDING = 0.25;
const TILING_ALPHA = 0.35;
const MAX_TILE_RANGE = 8;

// Two Heighway dragons back to back: the second one is the first one turned
// 180° around the midpoint of its chord, so it runs from the end back to the start.
function traceTwindragon(iterations: number) {
  const sentence = rewriteSentence("F", { F: "F+G", G: "F-G" }, iterations);
  // Each iteration turns the chord by 45°, so counter-rotate to keep it level.
  const { points, bounds } = traceTurtle(sentence, {
    turnAngle: TURN_ANGLE,
    startAngle: (-iterations * Math.PI) / 4,
    drawChars: "FG",
  });

  const [endX, endY] = points[points.length - 1];
  const mirrored = points.map(([x, y]): Vec2D => [endX - x, endY - y]);
  extendBounds(bounds, mirrored);

  return { first: points, second: mirrored, chord: [endX, endY] as Vec2D, bounds };
}

const Twindragon = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState<Config>({
    iterations: MAX_ITERATIONS,
    animateIterations: true,
    showTiling: false,
    background: "#252424",
    firstDragon: "#ffb86b",
    secondDragon: "#c792ea",
    lineWidth: 1.5,
  });

  useEffect(() => {
    if (!config.animateIterations) return;

    const delay = config.iterations === MAX_ITERATIONS ? 1800 : 900;

    const id = setTimeout(() => {
      setConfig((old) => ({
        ...old,
        iterations:
          old.iterations >= MAX_ITERATIONS ? 1 : Math.min(old.iterations + 1, MAX_ITERATIONS),
      }));
    }, delay);

    return () => clearTimeout(id);
  }, [config.animateIterations, config.iterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const { first, second, chord, bounds } = traceTwindragon(config.iterations);
    const padding = config.showTiling ? TILING_PADDING : PADDING;
    const transform = fitBounds(bounds, width, height, padding);
    const firstPath = toCanvasPath(first, transform);
    const secondPath = toCanvasPath(second, transform);

    prepareCanvas(ctx, width, height, config.background, config.lineWidth);

    const drawTile = (dx: number, dy: number) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.strokeStyle = config.firstDragon;
      ctx.stroke(firstPath);
      ctx.strokeStyle = config.secondDragon;
      ctx.stroke(secondPath);
      ctx.restore();
    };

    if (config.showTiling) {
      // Twindragons tile the plane by translation along the chord c and i·c.
      const { scale } = transform;
      const u: Vec2D = [chord[0] * scale, -chord[1] * scale];
      const v: Vec2D = [chord[1] * scale, chord[0] * scale];
      const tileLeft = transform.offsetX + bounds.minX * scale;
      const tileRight = transform.offsetX + bounds.maxX * scale;
      const tileTop = transform.offsetY - bounds.maxY * scale;
      const tileBottom = transform.offsetY - bounds.minY * scale;
      const latticeStep = Math.hypot(u[0], u[1]);
      const range = Math.min(Math.ceil(Math.max(width, height) / latticeStep) + 1, MAX_TILE_RANGE);

      ctx.globalAlpha = TILING_ALPHA;
      for (let a = -range; a <= range; a++) {
        for (let b = -range; b <= range; b++) {
          if (a === 0 && b === 0) continue;

          const dx = a * u[0] + b * v[0];
          const dy = a * u[1] + b * v[1];
          const visible =
            tileRight + dx > 0 &&
            tileLeft + dx < width &&
            tileBottom + dy > 0 &&
            tileTop + dy < height;
          if (visible) drawTile(dx, dy);
        }
      }
      ctx.globalAlpha = 1;
    }

    drawTile(0, 0);
  }, [config, ctx, width, height]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel data={config} mode="pattern" onUpdate={handleUpdate}>
          <PanelColor path="background" />
          <PanelColor path="firstDragon" />
          <PanelColor path="secondDragon" />
          <PanelNumber path="iterations" min={1} max={MAX_ITERATIONS} step={1} />
          <PanelNumber path="lineWidth" min={0.5} max={4} step={0.1} />
          <PanelBoolean path="showTiling" />
          <PanelBoolean path="animateIterations" />
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

export default Twindragon;

export async function getStaticProps() {
  const description = await getDescription("twindragon.md");
  return {
    props: {
      description,
    },
  };
}
