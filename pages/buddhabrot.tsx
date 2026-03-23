import Head from "next/head";
import { useEffect, useState } from "react";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
} from "react-dat-gui";
import { Canvas } from "../components/Canvas";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { getDescription } from "../utils/readFiles";
import { useWindowSize } from "../utils/hooks/useWindowResize";

type Props = {
  description: string;
};

type Config = {
  maxIterations: number;
  minOrbitLength: number;
  samplesPerFrame: number;
  exposure: number;
  background: string;
  color: string;
  animate: boolean;
};

const VIEWPORT = {
  minX: -2,
  maxX: 1,
  minY: -1.5,
  maxY: 1.5,
};

function getViewportForAspect(aspect: number) {
  const centerX = (VIEWPORT.minX + VIEWPORT.maxX) / 2;
  const centerY = (VIEWPORT.minY + VIEWPORT.maxY) / 2;
  const baseWidth = VIEWPORT.maxX - VIEWPORT.minX;
  const baseHeight = VIEWPORT.maxY - VIEWPORT.minY;

  let viewportWidth = baseWidth;
  let viewportHeight = baseHeight;

  if (aspect > baseWidth / baseHeight) {
    viewportWidth = viewportHeight * aspect;
  } else {
    viewportHeight = viewportWidth / aspect;
  }

  return {
    minX: centerX - viewportWidth / 2,
    maxX: centerX + viewportWidth / 2,
    minY: centerY - viewportHeight / 2,
    maxY: centerY + viewportHeight / 2,
  };
}

const INITIAL_CONFIG: Config = {
  maxIterations: 160,
  minOrbitLength: 25,
  samplesPerFrame: 450,
  exposure: 0.9,
  background: "#090b14",
  color: "#b8f4ff",
  animate: true,
};

function isInsideCardioidOrBulb(cx: number, cy: number) {
  const q = (cx - 0.25) * (cx - 0.25) + cy * cy;
  if (q * (q + (cx - 0.25)) <= 0.25 * cy * cy) return true;
  return (cx + 1) * (cx + 1) + cy * cy <= 0.0625;
}

