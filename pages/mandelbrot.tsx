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

type Props = {
  description: string;
};

const Mandelbrot = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);

  useEffect(() => {
    if (!gl || !width || !height) return;

    const aspectRatio = 2 / 1;
    const target_zoom_center = [0.0, 0.0];
    let stop_zooming = true;
    let max_iterations = 200;

    const zoom_center = [0.5, 0.5];
    let zoom_size = 1;

    const getPixelDensity = () => {
      return Math.ceil(window.devicePixelRatio) || 1;
    };
    const getIResolution = () => {
      return [width * getPixelDensity(), height * getPixelDensity()];
    };

    const drawMandelBrot = () => {
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

      gl.uniform2f(zoomCenterLocation, zoom_center[0], zoom_center[1]);
      gl.uniform1f(zoomSizeLocation, zoom_size);
      const resolution = getIResolution();
      gl.uniform2f(resolutionLocation, resolution[0], resolution[1]);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // mandelBrot.setUniform("u_zoomCenter", zoom_center);
      // mandelBrot.setUniform("u_zoomSize", zoom_size);
      // mandelBrot.setUniform("iResolution", getIResolution());

      // ctx.shader(mandelBrot);
      // ctx.rect(0, 0, ctx.width, ctx.height);
    };

    drawMandelBrot();
  }, [gl, width, height]);

  return (
    <main className={styles.fullScreen}>
      <div className={styles.fullScreen}>
        <WebGLCanvas setGl={setGl} width={width} height={height} />
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
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
