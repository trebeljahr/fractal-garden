import { useEffect, useRef, useState } from "react";
import { WebGLCanvas } from "../components/Canvas";
import { PanelBoolean, PanelColor, PanelNumber, PanelSelect } from "../components/ExplorerControls";
import { ExplorerPanel } from "../components/ExplorerPanel";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { constrain, radians } from "../utils/ctxHelpers";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";
import { createShaderProgram } from "../utils/shaders/compileShader";
import vertexShader from "../utils/shaders/mandelbrot.vert";
import fragmentShader from "../utils/shaders/mandelbulb.frag";

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
const MAX_DISTANCE = 8;

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
};

type DragState = {
  clientX: number;
  clientY: number;
  rotationX: number;
  rotationY: number;
  offsetX: number;
  offsetY: number;
  mode: "orbit" | "pan";
};

const INITIAL_CONFIG: Config = {
  palette: "ember",
  shadows: true,
  power: 8,
  detail: 14,
  cameraDistance: 3,
  rotationX: 18,
  rotationY: 32,
  offsetX: 0,
  offsetY: 0,
  background: "#252424",
  color: "#f3b561",
  autoRotate: true,
};

const Mandelbulb = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG);
  const configRef = useRef(config);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
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

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const rotationLocation = gl.getUniformLocation(program, "u_rotation");
    const panLocation = gl.getUniformLocation(program, "u_pan");
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
      resolutionLocation === null ||
      rotationLocation === null ||
      panLocation === null ||
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

    const ratio = window.devicePixelRatio || 1;
    const startTime = performance.now();
    let animationId = 0;

    const render = () => {
      const currentConfig = configRef.current;
      const elapsed = (performance.now() - startTime) * 0.001;
      const [bgR, bgG, bgB] = parseHexColor(currentConfig.background);
      const [colorR, colorG, colorB] = parseHexColor(currentConfig.color);
      const animatedRotationY =
        currentConfig.rotationY + (currentConfig.autoRotate ? elapsed * 18 : 0);

      gl.uniform2f(resolutionLocation, width * ratio, height * ratio);
      gl.uniform2f(rotationLocation, radians(currentConfig.rotationX), radians(animatedRotationY));
      gl.uniform2f(panLocation, currentConfig.offsetX, currentConfig.offsetY);
      gl.uniform1f(cameraDistanceLocation, currentConfig.cameraDistance);
      gl.uniform1f(powerLocation, currentConfig.power);
      gl.uniform1f(detailLocation, currentConfig.detail);
      gl.uniform3f(backgroundLocation, bgR, bgG, bgB);
      gl.uniform3f(colorLocation, colorR, colorG, colorB);
      const palette = PALETTES[currentConfig.palette];
      [palette.a, palette.b, palette.c, palette.d].forEach((value, index) => {
        gl.uniform3fv(paletteLocations[index], value);
      });
      gl.uniform1f(solidLocation, currentConfig.palette === "solid" ? 1 : 0);
      gl.uniform1f(shadowsLocation, currentConfig.shadows ? 1 : 0);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      animationId = requestAnimationFrame(render);
    };

    const handleMouseDown = (event: MouseEvent) => {
      dragRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        rotationX: configRef.current.rotationX,
        rotationY: configRef.current.rotationY,
        offsetX: configRef.current.offsetX,
        offsetY: configRef.current.offsetY,
        mode: event.shiftKey ? "pan" : "orbit",
      };
      cnv.style.cursor = event.shiftKey ? "move" : "grabbing";
    };

    const handleMouseMove = (event: MouseEvent) => {
      const dragState = dragRef.current;
      if (!dragState) return;

      const rect = cnv.getBoundingClientRect();
      const deltaX = (event.clientX - dragState.clientX) / rect.width;
      const deltaY = (event.clientY - dragState.clientY) / rect.height;

      if (dragState.mode === "orbit") {
        setConfig((old) => ({
          ...old,
          autoRotate: false,
          rotationY: dragState.rotationY + deltaX * 180,
          rotationX: constrain(dragState.rotationX + deltaY * 120, -85, 85),
        }));
        return;
      }

      setConfig((old) => ({
        ...old,
        autoRotate: false,
        offsetX: dragState.offsetX - deltaX * old.cameraDistance * 1.8,
        offsetY: dragState.offsetY + deltaY * old.cameraDistance * 1.8,
      }));
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      cnv.style.cursor = "grab";
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setConfig((old) => ({
        ...old,
        autoRotate: false,
        cameraDistance: constrain(
          old.cameraDistance * (event.deltaY > 0 ? 1.08 : 0.92),
          MIN_DISTANCE,
          MAX_DISTANCE,
        ),
      }));
    };

    cnv.style.cursor = "grab";
    cnv.addEventListener("mousedown", handleMouseDown);
    cnv.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    cnv.addEventListener("mouseleave", handleMouseUp);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleMouseUp);

    render();

    return () => {
      cancelAnimationFrame(animationId);
      cnv.removeEventListener("mousedown", handleMouseDown);
      cnv.removeEventListener("mouseleave", handleMouseUp);
      cnv.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleMouseUp);
      gl.deleteBuffer(vertBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, [gl, width, height, cnv]);

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
          controlsHint="Power, detail, orbit, and framing for finding the best silhouettes."
          controlsTitle="Mandelbulb Studio"
          data={config}
          introTitle="Mandelbulb"
          lines={[
            "Drag to orbit, hold Shift while dragging to pan, and use the scroll wheel to zoom.",
            "Open the studio to change the shape and shading.",
          ]}
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
        <div className={styles.fullScreen}>
          <WebGLCanvas setGl={setGl} width={width} height={height} setCnv={setCnv} />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
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