function parseHexColor(hex: string) {
  const clean = hex.replace("#", "");

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

const Buddhabrot = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState(INITIAL_CONFIG);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    let frameId = 0;
    let frameCount = 0;
    let shouldStop = false;
    let renderedSamples = 0;
    let maxVisits = 1;
    const renderWidth = Math.max(1, ctx.canvas.width);
    const renderHeight = Math.max(1, ctx.canvas.height);
    const scaleX = renderWidth / width || 1;
    const scaleY = renderHeight / height || 1;
    const viewport = getViewportForAspect(renderWidth / renderHeight);

    const histogram = new Float32Array(renderWidth * renderHeight);
    const image = ctx.createImageData(renderWidth, renderHeight);
    const background = parseHexColor(config.background);
    const foreground = parseHexColor(config.color);

    const mapToPixel = (x: number, y: number) => {
      const px = Math.floor(
        ((x - viewport.minX) / (viewport.maxX - viewport.minX)) *
          (renderWidth - 1)
      );
      const py = Math.floor(
        ((viewport.maxY - y) / (viewport.maxY - viewport.minY)) *
          (renderHeight - 1)
      );

      return [px, py] as const;
    };

    const drawHistogram = () => {
      const { data } = image;
      const logMax = Math.log(1 + maxVisits * config.exposure);

      for (let i = 0; i < histogram.length; i++) {
        const count = histogram[i];
        const normalized =
          count === 0 || logMax === 0
            ? 0
            : Math.log(1 + count * config.exposure) / logMax;

        const idx = i * 4;
        data[idx] = Math.round(
          background.r + (foreground.r - background.r) * normalized
        );
        data[idx + 1] = Math.round(
          background.g + (foreground.g - background.g) * normalized
        );
        data[idx + 2] = Math.round(
          background.b + (foreground.b - background.b) * normalized
        );
        data[idx + 3] = 255;
      }

      ctx.resetTransform();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, renderWidth, renderHeight);
      ctx.putImageData(image, 0, 0);
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      ctx.font = "14px monospace";
      ctx.fillStyle = config.color;
      const label = `Samples: ${renderedSamples.toLocaleString()}`;
      const labelWidth = ctx.measureText(label).width;
      ctx.fillText(label, width - labelWidth - 18, 28);
    };

    const drawOrbit = (orbit: [number, number][]) => {
      for (let i = 0; i < orbit.length; i++) {
        const [x, y] = orbit[i];

        if (
          x < viewport.minX ||
          x > viewport.maxX ||
          y < viewport.minY ||
          y > viewport.maxY
        ) {
          continue;
        }

        const [px, py] = mapToPixel(x, y);
        const index = py * renderWidth + px;
        const next = histogram[index] + 1;
        histogram[index] = next;
        maxVisits = Math.max(maxVisits, next);

        const mirroredY = -y;
        if (mirroredY < viewport.minY || mirroredY > viewport.maxY) continue;

        const [mx, my] = mapToPixel(x, mirroredY);
        const mirroredIndex = my * renderWidth + mx;
        const mirroredNext = histogram[mirroredIndex] + 1;
        histogram[mirroredIndex] = mirroredNext;
        maxVisits = Math.max(maxVisits, mirroredNext);
      }
    };

    const sampleOrbit = () => {
      const cx = viewport.minX + Math.random() * (viewport.maxX - viewport.minX);
      const cy = Math.random() * viewport.maxY;

      if (isInsideCardioidOrBulb(cx, cy)) return;

      let zx = 0;
      let zy = 0;
      const orbit: [number, number][] = [];

      for (let i = 0; i < config.maxIterations; i++) {
        const nextX = zx * zx - zy * zy + cx;
        const nextY = 2 * zx * zy + cy;
        zx = nextX;
        zy = nextY;
        orbit.push([zx, zy]);

        if (zx * zx + zy * zy > 4) {
          if (orbit.length >= config.minOrbitLength) {
            drawOrbit(orbit);
          }
          return;
        }
      }
    };

    const tick = () => {
      if (shouldStop) return;

      if (config.animate) {
        for (let i = 0; i < config.samplesPerFrame; i++) {
          sampleOrbit();
        }

        renderedSamples += config.samplesPerFrame;
        frameCount++;
      }

      if (frameCount % 2 === 0 || !config.animate) {
        drawHistogram();
      }

      frameId = requestAnimationFrame(tick);
    };

    ctx.resetTransform();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, renderWidth, renderHeight);

    frameId = requestAnimationFrame(tick);

    return () => {
      shouldStop = true;
      cancelAnimationFrame(frameId);
    };
  }, [ctx, width, height, config]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <Head>
        <title>Buddhabrot Fractal</title>
        <meta
          name="description"
          content="A progressive Buddhabrot renderer that draws the escaping orbits of Mandelbrot points and accumulates them into a glowing density image."
        />
      </Head>
      <main className={styles.fullScreen}>
        <DatGui data={config} onUpdate={handleUpdate}>
          <DatFolder closed={true} title="Options">
            <DatColor path="background" label="background" />
            <DatColor path="color" label="color" />
            <DatNumber
              path="maxIterations"
              label="maxIterations"
              min={40}
              max={400}
              step={10}
            />
            <DatNumber
              path="minOrbitLength"
              label="minOrbitLength"
              min={0}
              max={100}
              step={5}
            />
            <DatNumber
              path="samplesPerFrame"
              label="samples/frame"
              min={50}
              max={2000}
              step={50}
            />
            <DatNumber
              path="exposure"
              label="exposure"
              min={0.1}
              max={3}
              step={0.1}
            />
            <DatBoolean path="animate" label="animate" />
          </DatFolder>
        </DatGui>
        <div className={styles.fullScreen}>
          <Canvas setCtx={setCtx} width={width} height={height} />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
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
