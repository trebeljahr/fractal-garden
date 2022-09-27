import React, { useEffect, useState } from "react";
import P5 from "p5";
import dynamic from "next/dynamic";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { getDescription } from "../utils/readFiles";
import { SideDrawer } from "../components/SideDrawer";
import { P5Instance } from "react-p5-wrapper";
import { DynamicReactP5Wrapper } from "../utils/DynamicP5Wrapper";
import DatGui, {
  DatBoolean,
  DatColor,
  DatFolder,
  DatNumber,
} from "react-dat-gui";

function sketch(p5: P5Instance<{ config: Config }>) {
  let config: Config;
  let length: number;
  p5.updateWithProps = (props) => {
    if (props.config) {
      config = props.config;
      p5.background(config.background);
      drawSierpinskiCarpet();
    }
  };

  p5.setup = () => {
    p5.createCanvas(window.innerWidth, window.innerHeight);
  };

  p5.windowResized = () => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    drawSierpinskiCarpet();
  };

  function drawSierpinskiCarpet() {
    length = Math.min(window.innerWidth, window.innerHeight) * 0.8;
    p5.fill(config.holeColor);
    p5.stroke(config.color);
    p5.background(config.background);
    p5.resetMatrix();
    p5.translate(
      (window.innerWidth - length) / 2,
      (window.innerHeight - length) / 2
    );
    sierpinskiCarpet(length, { x: 0, y: 0 }, 0);
  }

  function sierpinskiCarpet(
    len: number,
    coordinates: { x: number; y: number },
    iterations: number
  ) {
    if (iterations >= config.maxIterations) return;
    p5.fill(config.color);
    p5.rect(coordinates.x, coordinates.y, len, len);
    for (let x = 0; x <= 2; x++) {
      for (let y = 0; y <= 2; y++) {
        const newCoordinates = {
          x: coordinates.x + x * (len / 3),
          y: coordinates.y + y * (len / 3),
        };
        if (x === 1 && y === 1) {
          p5.fill(config.holeColor);
          p5.rect(newCoordinates.x, newCoordinates.y, len / 3, len / 3);
        } else {
          sierpinskiCarpet(len / 3, newCoordinates, iterations + 1);
        }
      }
    }
  }
}
type Config = {
  maxIterations: number;
  animateIterations: boolean;
  color: string;
  holeColor: string;
  background: string;
};

type Props = {
  description: string;
};
const SierpinskiCarpetComponent = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>({
    maxIterations: 5,
    animateIterations: true,
    color: "#ffe100",
    background: "#252424",
    holeColor: "#000000",
  });

  useEffect(() => {
    if (!config.animateIterations) return;
    const id = setInterval(() => {
      setConfig((old) => {
        return { ...old, maxIterations: (old.maxIterations % 5) + 1 };
      });
    }, 2000);
    return () => clearInterval(id);
  }, [config.animateIterations]);

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => ({ ...prevState, ...newData }));
  };

  return (
    <main className={styles.fullScreen}>
      <DatGui data={config} onUpdate={handleUpdate}>
        <DatFolder closed={true} title="Options">
          <DatColor path="background" label="background" />
          <DatNumber
            path="maxIterations"
            label="maxIterations"
            min={1}
            max={5}
            step={1}
          />
          <DatBoolean path="animateIterations" label="animate iterations?" />
          <DatColor path="color" label="color" />
          <DatColor path="holeColor" label="holeColor" />
          <DatColor path="background" label="background" />
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

export default SierpinskiCarpetComponent;

export async function getStaticProps() {
  const description = await getDescription("sierpinski-carpet.md");
  return {
    props: {
      description,
    },
  };
}
