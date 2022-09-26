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
let iterations = 1;

class Configuration {
  public detail = 60;
  public color = "#96f78e";
  public background = "#252424";
  public useBarnsley = true;
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

function generateNewCoords(
  xValue: number,
  yValue: number,
  matrices: number[][]
) {
  const r = Math.random();
  const prob1 = matrices[1][6];
  const prob2 = matrices[2][6];
  const prob3 = matrices[3][6];
  const prob4 = matrices[0][6];
  if (r <= prob1) {
    return applyMatrixValues(xValue, yValue, matrices[1]);
  } else if (r <= prob1 + prob2) {
    return applyMatrixValues(xValue, yValue, matrices[2]);
  } else if (r <= prob1 + prob2 + prob3) {
    return applyMatrixValues(xValue, yValue, matrices[3]);
  } else if (r <= prob1 + prob2 + prob3 + prob4) {
    return applyMatrixValues(xValue, yValue, matrices[0]);
  }
  return {
    newXValue: 0,
    newYValue: 0,
  };
}

function getDrawX(p5: P5) {
  const low = p5.width / 2 - p5.height / 3;
  const high = p5.width / 2 + p5.height / 3;
  return config.useBarnsley
    ? Math.floor(p5.map(x, -2.182, 2.6558, low, high))
    : Math.floor(p5.map(x, -1.4, 1.7558, low, high));
}

function getDrawY(p5: P5) {
  return config.useBarnsley
    ? Math.floor(p5.map(y, 0, 9.9983, p5.height, 100))
    : Math.floor(p5.map(y, -0.5, 6.9983, p5.height, 200));
}

const barnsleyMatrices = [
  [0, 0, 0, 0.16, 0, 0, 0.01],
  [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85],
  [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07],
  [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07],
];

const differentMatrices = [
  [0, 0, 0, 0.25, 0, -0.4, 0.02],
  [0.95, 0.005, -0.005, 0.93, -0.002, 0.5, 0.84],
  [0.035, -0.2, 0.16, 0.04, -0.09, 0.02, 0.07],
  [-0.04, 0.2, 0.16, 0.04, 0.083, 0.12, 0.07],
];

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
    iterations = 1;
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

  const windowResized = (p5: P5) => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    p5.background(config.background);
    iterations = 1;
  };

  const draw = (p5: P5) => {
    if (iterations < config.detail) {
      iterations++;
      for (let i = 0; i < 10000; i++) {
        p5.stroke(config.color);
        const drawX = getDrawX(p5);
        const drawY = getDrawY(p5);
        p5.strokeWeight(40 / config.detail);
        p5.point(drawX, drawY);
        const matrices = config.useBarnsley
          ? barnsleyMatrices
          : differentMatrices;
        const coords = generateNewCoords(x, y, matrices);
        x = coords.newXValue;
        y = coords.newYValue;
      }
    }
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
