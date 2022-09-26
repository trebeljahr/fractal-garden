import React from "react";
import P5 from "p5";
import dynamic from "next/dynamic";
import { NavElement } from "../components/Navbar";

// Will only import `react-p5` on client-side
const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

const aspectRatio = 2 / 1;
const zoom_center = [0.5, 0.5];
const target_zoom_center = [0.0, 0.0];

let mandelBrot: P5.Shader;

let zoom_size = 1;
let stop_zooming = true;
let max_iterations = 200;

const Mandelbrot = () => {
  const preload = (p5: P5) => {
    mandelBrot = p5.loadShader(
      "/assets/shaders/mandel.vert",
      "/assets/shaders/mandel.frag"
    );
  };

  const setup = (p5: P5, canvasParentRef: Element) => {
    p5.createCanvas(window.innerWidth, window.innerHeight, p5.WEBGL).parent(
      canvasParentRef
    );
    for (let i = 0; i < 2; i++) {
      drawMandelBrot(p5);
    }
  };

  const windowResized = (p5: P5) => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    drawMandelBrot(p5);
  };

  return (
    <main>
      <Sketch setup={setup} preload={preload} windowResized={windowResized} />
      <NavElement />
    </main>
  );
};

function drawMandelBrot(p5: P5) {
  mandelBrot.setUniform("u_zoomCenter", zoom_center);
  mandelBrot.setUniform("u_zoomSize", zoom_size);
  mandelBrot.setUniform("iResolution", getIResolution(p5));

  p5.shader(mandelBrot);
  p5.rect(0, 0, p5.width, p5.height);
}

function getIResolution(p5: P5) {
  return [p5.width * p5.pixelDensity(), p5.height * p5.pixelDensity()];
}

export default Mandelbrot;
