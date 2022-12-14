import React, { useEffect, useState } from "react";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { getDescription } from "../utils/readFiles";
import { SideDrawer } from "../components/SideDrawer";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
  DatSelect,
} from "react-dat-gui";
import { Canvas } from "../components/Canvas";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { radians, rgb } from "../utils/ctxHelpers";
import Head from "next/head";
import { remapper } from "../utils/scaling";

const defaultTree = {
  angle: 43,
  animateAngle: true,
  maxIterations: 7,
  branches: 3,
  background: "#252424",
  lengthFactor: 0.6,
  widthFactor: 0.8,
  rootWidth: 16,
};

const hTree = {
  angle: 180,
  animateAngle: false,
  maxIterations: 9,
  branches: 2,
  background: "#252424",
  lengthFactor: 0.7,
  widthFactor: 0.8,
  rootWidth: 20,
};

const sierpinski = {
  angle: 120,
  animateAngle: false,
  maxIterations: 8,
  branches: 3,
  background: "#252424",
  lengthFactor: 0.5,
  widthFactor: 0.8,
  rootWidth: 17,
};

const snowflake = {
  angle: 90,
  animateAngle: false,
  maxIterations: 5,
  branches: 5,
  background: "#252424",
  lengthFactor: 0.4,
  widthFactor: 0.8,
  rootWidth: 17,
};

const sixFold = {
  angle: 60,
  animateAngle: false,
  maxIterations: 5,
  branches: 6,
  background: "#252424",
  lengthFactor: 0.4,
  widthFactor: 0.7,
  rootWidth: 10.5,
};

const broccoli = {
  angle: 52,
  animateAngle: false,
  maxIterations: 6,
  branches: 4,
  background: "#252424",
  lengthFactor: 0.54,
  widthFactor: 0.9,
  rootWidth: 47.5,
};

const configs: Record<string, Config> = {
  defaultTree,
  broccoli,
  sierpinski,
  snowflake,
  sixFold,
  hTree,
};

type Config = {
  angle: number;
  animateAngle?: boolean;
  maxIterations: number;
  branches: number;
  background: string;
  lengthFactor: number;
  widthFactor: number;
  rootWidth: number;
  option?: string;
};

type Props = {
  description: string;
};

const FractalTree = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>(defaultTree);
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!config.animateAngle) return;
    const id = setInterval(() => {
      setConfig((old) => {
        return { ...old, angle: (old.angle + 1) % 360 };
      });
    }, 100);
    return () => clearInterval(id);
  }, [config.animateAngle]);

  const angle = radians(
    config.angle *
      (config.branches % 2 === 0
        ? Math.floor(config.branches / 2) - 0.5
        : Math.floor(config.branches / 2))
  );
  const configAngle = radians(-config.angle);

  const remapR = remapper([0, 10], [100, 150]);
  const remapG = remapper([0, 10], [100, 255]);
  const strokeStyles = [...new Array(config.maxIterations)].map(
    (_, iteration) => {
      return rgb(remapR(iteration), remapG(iteration), 100);
    }
  );

  useEffect(() => {
    if (!ctx || !width || !height) return;

    const branch = (len: number, weight: number, iteration: number) => {
      if (iteration > config.maxIterations) {
        return;
      }

      ctx.lineWidth = weight;
      ctx.strokeStyle = strokeStyles[iteration];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len);
      ctx.stroke();
      ctx.closePath();

      ctx.translate(0, -len);

      ctx.rotate(angle);
      for (let i = 0; i < config.branches; i++) {
        ctx.save();
        ctx.rotate(configAngle * i);
        branch(
          len * config.lengthFactor,
          weight * config.widthFactor,
          iteration + 1
        );
        ctx.restore();
      }
    };

    // factor by which the tree grows to the max
    const lenFactor = new Array(config.maxIterations)
      .fill(0)
      .reduce((acc, _, i) => acc + Math.pow(config.lengthFactor, i + 1), 0);

    // pad height and width separately
    const padding = 0.05;
    const paddedHeight = height * (1 - padding);
    const paddedWidth = width * (1 - 2 * padding);

    // max possible base size of the trunk in both directions
    const baseHigh = paddedHeight / (1 + lenFactor);
    const baseWide = paddedWidth / (2 * lenFactor);

    // determine which base fits assuming max growth
    const base = baseHigh * (2 * lenFactor) < paddedWidth ? baseHigh : baseWide;

    const drawTree = () => {
      ctx.resetTransform();
      const ratio = Math.ceil(window.devicePixelRatio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, width, height);
      ctx.translate(width / 2, height);

      branch(base, config.rootWidth, 0);
    };

    drawTree();
  }, [config, ctx, width, height, config.animateAngle]);

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => {
      if (newData.option) {
        return configs[newData.option];
      }
      return { ...prevState, ...newData };
    });
  };

  return (
    <>
      <Head>
        <title>Fractal Canopy</title>
        <meta
          name="description"
          content={`An interactive fractal implementation of a Fractal Canopy, also known as a Fractal Tree. A fractal canopy is a fractal generated, by sequentially splitting and branching lines from existing lines. At the end of each line, draw n new lines at certain angles.`}
        />
      </Head>

      <main className={styles.fullScreen}>
        <DatGui data={config} onUpdate={handleUpdate}>
          <DatFolder closed={true} title="Options">
            <DatColor path="background" label="background" />
            <DatSelect
              path="option"
              label="option"
              options={Object.keys(configs)}
            />
            <DatNumber path="angle" label="angle" min={0} max={360} step={1} />
            <DatBoolean path="animateAngle" label="animate angle?" />
            <DatNumber
              path="maxIterations"
              label="maxIterations"
              min={1}
              max={9}
              step={1}
            />
            <DatNumber
              path="branches"
              label="branches"
              min={2}
              max={6}
              step={1}
            />
            <DatNumber
              path="lengthFactor"
              label="lengthFactor"
              min={0}
              max={1}
              step={0.01}
            />
            <DatNumber
              path="widthFactor"
              label="widthFactor"
              min={0}
              max={2}
              step={0.1}
            />
            <DatNumber
              path="rootWidth"
              label="rootWidth"
              min={1}
              max={60}
              step={0.5}
            />
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

export default FractalTree;

export async function getStaticProps() {
  const description = await getDescription("fractal-canopy.md");
  return {
    props: {
      description,
    },
  };
}
