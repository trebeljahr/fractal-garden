import { useEffect, useRef, useState } from "react";
import { Canvas } from "../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Seed = "point" | "line";

type Config = {
  seed: Seed;
  stickiness: number;
  particleBudget: number;
  walkersPerFrame: number;
  firstColor: string;
  lastColor: string;
  background: string;
  paused: boolean;
};

const INITIAL_CONFIG: Config = {
  seed: "point",
  stickiness: 1,
  particleBudget: 30000,
  walkersPerFrame: 300,
  firstColor: "#ffd27a",
  lastColor: "#3fc9c1",
  background: "#252424",
  paused: false,
};

// Size of one lattice cell in CSS pixels.
const CELL_SIZE = 2;
// Upper bound on simulation time per animation frame, in milliseconds.
const FRAME_BUDGET_MS = 12;

const NEIGHBORS_X = [1, -1, 0, 0, 1, 1, -1, -1];
const NEIGHBORS_Y = [0, 0, 1, -1, 1, -1, 1, -1];

function parseHexColor(hex: string) {
  const clean = hex.replace("#", "");

  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

const DiffusionLimitedAggregation = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [restartCount, setRestartCount] = useState(0);
  const pausedRef = useRef(config.paused);
  pausedRef.current = config.paused;

  const { seed, stickiness, particleBudget, walkersPerFrame, firstColor, lastColor, background } =
    config;

  // biome-ignore lint/correctness/useExhaustiveDependencies: restartCount re-seeds the simulation
  useEffect(() => {
    if (!ctx || !width || !height) return;

    let frameId = 0;
    let shouldStop = false;
    const renderWidth = Math.max(1, ctx.canvas.width);
    const renderHeight = Math.max(1, ctx.canvas.height);
    const scaleX = renderWidth / width || 1;
    const scaleY = renderHeight / height || 1;

    const gridWidth = Math.max(16, Math.round(width / CELL_SIZE));
    const gridHeight = Math.max(16, Math.round(height / CELL_SIZE));
    const occupied = new Uint8Array(gridWidth * gridHeight);
    // Cell index of every stuck particle, in arrival order.
    const arrivals = new Int32Array(particleBudget);

    const offscreen = document.createElement("canvas");
    offscreen.width = gridWidth;
    offscreen.height = gridHeight;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
    const image = offCtx.createImageData(gridWidth, gridHeight);
    const pixels = image.data;

    const bg = parseHexColor(background);
    const first = parseHexColor(firstColor);
    const last = parseHexColor(lastColor);

    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = bg.r;
      pixels[i + 1] = bg.g;
      pixels[i + 2] = bg.b;
      pixels[i + 3] = 255;
    }

    // xorshift32 — much cheaper than Math.random in the hot loop.
    let rngState = (Math.random() * 0xffffffff) >>> 0 || 1;
    const random = () => {
      rngState ^= rngState << 13;
      rngState ^= rngState >>> 17;
      rngState ^= rngState << 5;
      return (rngState >>> 0) / 4294967296;
    };

    const centerX = Math.floor(gridWidth / 2);
    const centerY = Math.floor(gridHeight / 2);
    let particles = 0;
    let clusterRadius = 0;
    let clusterTop = gridHeight - 1;
    let done = false;

    const stick = (x: number, y: number) => {
      const index = y * gridWidth + x;
      occupied[index] = 1;
      arrivals[particles] = index;
      particles++;

      if (seed === "point") {
        const dx = x - centerX;
        const dy = y - centerY;
        clusterRadius = Math.max(clusterRadius, Math.sqrt(dx * dx + dy * dy));
        const maxRadius = Math.min(gridWidth, gridHeight) / 2 - 3;
        if (clusterRadius >= maxRadius) done = true;
      } else {
        clusterTop = Math.min(clusterTop, y);
        if (clusterTop <= 3) done = true;
      }

      if (particles >= particleBudget) done = true;
    };

    if (seed === "point") {
      stick(centerX, centerY);
    } else {
      for (let x = 0; x < gridWidth; x++) {
        const index = (gridHeight - 1) * gridWidth + x;
        occupied[index] = 1;
        const p = index * 4;
        pixels[p] = first.r;
        pixels[p + 1] = first.g;
        pixels[p + 2] = first.b;
      }
    }

    const touchesCluster = (x: number, y: number) => {
      for (let n = 0; n < 8; n++) {
        const nx = x + NEIGHBORS_X[n];
        const ny = y + NEIGHBORS_Y[n];
        if (nx < 0 || ny < 0 || nx >= gridWidth || ny >= gridHeight) continue;
        if (occupied[ny * gridWidth + nx]) return true;
      }
      return false;
    };

    // Current walker; persists across frames so long walks never block a frame.
    let walkerX = 0;
    let walkerY = 0;
    let hasWalker = false;

    const spawn = () => {
      if (seed === "point") {
        const angle = random() * Math.PI * 2;
        const r = clusterRadius + 4;
        walkerX = Math.round(centerX + Math.cos(angle) * r);
        walkerY = Math.round(centerY + Math.sin(angle) * r);
      } else {
        walkerX = Math.floor(random() * gridWidth);
        walkerY = Math.max(0, clusterTop - 4);
      }
      hasWalker = true;
    };

    // Runs the current walker until it sticks, dies, or the step allowance is used.
    // Returns the number of steps taken.
    const walk = (maxSteps: number) => {
      let steps = 0;

      while (steps < maxSteps) {
        if (seed === "point") {
          const dx = walkerX - centerX;
          const dy = walkerY - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const killRadius = clusterRadius * 1.5 + 30;

          if (
            distance > killRadius ||
            walkerX < 0 ||
            walkerY < 0 ||
            walkerX >= gridWidth ||
            walkerY >= gridHeight
          ) {
            hasWalker = false;
            return steps;
          }

          // Far from the cluster nothing can stick, so take one big random jump.
          const gap = distance - clusterRadius;
          if (gap > 8) {
            const angle = random() * Math.PI * 2;
            const jump = gap - 5;
            walkerX = Math.round(walkerX + Math.cos(angle) * jump);
            walkerY = Math.round(walkerY + Math.sin(angle) * jump);
            steps++;
            continue;
          }
        } else {
          if (walkerY < clusterTop - 30 || walkerY < 0 || walkerY >= gridHeight) {
            hasWalker = false;
            return steps;
          }

          const gap = clusterTop - walkerY;
          if (gap > 6) {
            const jump = gap - 3;
            walkerX += Math.round((random() * 2 - 1) * jump);
            walkerY += Math.round((random() * 2 - 1) * jump);
            walkerX = ((walkerX % gridWidth) + gridWidth) % gridWidth;
            steps++;
            continue;
          }
        }

        if (touchesCluster(walkerX, walkerY) && random() < stickiness) {
          stick(walkerX, walkerY);
          hasWalker = false;
          return steps;
        }

        const direction = (random() * 4) | 0;
        let nextX = walkerX + NEIGHBORS_X[direction];
        const nextY = walkerY + NEIGHBORS_Y[direction];
        if (seed === "line") nextX = (nextX + gridWidth) % gridWidth;

        const inside = nextX >= 0 && nextY >= 0 && nextX < gridWidth && nextY < gridHeight;
        if (!inside || !occupied[nextY * gridWidth + nextX]) {
          walkerX = nextX;
          walkerY = nextY;
        }
        steps++;
      }

      return steps;
    };

    // Spread the gradient over the particles stuck so far, so the full color
    // range is visible no matter how large the cluster has grown.
    const paintArrivals = () => {
      const span = Math.max(1, particles - 1);
      for (let i = 0; i < particles; i++) {
        const t = i / span;
        const p = arrivals[i] * 4;
        pixels[p] = first.r + (last.r - first.r) * t;
        pixels[p + 1] = first.g + (last.g - first.g) * t;
        pixels[p + 2] = first.b + (last.b - first.b) * t;
      }
    };

    const draw = () => {
      paintArrivals();
      offCtx.putImageData(image, 0, 0);
      ctx.resetTransform();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, 0, 0, renderWidth, renderHeight);
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      ctx.font = "14px monospace";
      ctx.fillStyle = lastColor;
      const label = `Particles: ${particles.toLocaleString()}${done ? " (done)" : ""}`;
      const labelWidth = ctx.measureText(label).width;
      ctx.fillText(label, width - labelWidth - 18, 28);
    };

    const tick = () => {
      if (shouldStop) return;

      if (!pausedRef.current && !done) {
        const start = performance.now();
        let walkers = 0;

        while (walkers < walkersPerFrame && !done) {
          if (!hasWalker) spawn();
          walk(4096);
          if (!hasWalker) walkers++;
          if (performance.now() - start > FRAME_BUDGET_MS) break;
        }

        draw();
      }

      frameId = requestAnimationFrame(tick);
    };

    draw();
    frameId = requestAnimationFrame(tick);

    return () => {
      shouldStop = true;
      cancelAnimationFrame(frameId);
    };
  }, [
    ctx,
    width,
    height,
    seed,
    stickiness,
    particleBudget,
    walkersPerFrame,
    firstColor,
    lastColor,
    background,
    restartCount,
  ]);

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({ ...old, ...newData }));
  };

  return (
    <>
      <main className={styles.fullScreen}>
        <ExplorerPanel
          actions={[{ label: "Restart growth", onClick: () => setRestartCount((n) => n + 1) }]}
          controlsHint="Seed shape, stickiness, and colors for the growing cluster."
          controlsTitle="Growth Studio"
          data={config}
          mode="pattern"
          onUpdate={handleUpdate}
        >
          <PanelSelect
            path="seed"
            label="Seed"
            options={["point", "line"]}
            optionLabels={["Point", "Line"]}
          />
          <PanelNumber path="stickiness" label="Sticking chance" min={0.05} max={1} step={0.05} />
          <PanelNumber
            path="particleBudget"
            label="Particle budget"
            min={1000}
            max={150000}
            step={1000}
          />
          <PanelNumber
            path="walkersPerFrame"
            label="Walkers per frame"
            min={10}
            max={3000}
            step={10}
          />
          <PanelColor path="firstColor" label="First arrivals" />
          <PanelColor path="lastColor" label="Last arrivals" />
          <PanelColor path="background" />
          <PanelBoolean path="paused" label="Pause" />
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

export default DiffusionLimitedAggregation;

export async function getStaticProps() {
  const description = await getDescription("diffusion-limited-aggregation.md");
  return {
    props: {
      description,
    },
  };
}
