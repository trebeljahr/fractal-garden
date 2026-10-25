import { useEffect, useRef, useState } from "react";
import { WebGLCanvas } from "../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { finite } from "../utils/explorerShare";
import { useExplorerPart } from "../utils/hooks/useExplorerPart";
import { useFractalFrame } from "../utils/hooks/useFractalFrame";
import { useFractalViewportSize } from "../utils/hooks/useFractalViewportSize";
import { useSpatialControls } from "../utils/hooks/useSpatialControls";
import { getDescription } from "../utils/readFiles";
import { createShaderProgram } from "../utils/shaders/compileShader";
import vertexShader from "../utils/shaders/mandelbrot.vert";
import fragmentShader from "../utils/shaders/mandelbulb.frag";
import { INITIAL_SPATIAL_CAMERA, inverseRotate, rotationOf } from "../utils/spatial/camera";
import {
  bulbDistance,
  bulbTarget,
  MAX_BULB_ZOOM,
  pickBulbPoint,
} from "../utils/spatial/mandelbulb";
import { SPATIAL_PLACES } from "../utils/spatial/places";
import { spatialProjection } from "../utils/spatial/projection";

type Props = {
  description: string;
};

type Vec3 = [number, number, number];

// Cosine palettes, color(t) = a + b * cos(2pi * (c * t + d)), indexed by the
// orbit trap: how close each point's orbit came to the origin and the axes.
const PALETTES = {
  ember: {
    label: "Ember",
    a: [0.65, 0.42, 0.25],
    b: [0.35, 0.32, 0.25],
    c: [1, 1, 1],
    d: [0, 0.08, 0.18],
  },
  ocean: {
    label: "Ocean",
    a: [0.35, 0.55, 0.65],
    b: [0.3, 0.3, 0.3],
    c: [1, 1, 1],
    d: [0.55, 0.45, 0.35],
  },
  opal: {
    label: "Opal",
    a: [0.62, 0.6, 0.62],
    b: [0.3, 0.3, 0.3],
    c: [1, 1, 1],
    d: [0, 0.33, 0.67],
  },
  moss: {
    label: "Moss",
    a: [0.55, 0.66, 0.38],
    b: [0.3, 0.3, 0.2],
    c: [1, 1, 1],
    d: [0.05, 0.1, 0.25],
  },
  solid: { label: "Solid color", a: [0, 0, 0], b: [0, 0, 0], c: [0, 0, 0], d: [0, 0, 0] },
} satisfies Record<string, { label: string; a: Vec3; b: Vec3; c: Vec3; d: Vec3 }>;

type PaletteName = keyof typeof PALETTES;
const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];

// Close enough to the center to fly into the bulb's folds.
const MIN_DISTANCE = 1.05;
// Keep the enclosing sphere inside the opening fit rectangle.
const MAX_DISTANCE = 5.5;

type Config = {
  palette: PaletteName;
  shadows: boolean;
  power: number;
  detail: number;
  cameraDistance: number;
  rotationX: number;
  rotationY: number;
  offsetX: number;
  offsetY: number;
  background: string;
  color: string;
  autoRotate: boolean;
  grab?: number[];
};

const INITIAL_CONFIG: Config = {
  palette: "ember",
  shadows: true,
  power: 8,
  detail: 14,
  cameraDistance: MAX_DISTANCE,
  rotationX: 18,
  rotationY: 32,
  offsetX: 0,
  offsetY: 0,
  background: "#252424",
  color: "#f3b561",
  autoRotate: false,
};

