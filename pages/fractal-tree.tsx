import React from "react";
import P5 from "p5";
import dynamic from "next/dynamic";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";

class Config {
  public angle = 43;
  public maxIterations = 8;
  public branches = 3;
  public color = "#252424";
  public rootLength = window.innerHeight / 2.5;
  public lengthDecay = 0.6;
  public widthDecay = 0.8;
  public rootWidth = 16;
  // public name = "img_name";
  // public save = () => saveCanvas(canvas, this.name, "jpg");
}

const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

function drawTree(p5: P5) {
  p5.background(config.color);
  p5.resetMatrix();
  p5.translate(p5.width / 2, p5.height);
  branch(p5, config.rootLength, config.rootWidth, 0);
}

function branch(p5: P5, len: number, weight: number, iteration: number) {
  if (iteration > config.maxIterations) {
    return;
  }
  p5.strokeWeight(weight);
  p5.stroke(
    p5.map(iteration, 0, 10, 100, 150),
    p5.map(iteration, 0, 10, 100, 255),
    100
  );
  p5.line(0, 0, 0, -len);
  p5.translate(0, -len);
  p5.rotate(
    config.angle *
      (config.branches % 2 === 0
        ? Math.floor(config.branches / 2) - 0.5
        : Math.floor(config.branches / 2))
  );
  for (let i = 0; i < config.branches; i++) {
    p5.push();
    p5.rotate(-config.angle * i);
    branch(
      p5,
      len * config.lengthDecay,
      weight * config.widthDecay,
      iteration + 1
    );
    p5.pop();
  }
}

let config: Config;

const FractalTree = () => {
  const setup = (p5: P5, canvasParentRef: Element) => {
    p5.createCanvas(window.innerWidth, window.innerHeight).parent(
      canvasParentRef
    );
    p5.angleMode(p5.DEGREES);
    config = new Config();
    p5.background(config.color);

    drawTree(p5);
    // const gui = new dat.GUI();
    // const o = gui.addFolder("Options");
    // let angleController = o.add(config, "angle", 5, 180).step(1);
    // const iterationController = o.add(config, "maxIterations", 1, 10).step(1);
    // const branchController = o.add(config, "branches", 1, 5).step(1);
    // const rootLengthController = o.add(
    //   config,
    //   "rootLength",
    //   window.innerHeight / 5,
    //   window.innerHeight / 2
    // );
    // const lengthDecayController = o.add(config, "lengthDecay", 0.1, 0.8);
    // const widthDecayController = o.add(config, "widthDecay", 0.1, 1);
    // const rootWidthController = o.add(config, "rootWidth", 10, 60).step(1);

    // const saving = gui.addFolder("Save File");
    // saving.add(config, "name");
    // saving.add(config, "save");

    // angleController.onChange(drawTree);
    // rootWidthController.onChange(drawTree);
    // rootLengthController.onChange(drawTree);
    // branchController.onChange(drawTree);
    // iterationController.onChange(drawTree);
    // lengthDecayController.onChange(drawTree);
    // widthDecayController.onChange(drawTree);
  };

  const windowResized = (p5: P5) => {
    console.log("Resizing fractal tree!");
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    drawTree(p5);
  };

  const draw = (p5: P5) => {};

  return (
    <main className={styles.fullScreen}>
      <Sketch setup={setup} draw={draw} windowResized={windowResized} />

      <NavElement />
    </main>
  );
};

export default FractalTree;
