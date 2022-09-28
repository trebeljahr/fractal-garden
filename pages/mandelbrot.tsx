import React, { useEffect, useState } from "react";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { SideDrawer } from "../components/SideDrawer";
import { getDescription } from "../utils/readFiles";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { WebGLCanvas } from "../components/Canvas";
import vertexShader from "../utils/shaders/mandelbrot/vert.glsl";
import fragmentShader from "../utils/shaders/mandelbrot/frag.glsl";
import { createShaderProgram } from "../utils/shaders/compileShader";

type Props = {
  description: string;
};

const Mandelbrot = ({ description }: Props) => {
  const { width, height } = useWindowSize();
  const [gl, setGl] = useState<WebGLRenderingContext | null>(null);

  useEffect(() => {
    if (!gl || !width || !height) return;

    const output = createShaderProgram(gl, vertexShader, fragmentShader);
    if (!output) return;
    const { program, vert, frag } = output;

    const aPositionLocation = gl.getAttribLocation(program, "aPosition");

    const colorLocation = gl.getUniformLocation(program, "u_zoomCenter");
    const matrixLocation = gl.getUniformLocation(program, "u_zoomSize");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const aspectRatio = 2 / 1;
    const zoom_center = [0.5, 0.5];
    const target_zoom_center = [0.0, 0.0];

    let mandelBrot: any;

    let zoom_size = 1;
    let stop_zooming = true;
    let max_iterations = 200;

    const drawMandelBrot = () => {
      if (!mandelBrot) return;

      // mandelBrot.setUniform("u_zoomCenter", zoom_center);
      // mandelBrot.setUniform("u_zoomSize", zoom_size);
      // mandelBrot.setUniform("iResolution", getIResolution());

      // ctx.shader(mandelBrot);
      // ctx.rect(0, 0, ctx.width, ctx.height);
    };

    const getIResolution = () => {
      // return [width * ctx.pixelDensity(), height * ctx.pixelDensity()];
    };
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
