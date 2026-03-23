import Head from "next/head";
import React, { useEffect, useState } from "react";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { getDescription } from "../utils/readFiles";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { WebGLCanvas } from "../components/Canvas";
import vertexShader from "../utils/shaders/mandelbrot.vert";
import fragmentShader from "../utils/shaders/newton.frag";
import { createShaderProgram } from "../utils/shaders/compileShader";
import { constrain } from "../utils/ctxHelpers";

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

  useEffect(() => {
    if (!gl || !width || !height || !cnv) return;

    let center: [number, number] = [...INITIAL_CENTER];
    let zoomSize = INITIAL_ZOOM_SIZE;
    let zooming = false;
    let zoomFactor = 1;
    let zoomAcceleration = 0;
    let mouse: [number, number] = [0, 0];
    let animationId = 0;

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
      const ratio = Math.ceil(window.devicePixelRatio) || 1;
      return [width * ratio, height * ratio] as const;
    };

    const drawNewton = () => {
      const [resolutionX, resolutionY] = getResolution();

      gl.uniform2f(centerLocation, center[0], center[1]);
      gl.uniform1f(zoomSizeLocation, zoomSize);
      gl.uniform2f(resolutionLocation, resolutionX, resolutionY);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const updateMousePosition = ({ clientX, clientY }: MouseEvent) => {
      const rect = cnv.getBoundingClientRect();
      const shortestSide = Math.min(rect.width, rect.height);
      if (!shortestSide) return;

      const px = clientX - rect.left;
      const py = clientY - rect.top;

      mouse = [
        (2 * px - rect.width) / shortestSide,
        (rect.height - 2 * py) / shortestSide,
      ];
    };

    const zoom = () => {
      if (!zooming) return;

      zoomFactor += zoomAcceleration;

      const nextZoomSize = constrain(
        zoomSize * zoomFactor,
        MIN_ZOOM_SIZE,
        MAX_ZOOM_SIZE
      );
      const zoomDelta = zoomSize - nextZoomSize;

      center = [
        center[0] + mouse[0] * zoomDelta,
        center[1] + mouse[1] * zoomDelta,
      ];
      zoomSize = nextZoomSize;

      drawNewton();
      animationId = requestAnimationFrame(zoom);
    };

    const clickHandler = (event: MouseEvent) => {
      event.preventDefault();
      updateMousePosition(event);
      zooming = true;
      zoomFactor = event.ctrlKey ? 1.015 : 0.985;
      zoomAcceleration = event.ctrlKey ? 0.00009 : -0.00009;
      animationId = requestAnimationFrame(zoom);
    };

    const clickReleaseHandler = () => {
      zooming = false;
      cancelAnimationFrame(animationId);
    };

    drawNewton();

    cnv.addEventListener("mousemove", updateMousePosition);
    cnv.addEventListener("mousedown", clickHandler);
    cnv.addEventListener("mouseleave", clickReleaseHandler);
    window.addEventListener("mouseup", clickReleaseHandler);

    return () => {
      cancelAnimationFrame(animationId);
      cnv.removeEventListener("mousemove", updateMousePosition);
      cnv.removeEventListener("mousedown", clickHandler);
      cnv.removeEventListener("mouseleave", clickReleaseHandler);
      window.removeEventListener("mouseup", clickReleaseHandler);
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
          content="An interactive Newton fractal for z^3 - 1. Each region shows which root Newton's method converges to, with the boundaries turning into a fractal web."
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
