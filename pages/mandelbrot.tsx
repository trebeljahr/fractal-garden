import React, { useEffect, useState } from "react";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { SideDrawer } from "../components/SideDrawer";
import { getDescription } from "../utils/readFiles";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { WebGLCanvas } from "../components/Canvas";
import vertexShader from "../utils/shaders/mandelbrot.vert";
import fragmentShader from "../utils/shaders/mandelbrot.frag";
import { createShaderProgram } from "../utils/shaders/compileShader";
import Head from "next/head";
import { constrain } from "../utils/ctxHelpers";
import { remapper } from "../utils/scaling";

type Props = {
  description: string;
};

const Mandelbrot = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!gl || !width || !height || !cnv) return;
    const aspectRatio = 2 / 1;
    const target_zoom_center = [0.0, 0.0];
    let stop_zooming = true;
    let max_iterations = 200;

    const zoomCenter = [0.5, 0.5];
    let zoomSize = 1;
    let zooming = false;
    let zoomFactor = 1;

    const output = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!output) return;

    const { program } = output;

    gl.useProgram(program);

    const vertBuf = gl.createBuffer();
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

    const drawMandelBrot = () => {
      const getPixelDensity = () => {
        return Math.ceil(window.devicePixelRatio) || 1;
      };
      const getIResolution = () => {
        return [width * getPixelDensity(), height * getPixelDensity()];
      };

      const resolution = getIResolution();

      gl.uniform2f(zoomCenterLocation, zoomCenter[0], zoomCenter[1]);
      gl.uniform1f(zoomSizeLocation, zoomSize);
      gl.uniform2f(resolutionLocation, resolution[0], resolution[1]);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let zoomAcceleration = 0;
    // let id: NodeJS.Timer;
    const clickHandler = (event: MouseEvent) => {
      zooming = true;
      zoomFactor = event.ctrlKey ? 1.01 : 0.99;
      zoomAcceleration = event.ctrlKey ? 0.00007 : -0.00007;
      requestAnimationFrame(zoom);
    };

    const clickReleaseHandler = () => {
      zooming = false;
    };
    let x: number = 0;
    let y: number = 0;

    const zoom = () => {
      if (!zooming) return;
      zoomFactor += zoomAcceleration;
      zoomSize = constrain(zoomSize * zoomFactor, 0.00005, 4);
      zoomCenter[0] += (x * Math.min(1, zoomSize)) / 10;
      zoomCenter[1] -= (y * Math.min(1, zoomSize)) / 10;
      drawMandelBrot();
      requestAnimationFrame(zoom);
    };

    const remapX = remapper([0, width], [-1, 1]);
    const remapY = remapper([0, height], [-1, 1]);
    const updateMousePosition = ({ clientX, clientY }: MouseEvent) => {
      if (!zooming) return;

      x = remapX(clientX);
      y = remapY(clientY);
    };

    drawMandelBrot();

    cnv.addEventListener("mousemove", updateMousePosition);

    cnv.addEventListener("mousedown", clickHandler);
    cnv.addEventListener("mouseup", clickReleaseHandler);
    return () => {
      cnv.removeEventListener("mousedown", clickHandler);
      cnv.removeEventListener("mouseup", clickReleaseHandler);
      cnv.removeEventListener("mousemove", updateMousePosition);
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