const Mandelbulb = ({ description }: Props) => {
  const { width, height } = useFractalViewportSize();
  const frame = useFractalFrame(width, height);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG);
  const configRef = useRef(config);
  const [camera, setCamera] = useState(INITIAL_SPATIAL_CAMERA);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const redraw = useRef<(schedule?: boolean) => void>(() => {});
  const [contextVersion, setContextVersion] = useState(0);
  const { navigation } = useSpatialControls({
    places: SPATIAL_PLACES.mandelbulb,
    canvas: cnv,
    view: config,
    setView: setConfig,
    identity: "mandelbulb",
    maxZoom: MAX_BULB_ZOOM,
    eyeDistance: config.cameraDistance * 2,
    clearance: (camera, view) => {
      const scale = 0.5 * 2 ** -camera.zoom;
      const target = bulbTarget(camera, view);
      const offset = inverseRotate([0, 0, view.cameraDistance * 2 * scale], rotationOf(view));
      const eye = target.map((v, i) => v + offset[i]) as Vec3;
      return Math.max(
        0,
        bulbDistance(eye, view.power, Math.min(48, view.detail + Math.ceil(camera.zoom * 2))) /
          scale,
      );
    },
    controlled: { camera, setCamera },
    pick: (x, y) => pickBulbPoint(camera, config, x, y, width ?? 1, height ?? 1, frame),
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: projection changes invalidate the retained frame
  useEffect(() => {
    redraw.current();
  }, [frame]);
  const drawnRotation = useRef(INITIAL_CONFIG.rotationY);

  useExplorerPart(
    "bulbRotation",
    () => drawnRotation.current,
    (saved) => {
      if (!finite(saved, -1e12, 1e12)) throw new Error("Invalid rotation");
      setConfig((old) => ({ ...old, rotationY: saved, autoRotate: false }));
    },
  );

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    void contextVersion;
    if (!gl || !width || !height || !cnv) return;

    const output = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!output) return;

    const { program, vert, frag } = output;
    const vertBuf = gl.createBuffer();
    if (!vertBuf) return;

    // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const aPositionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

    const basisLocation = gl.getUniformLocation(program, "u_basis");
    const targetLocation = gl.getUniformLocation(program, "u_target");
    const projectionLocation = gl.getUniformLocation(program, "u_projection");
    const scaleLocation = gl.getUniformLocation(program, "u_scale");
    const fogLocation = gl.getUniformLocation(program, "u_fogDistanceScale");
    const cameraDistanceLocation = gl.getUniformLocation(program, "u_cameraDistance");
    const powerLocation = gl.getUniformLocation(program, "u_power");
    const detailLocation = gl.getUniformLocation(program, "u_detail");
    const backgroundLocation = gl.getUniformLocation(program, "u_background");
    const colorLocation = gl.getUniformLocation(program, "u_color");
    const paletteLocations = (["A", "B", "C", "D"] as const).map((name) =>
      gl.getUniformLocation(program, `u_palette${name}`),
    );
    const solidLocation = gl.getUniformLocation(program, "u_solid");
    const shadowsLocation = gl.getUniformLocation(program, "u_shadows");

    if (
      projectionLocation === null ||
      basisLocation === null ||
      targetLocation === null ||
      scaleLocation === null ||
      cameraDistanceLocation === null ||
      powerLocation === null ||
      detailLocation === null ||
      backgroundLocation === null ||
      colorLocation === null ||
      solidLocation === null ||
      shadowsLocation === null ||
      paletteLocations.some((location) => location === null)
    ) {
      return;
    }

    const parseHexColor = (hex: string) => {
      const clean = hex.replace("#", "");
      return [
        Number.parseInt(clean.slice(0, 2), 16) / 255,
        Number.parseInt(clean.slice(2, 4), 16) / 255,
        Number.parseInt(clean.slice(4, 6), 16) / 255,
      ] as const;
    };

    const startTime = performance.now();
    let animationId = 0;
    let contextWasLost = false;

    const render = (schedule = true) => {
      if (schedule) cancelAnimationFrame(animationId);
      const currentConfig = configRef.current;
      const elapsed = (performance.now() - startTime) * 0.001;
      const [bgR, bgG, bgB] = parseHexColor(currentConfig.background);
      const [colorR, colorG, colorB] = parseHexColor(currentConfig.color);
      const animatedRotationY =
        currentConfig.rotationY + (currentConfig.autoRotate ? elapsed * 18 : 0);
      drawnRotation.current = ((((animatedRotationY + 180) % 360) + 360) % 360) - 180;

      const ratio = gl.drawingBufferWidth / width;
      const projection = spatialProjection(width, height, frameRef.current);
      gl.uniform3f(
        projectionLocation,
        projection.centerX * ratio,
        (height - projection.centerY) * ratio,
        (projection.focal / 1.8) * ratio,
      );
      const spatial = cameraRef.current;
      gl.uniformMatrix3fv(
        basisLocation,
        false,
        rotationOf({ ...currentConfig, rotationY: animatedRotationY }),
      );
      gl.uniform3fv(targetLocation, bulbTarget(spatial, currentConfig));
      gl.uniform1f(scaleLocation, 0.5 * 2 ** -spatial.zoom);
      gl.uniform1f(fogLocation, 2 ** ((spatial.atmosphereZoom ?? spatial.zoom) + 1) / 96);
      cnv.dataset.zoom = String(spatial.zoom);
      gl.uniform1f(cameraDistanceLocation, currentConfig.cameraDistance);
      gl.uniform1f(powerLocation, currentConfig.power);
      gl.uniform1f(
        detailLocation,
        Math.min(48, currentConfig.detail + Math.ceil(cameraRef.current.zoom * 2)),
      );
      gl.uniform3f(backgroundLocation, bgR, bgG, bgB);
      gl.uniform3f(colorLocation, colorR, colorG, colorB);
      // State kept by Fast Refresh, or an older shared config, may lack a palette.
      const palette = PALETTES[currentConfig.palette] ?? PALETTES[INITIAL_CONFIG.palette];
      [palette.a, palette.b, palette.c, palette.d].forEach((value, index) => {
        gl.uniform3fv(paletteLocations[index], value);
      });
      gl.uniform1f(solidLocation, currentConfig.palette === "solid" ? 1 : 0);
      gl.uniform1f(shadowsLocation, currentConfig.shadows ? 1 : 0);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (schedule && currentConfig.autoRotate) animationId = requestAnimationFrame(() => render());
    };
    const exportFrame = (event: Event) => {
      render(false);
      event.preventDefault();
    };
    cnv.addEventListener("garden:redraw", exportFrame);

    redraw.current = render;
    const lost = (event: Event) => {
      contextWasLost = true;
      event.preventDefault();
      cancelAnimationFrame(animationId);
    };
    const restored = () => setContextVersion((v) => v + 1);
    cnv.addEventListener("webglcontextlost", lost);
    cnv.addEventListener("webglcontextrestored", restored);
    render();

    return () => {
      cancelAnimationFrame(animationId);
      cnv.removeEventListener("garden:redraw", exportFrame);
      redraw.current = () => {};
      cnv.removeEventListener("webglcontextlost", lost);
      cnv.removeEventListener("webglcontextrestored", restored);
      if (!contextWasLost) {
        gl.deleteBuffer(vertBuf);
        gl.deleteProgram(program);
        gl.deleteShader(vert);
        gl.deleteShader(frag);
      }
    };
  }, [gl, width, height, cnv, contextVersion]);
  useEffect(() => {
    redraw.current(true);
  });

  const handleUpdate = (newData: Config) => {
    setConfig((old) => ({
      ...old,
      ...newData,
    }));
  };

  return (
    <main className={styles.fullScreen}>
      {navigation}
      <ExplorerPanel
        data={config}
        introTitle="Mandelbulb"
        lines={["Drag to rotate. Shift-drag to pan. Scroll to zoom."]}
        mode="scene"
        onUpdate={handleUpdate}
      >
        <PanelSelect
          path="palette"
          label="Coloring"
          options={PALETTE_NAMES}
          optionLabels={PALETTE_NAMES.map((name) => PALETTES[name].label)}
        />
        {config.palette === "solid" && <PanelColor path="color" />}
        <PanelBoolean path="shadows" label="Soft shadows" />
        <PanelColor path="background" />
        <PanelNumber path="power" min={2} max={12} step={0.1} />
        <PanelNumber path="detail" min={6} max={20} step={1} />
        <PanelNumber path="cameraDistance" min={MIN_DISTANCE} max={MAX_DISTANCE} step={0.01} />
        <PanelNumber path="rotationX" min={-85} max={85} step={1} />
        <PanelNumber path="rotationY" min={-180} max={180} step={1} />
        <PanelNumber path="offsetX" min={-2} max={2} step={0.01} />
        <PanelNumber path="offsetY" min={-2} max={2} step={0.01} />
        <PanelBoolean path="autoRotate" />
      </ExplorerPanel>
      <div data-fractal-viewport className={styles.viewport}>
        <WebGLCanvas setGl={setGl} width={width} height={height} setCnv={setCnv} />
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default Mandelbulb;

export async function getStaticProps() {
  const description = await getDescription("mandelbulb.md");
  return {
    props: {
      description,
    },
  };
}
