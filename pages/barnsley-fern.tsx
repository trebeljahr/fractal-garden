import React, { useEffect, useState } from "react";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { SideDrawer } from "../components/SideDrawer";
import { getDescription } from "../utils/readFiles";
import DatGui, { DatColor, DatFolder, DatSelect } from "react-dat-gui";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { Canvas } from "../components/Canvas";

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

const BarnsleyFern = ({ description }: Props) => {
  const [config, setConfig] = useState({
    detail: 60,
    color: "#96f78e",
    background: "#252424",
    fernToUse: "barnsley",
  });
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    let x = 0;
    let y = 0;

    const applyMatrixValues = (matrix: number[]) => {
      return {
        x: matrix[0] * x + matrix[1] * y + matrix[4],
        y: matrix[2] * x + matrix[3] * y + matrix[5],
      };
    };

    const generateNewCoords = () => {
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
    };
    const point = (x: number, y: number) => {
      ctx.fillRect(x, y, 1, 1);
    };

    const draw = () => {
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = config.color;
        const fernHeight = height * matrices[config.fernToUse].scaleFactor;
        const fernWidth = fernHeight / 1.5;

        let plotX = fernWidth * ((x + 3) / 6) + width / 2 - fernWidth / 2;
        let plotY = height - (fernHeight * y) / 14;

        ctx.lineWidth = 0.1;
        point(plotX, plotY);

        ({ x, y } = generateNewCoords());
      }
    };

    const id = setInterval(draw, 100);
    return () => clearInterval(id);
  }, [config, ctx, width, height]);

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
        <Canvas setCtx={setCtx} width={width} height={height} />
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
