import React from "react";
import P5 from "p5";
import dynamic from "next/dynamic";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { SideDrawer } from "../components/SideDrawer";
import { getDescription } from "../utils/readFiles";

const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

let config: Configuration;
let x = 0;
let y = 0;

class Configuration {
  public detail = 60;
  public color = "#96f78e";
  public background = "#252424";
  public fernToUse = matrices.tree;
  // public name = "img_name";
  // save(p5: P5) {
  //   p5.saveCanvas(pg, this.name, "jpg");
  // }
}

function applyMatrixValues(xValue: number, yValue: number, matrix: number[]) {
  const newXValue = matrix[0] * xValue + matrix[1] * yValue + matrix[4];
  const newYValue = matrix[2] * xValue + matrix[3] * yValue + matrix[5];
  return { newXValue, newYValue };
}

function generateNewCoords(xValue: number, yValue: number) {
  const r = Math.random();
  const matrix = config.fernToUse.matrix;
  const prob1 = matrix[1][6];
  const prob2 = matrix[2][6];
  const prob3 = matrix[3][6];
  const prob4 = matrix[0][6];
  if (r <= prob1) {
    return applyMatrixValues(xValue, yValue, matrix[1]);
  } else if (r <= prob1 + prob2) {
    return applyMatrixValues(xValue, yValue, matrix[2]);
  } else if (r <= prob1 + prob2 + prob3) {
    return applyMatrixValues(xValue, yValue, matrix[3]);
  } else if (r <= prob1 + prob2 + prob3 + prob4) {
    return applyMatrixValues(xValue, yValue, matrix[0]);
  }
  return {
    newXValue: 0,
    newYValue: 0,
  };
}

const barnsley = {
  matrix: [
    [0, 0, 0, 0.16, 0, 0, 0.01],
    [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85],
    [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07],
    [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07],
  ],
  scaleFactor: 1,
};

const cyclosorus = {
  matrix: [
    [0, 0, 0, 0.25, 0, -0.4, 0.02],
    [0.95, 0.005, -0.005, 0.93, -0.002, 0.5, 0.84],
    [0.035, -0.2, 0.16, 0.04, -0.09, 0.02, 0.07],
    [-0.04, 0.2, 0.16, 0.04, 0.083, 0.12, 0.07],
  ],
  scaleFactor: 2,
};

const modifiedBarnsley = {
  matrix: [
    [0, 0, 0, 0.2, 0, -0.12, 0.01],
    [0.845, 0.035, -0.035, 0.82, 0, 1.6, 0.85],
    [0.2, -0.31, 0.255, 0.245, 0, 0.29, 0.07],
    [-0.15, 0.24, 0.25, 0.2, 0, 0.68, 0.07],
  ],
  scaleFactor: 1,
};

const culcita = {
  matrix: [
    [0, 0, 0, 0.25, 0, -0.14, 0.02],
    [0.85, 0.02, -0.02, 0.83, 0, 1, 0.84],
    [0.09, -0.28, 0.3, 0.11, 0, 0.6, 0.07],
    [-0.09, 0.28, 0.3, 0.09, 0, 0.7, 0.07],
  ],
  scaleFactor: 2,
};

const fishbone = {
  matrix: [
    [0, 0, 0, 0.25, 0, -0.4, 0.02],
    [0.95, 0.002, -0.002, 0.93, -0.002, 0.5, 0.84],
    [0.035, -0.11, 0.27, 0.01, -0.05, 0.005, 0.07],
    [-0.04, 0.11, 0.27, 0.01, 0.047, 0.06, 0.07],
  ],
  scaleFactor: 2,
};

const tree = {
  matrix: [
    [0, 0, 0, 0.5, 0, 0, 0.05],
    [0.42, -0.42, 0.42, 0.42, 0, 0.2, 0.4],
    [0.42, 0.42, -0.42, 0.42, 0, 0.2, 0.4],
    [0.1, 0, 0, 0.1, 0, 0.2, 0.15],
  ],
  scaleFactor: 24,
};

const matrices = {
  tree,
  fishbone,
  culcita,
  modifiedBarnsley,
  cyclosorus,
  barnsley,
};

type Props = {
  description: string;
};

const BarnsleyFern = ({ description }: Props) => {
  const setup = (p5: P5, canvasParentRef: Element) => {
    config = new Configuration();
    p5.createCanvas(window.innerWidth, window.innerHeight).parent(
      canvasParentRef
    );
    p5.background(config.background);
    // p5.angleMode(p5.DEGREES);
    // p5.rotate(180);

    // const gui = new dat.GUI();
    // const o = gui.addFolder("Options");
    // const iterationController = o.add(config, "detail", 10, 80).step(1);
    // const barnsleyController = o.add(config, "useBarnsley");
    // const colorController = o.addColor(config, "color");
    // const backgroundController = o.addColor(config, "background");

    // iterationController.onChange(reset);
    // barnsleyController.onChange(reset);
    // backgroundController.onChange(reset);
    // colorController.onChange(reset);
    // const saving = gui.addFolder("Save File");
    // saving.add(config, "name");
    // saving.add(config, "save");
  };

  const draw = (p5: P5) => {
    for (let i = 0; i < 1000; i++) {
      p5.stroke(config.color);
      const fernHeight = p5.height * config.fernToUse.scaleFactor;
      const fernWidth = fernHeight / 2;

      let plotX = fernWidth * ((x + 3) / 6) + p5.width / 2 - fernWidth / 2;
      let plotY = p5.height - (fernHeight * y) / 14;

      p5.strokeWeight(1);
      p5.point(plotX, plotY);

      const coords = generateNewCoords(x, y);
      x = coords.newXValue;
      y = coords.newYValue;
    }
  };

  const windowResized = (p5: P5) => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    p5.background(config.background);
  };

  return (
    <main className={styles.fullScreen}>
      <div className={styles.fullScreen}>
        <Sketch setup={setup} draw={draw} windowResized={windowResized} />
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default BarnsleyFern;

export async function getStaticProps() {
  const description = await getDescription("barnsley-fern.md");
  return {
    props: {
      description,
    },
  };
}
