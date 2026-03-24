import React, { useEffect, useRef, useState } from "react";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { SideDrawer } from "../components/SideDrawer";
import { ViewportOverlay } from "../components/ViewportOverlay";
import { getDescription } from "../utils/readFiles";
import { scrollToDescription } from "../utils/scrollToDescription";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { WebGLCanvas } from "../components/Canvas";
import vertexShader from "../utils/shaders/mandelbrot.vert";
import fragmentShader from "../utils/shaders/mandelbrot.frag";
import { createShaderProgram } from "../utils/shaders/compileShader";
import Head from "next/head";
import { useShaderViewportControls } from "../utils/hooks/useShaderViewportControls";

type Props = {
  description: string;
};

const INITIAL_CENTER: [number, number] = [-0.5, 0];
const INITIAL_ZOOM_SIZE = 1.5;
const MIN_ZOOM_SIZE = 0.00005;
const MAX_ZOOM_SIZE = 4;

const Mandelbrot = ({ description }: Props) => {
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

    const zoomCenterLocation = gl.getUniformLocation(program, "u_zoomCenter");
    const zoomSizeLocation = gl.getUniformLocation(program, "u_zoomSize");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    if (
      zoomCenterLocation === null ||
      zoomSizeLocation === null ||
      resolutionLocation === null
    ) {
      return;
    }

    const drawMandelBrot = () => {
      const ratio = window.devicePixelRatio || 1;
      const resolution = [width * ratio, height * ratio];
      const { center, zoomSize } = viewportRef.current;

      gl.uniform2f(zoomCenterLocation, center[0], center[1]);
      gl.uniform1f(zoomSizeLocation, zoomSize);
      gl.uniform2f(resolutionLocation, resolution[0], resolution[1]);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    renderRef.current = drawMandelBrot;

    drawMandelBrot();

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
        <title>Mandelbrot Set</title>
        <meta
          name="description"
          content={`An interactive WebGL implementation of the most famous fractal – The Mandelbrot Set. You can zoom in and out and move around to explore this beautiful fractal.`}
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
            title="Mandelbrot Set"
            lines={[
              "Drag to pan and use the scroll wheel or a pinch gesture to zoom into the set.",
            ]}
          />
        </div>
        <SideDrawer description={description} />
        <NavElement />
      </main>
    </>
  );
};

export default Mandelbrot;

export async function getStaticProps() {
  const description = await getDescription("mandelbrot.md");
  return {
    props: {
      description,
    },
  };
}
