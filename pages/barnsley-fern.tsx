import React, { useEffect, useState } from "react";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { SideDrawer } from "../components/SideDrawer";
import { getDescription } from "../utils/readFiles";
import DatGui, { DatColor, DatFolder, DatSelect } from "react-dat-gui";
import { P5Instance } from "react-p5-wrapper";
import { DynamicReactP5Wrapper } from "../utils/DynamicP5Wrapper";

type Transformation = {
  matrix: number[][];
  scaleFactor: number;
};

type Fern =
  | "tree"
  | "fishbone"
  | "culcita"
  | "modifiedBarnsley"
  | "cyclosorus"
  | "barnsley";

type Config = {
  detail: number;
  color: string;
  background: string;
  fernToUse: Fern;
};

type Props = {
  description: string;
};

const barnsley = {
  matrix: [
    [0, 0, 0, 0.16, 0, 0, 0.01],
    [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85],
    [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07],
    [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07],
  ],
  scaleFactor: 1.2,
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

// const modifiedBarnsley = {
//   matrix: [
//     [0, 0, 0, 0.2, 0, -0.12, 0.01],
//     [0.845, 0.035, -0.035, 0.82, 0, 1.6, 0.85],
//     [0.2, -0.31, 0.255, 0.245, 0, 0.29, 0.07],
//     [-0.15, 0.24, 0.25, 0.2, 0, 0.68, 0.07],
//   ],
//   scaleFactor: 1,
// };

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
const matrices: Record<string, Transformation> = {
  tree,
  fishbone,
  culcita,
  cyclosorus,
  barnsley,
};

function sketch(p5: P5Instance<{ config: Config }>) {
  let x = 0;
  let y = 0;
  let config: Config;

  p5.updateWithProps = (props) => {
    if (props.config) {
      config = props.config;
      p5.background(config.background);
    }
  };

  function applyMatrixValues(matrix: number[]) {
    return {
      x: matrix[0] * x + matrix[1] * y + matrix[4],
      y: matrix[2] * x + matrix[3] * y + matrix[5],
    };
  }

  function generateNewCoords() {
    const r = Math.random();
    const matrix = matrices[config.fernToUse].matrix;
    const prob1 = matrix[1][6];
    const prob2 = matrix[2][6];
    const prob3 = matrix[3][6];
    const prob4 = matrix[0][6];
    if (r <= prob1) {
      return applyMatrixValues(matrix[1]);
    } else if (r <= prob1 + prob2) {
      return applyMatrixValues(matrix[2]);
    } else if (r <= prob1 + prob2 + prob3) {
      return applyMatrixValues(matrix[3]);
    } else if (r <= prob1 + prob2 + prob3 + prob4) {
      return applyMatrixValues(matrix[0]);
    }
    return {
      x: 0,
      y: 0,
    };
  }

  p5.setup = () => {
    console.log("Running setup with config", config);
    p5.createCanvas(window.innerWidth, window.innerHeight);
  };

  p5.draw = () => {
    for (let i = 0; i < 1000; i++) {
      p5.stroke(config.color);
      const fernHeight = p5.height * matrices[config.fernToUse].scaleFactor;
      const fernWidth = fernHeight / 1.5;

      let plotX = fernWidth * ((x + 3) / 6) + p5.width / 2 - fernWidth / 2;
      let plotY = p5.height - (fernHeight * y) / 14;

      p5.strokeWeight(0.1);
      p5.point(plotX, plotY);

      ({ x, y } = generateNewCoords());
    }
  };

  p5.windowResized = () => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    p5.background(config.background);
  };
}

const BarnsleyFern = ({ description }: Props) => {
  const [config, setConfig] = useState({
    detail: 60,
    color: "#96f78e",
    background: "#252424",
    fernToUse: "barnsley",
  });

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => ({ ...prevState, ...newData }));
  };

  return (
    <main className={styles.fullScreen}>
      <DatGui data={config} onUpdate={handleUpdate}>
        <DatFolder closed={true} title="Options">
          <DatSelect
            path="fernToUse"
            label="Fern"
            options={Object.keys(matrices)}
          />
          <DatColor path="background" label="background" />
          <DatColor path="color" label="color" />
        </DatFolder>
      </DatGui>
      <div className={styles.fullScreen}>
        <DynamicReactP5Wrapper sketch={sketch} config={config} />
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
