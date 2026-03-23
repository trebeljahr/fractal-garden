import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
} from "react-dat-gui";
import { WebGLCanvas } from "../components/Canvas";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import { ViewportOverlay } from "../components/ViewportOverlay";
import styles from "../styles/Fullscreen.module.css";
import { constrain, radians } from "../utils/ctxHelpers";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";
import { scrollToDescription } from "../utils/scrollToDescription";
import { createShaderProgram } from "../utils/shaders/compileShader";
import fragmentShader from "../utils/shaders/mandelbulb.frag";
import vertexShader from "../utils/shaders/mandelbrot.vert";

type Props = {
  description: string;
};

type Config = {
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
  power: 8,
  detail: 14,
  cameraDistance: 3.8,
  rotationX: 18,
  rotationY: 32,
  offsetX: 0,
  offsetY: 0,
  background: "#090d16",
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

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const aPositionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const rotationLocation = gl.getUniformLocation(program, "u_rotation");
    const panLocation = gl.getUniformLocation(program, "u_pan");
    const cameraDistanceLocation = gl.getUniformLocation(
      program,
      "u_cameraDistance"
    );
    const powerLocation = gl.getUniformLocation(program, "u_power");
    const detailLocation = gl.getUniformLocation(program, "u_detail");
    const backgroundLocation = gl.getUniformLocation(program, "u_background");
    const colorLocation = gl.getUniformLocation(program, "u_color");

    if (
      resolutionLocation === null ||
      rotationLocation === null ||
      panLocation === null ||
      cameraDistanceLocation === null ||
      powerLocation === null ||
      detailLocation === null ||
      backgroundLocation === null ||
      colorLocation === null
    ) {
      return;
    }

    const parseHexColor = (hex: string) => {
      const clean = hex.replace("#", "");
      return [
        parseInt(clean.slice(0, 2), 16) / 255,
        parseInt(clean.slice(2, 4), 16) / 255,
        parseInt(clean.slice(4, 6), 16) / 255,
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
      gl.uniform2f(
        rotationLocation,
        radians(currentConfig.rotationX),
        radians(animatedRotationY)
      );
      gl.uniform2f(panLocation, currentConfig.offsetX, currentConfig.offsetY);
      gl.uniform1f(cameraDistanceLocation, currentConfig.cameraDistance);
      gl.uniform1f(powerLocation, currentConfig.power);
      gl.uniform1f(detailLocation, currentConfig.detail);
      gl.uniform3f(backgroundLocation, bgR, bgG, bgB);
      gl.uniform3f(colorLocation, colorR, colorG, colorB);

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
          1.5,
          8
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
      <Head>
        <title>Mandelbulb</title>
        <meta
          name="description"
          content="An interactive Mandelbulb raymarcher with orbit, zoom, and pan controls. Explore one of the best-known 3D relatives of the Mandelbrot Set."
        />
      </Head>
      <main className={styles.fullScreen}>
        <DatGui data={config} onUpdate={handleUpdate}>
          <DatFolder closed={false} title="Options">
            <DatColor path="background" label="background" />
            <DatColor path="color" label="color" />
            <DatNumber path="power" label="power" min={2} max={12} step={0.1} />
            <DatNumber path="detail" label="detail" min={6} max={20} step={1} />
            <DatNumber
              path="cameraDistance"
              label="camera"
              min={1.5}
              max={8}
              step={0.05}
            />
            <DatNumber
              path="rotationX"
              label="rotationX"
              min={-85}
              max={85}
              step={1}
            />
            <DatNumber
              path="rotationY"
              label="rotationY"
              min={-180}
              max={180}
              step={1}
            />
            <DatNumber path="offsetX" label="offsetX" min={-2} max={2} step={0.01} />
            <DatNumber path="offsetY" label="offsetY" min={-2} max={2} step={0.01} />
            <DatBoolean path="autoRotate" label="autoRotate" />
          </DatFolder>
        </DatGui>
        <div className={styles.fullScreen}>
          <WebGLCanvas
            setGl={setGl}
            width={width}
            height={height}
            setCnv={setCnv}
          />
          <ViewportOverlay
            title="Interactive View"
            lines={[
              "Drag to orbit, hold Shift while dragging to pan, and use the scroll wheel to zoom.",
              "Use the button below whenever you want to jump straight down to the explanation.",
            ]}
            actions={[
              {
                label: "Reset view",
                onClick: () => setConfig(INITIAL_CONFIG),
              },
              {
                label: "About this fractal",
                onClick: scrollToDescription,
              },
            ]}
          />
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
