import React, { useEffect } from "react";
import P5 from "p5";
import dynamic from "next/dynamic";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { P5Instance } from "react-p5-wrapper";
import { SideDrawer } from "../components/SideDrawer";
import { getDescription } from "../utils/readFiles";

const ReactP5Wrapper = dynamic(
  () => import("react-p5-wrapper").then((mod) => mod.ReactP5Wrapper),
  {
    ssr: false,
  }
);

type Props = {
  description: string;
};

const Mandelbrot = ({ description }: Props) => {
  useEffect(() => {
    return () => removeResizeListeners();
  }, []);

  return (
    <main className={styles.fullScreen}>
      <ReactP5Wrapper sketch={sketch} />
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

let listeners: Listener[] = [];
type Listener = (event?: UIEvent) => void | boolean;

function listenForResize(fn: Listener) {
  console.log("Adding listener!");
  listeners.push(fn);
  window.addEventListener("resize", fn);
}

function removeResizeListeners() {
  console.log("Removing listeners!");
  listeners.forEach((fn) => window.removeEventListener("resize", fn));
  listeners = [];
}

function sketch(p5: P5Instance) {
  const aspectRatio = 2 / 1;
  const zoom_center = [0.5, 0.5];
  const target_zoom_center = [0.0, 0.0];

  let mandelBrot: P5.Shader;

  let zoom_size = 1;
  let stop_zooming = true;
  let max_iterations = 200;

  function drawMandelBrot() {
    if (!mandelBrot) return;

    mandelBrot.setUniform("u_zoomCenter", zoom_center);
    mandelBrot.setUniform("u_zoomSize", zoom_size);
    mandelBrot.setUniform("iResolution", getIResolution());

    p5.shader(mandelBrot);
    p5.rect(0, 0, p5.width, p5.height);
  }

  function getIResolution() {
    return [p5.width * p5.pixelDensity(), p5.height * p5.pixelDensity()];
  }

  p5.preload = () => {
    mandelBrot = p5.loadShader(
      "/assets/shaders/mandel.vert",
      "/assets/shaders/mandel.frag"
    );
  };

  p5.setup = () => {
    p5.createCanvas(window.innerWidth, window.innerHeight, p5.WEBGL);
    for (let i = 0; i < 2; i++) {
      drawMandelBrot();
    }

    listenForResize(() => {
      console.log("trying to draw mandelbrot shader");
      try {
        p5.resizeCanvas(window.innerWidth, window.innerHeight);
        drawMandelBrot();
      } catch (err) {
        console.log(err);
      }
    });
  };
}
