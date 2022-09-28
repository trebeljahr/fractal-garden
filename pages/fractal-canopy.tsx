import React, { useEffect, useState } from "react";
import P5 from "p5";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { getDescription } from "../utils/readFiles";
import { SideDrawer } from "../components/SideDrawer";
import { P5Instance } from "react-p5-wrapper";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
  DatSelect,
} from "react-dat-gui";
import { DynamicReactP5Wrapper } from "../utils/DynamicP5Wrapper";

const defaultTree = {
  angle: 43,
  animateAngle: true,
  maxIterations: 7,
  branches: 3,
  background: "#252424",
  rootLength: 2.5,
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
  rootLength: 2,
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
  rootLength: 2.5,
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
  rootLength: 2.5,
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
  rootLength: 2.5,
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
  rootLength: 2.5,
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
  rootLength: number;
  lengthFactor: number;
  widthFactor: number;
  rootWidth: number;
  option?: string;
};

function sketch(p5: P5Instance<{ config: Config }>) {
  let config: Config;
  p5.updateWithProps = (props) => {
    if (props.config) {
      config = props.config;
      drawTree();
    }
  };

  function drawTree() {
    p5.background(config.background);
    p5.resetMatrix();
    p5.translate(p5.width / 2, p5.height);
    branch(window.innerHeight / config.rootLength, config.rootWidth, 0);
  }

  function branch(len: number, weight: number, iteration: number) {
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
        len * config.lengthFactor,
        weight * config.widthFactor,
        iteration + 1
      );
      p5.pop();
    }
  }

  p5.setup = () => {
    p5.createCanvas(window.innerWidth, window.innerHeight);
    p5.angleMode(p5.DEGREES);
  };

  p5.windowResized = () => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    drawTree();
  };
}

type Props = {
  description: string;
};

const FractalTree = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>(defaultTree);

  useEffect(() => {
    if (!config.animateAngle) return;
    const id = setInterval(() => {
      setConfig((old) => {
        return { ...old, angle: (old.angle + 1) % 360 };
      });
    }, 100);
    return () => clearInterval(id);
  }, [config.animateAngle]);

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => {
      if (newData.option) {
        return configs[newData.option];
      }
      return { ...prevState, ...newData };
    });
  };

  return (
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
        <DynamicReactP5Wrapper sketch={sketch} config={config} />
      </div>
      <SideDrawer description={description} />
      <NavElement />
    </main>
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
