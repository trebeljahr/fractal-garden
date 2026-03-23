import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import { ViewportOverlay } from "../components/ViewportOverlay";
import styles from "../styles/Fullscreen.module.css";
import { getDescription } from "../utils/readFiles";
import { scrollToDescription } from "../utils/scrollToDescription";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { WebGLCanvas } from "../components/Canvas";
import vertexShader from "../utils/shaders/mandelbrot.vert";
import fragmentShader from "../utils/shaders/newton.frag";
import { createShaderProgram } from "../utils/shaders/compileShader";
import { useShaderViewportControls } from "../utils/hooks/useShaderViewportControls";

type Props = {
  description: string;
};

const INITIAL_CENTER: [number, number] = [0, 0];
const INITIAL_ZOOM_SIZE = 2.2;
const MIN_ZOOM_SIZE = 0.00005;
const MAX_ZOOM_SIZE = 4;

const NewtonFractal = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  const viewportRef = useRef({
    center: [...INITIAL_CENTER] as [number, number],
    zoomSize: INITIAL_ZOOM_SIZE,
  });
  const renderRef = useRef<(() => void) | null>(null);

  useShaderViewportControls({
    canvas: cnv,
    viewportRef,
    minZoomSize: MIN_ZOOM_SIZE,
    maxZoomSize: MAX_ZOOM_SIZE,
    onViewportChange: () => renderRef.current?.(),
  });

  useEffect(() => {
    if (!gl || !width || !height || !cnv) return;

    const output = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!output) return;

    const { program, vert, frag } = output;

    gl.useProgram(program);

    const vertBuf = gl.createBuffer();
    if (!vertBuf) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const aPositionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPositionLocation);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

    const centerLocation = gl.getUniformLocation(program, "u_center");
    const zoomSizeLocation = gl.getUniformLocation(program, "u_zoomSize");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    if (
      centerLocation === null ||
      zoomSizeLocation === null ||
      resolutionLocation === null
    ) {
      return;
    }

    const getResolution = () => {
      const ratio = window.devicePixelRatio || 1;
      return [width * ratio, height * ratio] as const;
    };

    const drawNewton = () => {
      const [resolutionX, resolutionY] = getResolution();
      const { center, zoomSize } = viewportRef.current;

      gl.uniform2f(centerLocation, center[0], center[1]);
      gl.uniform1f(zoomSizeLocation, zoomSize);
      gl.uniform2f(resolutionLocation, resolutionX, resolutionY);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    renderRef.current = drawNewton;

    drawNewton();

    return () => {
      renderRef.current = null;
      gl.deleteBuffer(vertBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, [gl, width, height, cnv]);

  return (
    <>
      <Head>
        <title>Newton Fractal</title>
        <meta
          name="description"
          content="An interactive Newton fractal for z^3 - 1 with drag-to-pan and focal-point zoom controls across mouse, trackpad, and touch."
        />
      </Head>
      <main className={styles.fullScreen}>
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
              "Drag to pan and use the scroll wheel or a pinch gesture to zoom into the basins.",
              "Use the button below whenever you want to jump straight down to the explanation.",
            ]}
            actions={[
              {
                label: "Reset view",
                onClick: () => {
                  viewportRef.current = {
                    center: [...INITIAL_CENTER] as [number, number],
                    zoomSize: INITIAL_ZOOM_SIZE,
                  };
                  renderRef.current?.();
                },
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

export default NewtonFractal;

export async function getStaticProps() {
  const description = await getDescription("newton-fractal.md");
  return {
    props: {
      description,
    },
  };
}
