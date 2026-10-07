import { Children, type ReactNode, useEffect, useRef, useState } from "react";
import styles from "../styles/Fullscreen.module.css";
import {
  COLOR_MODE_LABELS,
  COLOR_MODES,
  type EscapeTimeColoring,
  getColoringLocations,
  LOOK_LABELS,
  LOOK_OPTIONS,
  PALETTE_LABELS,
  PALETTES,
  setColoringUniforms,
} from "../utils/escapeTimeColoring";
import { useShaderViewportControls } from "../utils/hooks/useShaderViewportControls";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { createShaderProgram } from "../utils/shaders/compileShader";
import escapeTimeShader from "../utils/shaders/escape-time.frag";
import vertexShader from "../utils/shaders/mandelbrot.vert";
import { WebGLCanvas } from "./Canvas";
import { PanelColor, PanelNumber, PanelSelect } from "./ExplorerControls";
import { ExplorerPanel } from "./ExplorerPanel";
import { NavElement } from "./Navbar";
import { SideDrawer } from "./SideDrawer";

type Formula = "mandelbrot" | "julia" | "burning-ship";

const FORMULA_DEFINES: Record<Formula, string> = {
  mandelbrot: "#define FORMULA_MANDELBROT\n",
  julia: "#define FORMULA_JULIA\n",
  "burning-ship": "#define FORMULA_BURNING_SHIP\n",
};

type View = {
  label: string;
  center: [number, number];
  zoomSize: number;
};

type Props<T extends EscapeTimeColoring> = {
  formula: Formula;
  title: string;
  description: string;
  config: T;
  onUpdate: (newData: T) => void;
  initialCenter: [number, number];
  initialZoomSize: number;
  minZoomSize?: number;
  maxZoomSize?: number;
  flipY?: boolean;
  c?: [number, number];
  views?: View[];
  lines: string[];
  controlsHint?: string;
  controlsTitle?: string;
  children?: ReactNode;
};

/**
 * Fullscreen WebGL explorer shared by the Mandelbrot set, Julia sets and the
 * Burning Ship. All three share one shader and the same coloring controls.
 */
export function EscapeTimeFractal<T extends EscapeTimeColoring>({
  formula,
  title,
  description,
  config,
  onUpdate,
  initialCenter,
  initialZoomSize,
  minZoomSize = 0.00005,
  maxZoomSize = 4,
  flipY = false,
  c = [0, 0],
  views = [],
  lines,
  controlsHint = "Pick a look, then tune the coloring algorithm, palette and iteration depth.",
  controlsTitle = "Coloring Studio",
  children,
}: Props<T>) {
  const { width, height } = useWindowSize();
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const viewportRef = useRef({
    center: [...initialCenter] as [number, number],
    zoomSize: initialZoomSize,
  });
  const renderRef = useRef<(() => void) | null>(null);
  // The draw call reads the latest values from refs so control tweaks only redraw.
  const stateRef = useRef({ config, c, width, height });
  stateRef.current = { config, c, width, height };
  const [cReal, cImag] = c;

  useShaderViewportControls({
    canvas: cnv,
    viewportRef,
    minZoomSize,
    maxZoomSize,
    onViewportChange: () => renderRef.current?.(),
    flipY,
  });

  useEffect(() => {
    if (!gl || !cnv) return;

    const output = createShaderProgram(
      gl,
      vertexShader,
      FORMULA_DEFINES[formula] + escapeTimeShader,
    );
    if (!output) return;

    const { program, vert, frag } = output;

    // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design
    gl.useProgram(program);

    const vertBuf = gl.createBuffer();
    if (!vertBuf) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const aPositionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

    const centerLocation = gl.getUniformLocation(program, "u_center");
    const zoomSizeLocation = gl.getUniformLocation(program, "u_zoomSize");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const cLocation = gl.getUniformLocation(program, "u_c");
    const coloringLocations = getColoringLocations(gl, program);

    if (centerLocation === null || zoomSizeLocation === null || resolutionLocation === null) {
      return;
    }

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const { center, zoomSize } = viewportRef.current;
      const { config, c, width, height } = stateRef.current;
      if (!width || !height) return;

      gl.uniform2f(centerLocation, center[0], center[1]);
      gl.uniform1f(zoomSizeLocation, zoomSize);
      gl.uniform2f(resolutionLocation, width * ratio, height * ratio);
      gl.uniform2f(cLocation, c[0], c[1]);
      setColoringUniforms(gl, coloringLocations, config);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    renderRef.current = draw;

    return () => {
      renderRef.current = null;
      gl.deleteBuffer(vertBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, [gl, cnv, formula]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: redraw whenever an input changes
  useEffect(() => {
    renderRef.current?.();
  }, [gl, cnv, formula, config, cReal, cImag, width, height]);

  return (
    <main className={styles.fullScreen}>
      <ExplorerPanel
        actions={views.map((view) => ({
          label: view.label,
          onClick: () => {
            viewportRef.current = { center: [...view.center], zoomSize: view.zoomSize };
            renderRef.current?.();
          },
        }))}
        controlsHint={controlsHint}
        controlsTitle={controlsTitle}
        data={config}
        introTitle={title}
        lines={lines}
        mode="formula"
        onUpdate={onUpdate}
      >
        {/* DatFolder clones every child, so drop empty slots first. */}
        {Children.toArray(children)}
        <PanelSelect path="look" label="Look" optionLabels={LOOK_LABELS} options={LOOK_OPTIONS} />
        <PanelSelect
          path="colorMode"
          label="Coloring"
          optionLabels={COLOR_MODES.map((mode) => COLOR_MODE_LABELS[mode])}
          options={[...COLOR_MODES]}
        />
        <PanelSelect
          path="palette"
          label="Palette"
          optionLabels={PALETTES.map((palette) => PALETTE_LABELS[palette])}
          options={[...PALETTES]}
        />
        <PanelNumber path="iterations" label="Iterations" min={10} max={2000} step={10} />
        <PanelNumber path="colorDensity" label="Color density" min={0.1} max={10} step={0.1} />
        <PanelNumber path="colorOffset" label="Color offset" min={0} max={1} step={0.01} />
        <PanelColor path="interior" label="Interior" />
      </ExplorerPanel>
      <div className={styles.fullScreen}>
        <WebGLCanvas setGl={setGl} width={width} height={height} setCnv={setCnv} />
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
}
