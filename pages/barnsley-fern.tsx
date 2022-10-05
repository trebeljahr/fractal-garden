import Head from "next/head";
import { useEffect, useState } from "react";
import DatGui, { DatColor, DatFolder, DatSelect } from "react-dat-gui";
import { Canvas } from "../components/Canvas";
import { NavElement } from "../components/Navbar";
import { SideDrawer } from "../components/SideDrawer";
import styles from "../styles/Fullscreen.module.css";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { getDescription } from "../utils/readFiles";

type Pair = [number, number];

type Range = {
  x: Pair;
  y: Pair;
};

type Transformation = {
  matrix: number[][];
  range: Range;
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

const barnsley: Transformation = {
  matrix: [
    [0, 0, 0, 0.16, 0, 0, 0.01],
    [0.85, 0.04, -0.04, 0.85, 0, 1.6, 0.85],
    [0.2, -0.26, 0.23, 0.22, 0, 1.6, 0.07],
    [-0.15, 0.28, 0.26, 0.24, 0, 0.44, 0.07],
  ],
  range: {
    x: [-2.1818903790071125, 2.6557747667552816],
    y: [0.02608982485507005, 9.998262444483984],
  },
};

const cyclosorus: Transformation = {
  matrix: [
    [0, 0, 0, 0.25, 0, -0.4, 0.02],
    [0.95, 0.005, -0.005, 0.93, -0.002, 0.5, 0.84],
    [0.035, -0.2, 0.16, 0.04, -0.09, 0.02, 0.07],
    [-0.04, 0.2, 0.16, 0.04, 0.083, 0.12, 0.07],
  ],
  range: {
    x: [-1.481437310172126, 1.4688031414475642],
    y: [-0.5242181479502903, 7.065303969358817],
  },
};

const culcita: Transformation = {
  matrix: [
    [0, 0, 0, 0.25, 0, -0.14, 0.02],
    [0.85, 0.02, -0.02, 0.83, 0, 1, 0.84],
    [0.09, -0.28, 0.3, 0.11, 0, 0.6, 0.07],
    [-0.09, 0.28, 0.3, 0.09, 0, 0.7, 0.07],
  ],
  range: {
    x: [-1.554095416084085, 1.5541284149808385],
    y: [-0.16359863938121072, 5.792318591578755],
  },
};

const fishbone: Transformation = {
  matrix: [
    [0, 0, 0, 0.25, 0, -0.4, 0.02],
    [0.95, 0.002, -0.002, 0.93, -0.002, 0.5, 0.84],
    [0.035, -0.11, 0.27, 0.01, -0.05, 0.005, 0.07],
    [-0.04, 0.11, 0.27, 0.01, 0.047, 0.06, 0.07],
  ],
  range: {
    x: [-0.824774321794105, 0.8201509587996155],
    y: [-0.5253577299921368, 7.115950148147405],
  },
};

const tree: Transformation = {
  matrix: [
    [0, 0, 0, 0.5, 0, 0, 0.05],
    [0.42, -0.42, 0.42, 0.42, 0, 0.2, 0.4],
    [0.42, 0.42, -0.42, 0.42, 0, 0.2, 0.4],
    [0.1, 0, 0, 0.1, 0, 0.2, 0.15],
  ],
  range: {
    x: [-0.23881114077953836, 0.23881256075834323],
    y: [0.014764991641483417, 0.43881111326061006],
  },
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

    // scaling the fern
    const { range } = matrices[config.fernToUse];
    const [xMin, xMax] = range.x;
    const [yMin, yMax] = range.y;

    const padding = 100;

    const determineLimits = (limitByWidth: boolean): [number, number] => {
      if (!limitByWidth) {
        // limit fern by screen height
        const heightLimit = height - 2 * padding;
        const widthLimit = heightLimit * ratio;
        const exceeding = widthLimit > width - 2 * padding;
        return exceeding ? determineLimits(!isWide) : [widthLimit, heightLimit];
      }

      // limit by screen width
      const widthLimit = width - 2 * padding;
      const heightLimit = widthLimit / ratio;
      const exceeding = heightLimit > height - 2 * padding;
      return exceeding ? determineLimits(!isWide) : [widthLimit, heightLimit];
    };

    const ratio = (xMax - xMin) / (yMax - yMin);
    const isWide = ratio > 1;
    const [drawWidth, drawHeight] = determineLimits(isWide);

    // remap to full scale
    const remapper =
      (pMin: number, pMax: number, tMin: number, tMax: number) => (p: number) =>
        ((tMax - tMin) / (pMax - pMin)) * p;
    const remapX = remapper(xMin, xMax, 0, drawWidth);
    const remapY = remapper(yMin, yMax, 0, drawHeight);

    const draw = () => {
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = config.color;

        const plotX = remapX(x) + width / 2;
        const plotY = remapY(y) * -1 + height - padding;

        ctx.lineWidth = 0.1;
        point(plotX, plotY);

        ({ x, y } = generateNewCoords());
      }
    };

    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    const id = setInterval(draw, 100);
    return () => clearInterval(id);
  }, [config, ctx, width, height]);

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => ({ ...prevState, ...newData }));
  };

  return (
    <>
      <Head>
        <title>Barnsley Fern</title>
        <meta
          name="description"
          content={`An interactive fractal implementation of a Barnsley Fern. There are multiple different fern "types" you can play around with.`}
        />
      </Head>
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
    </>
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
