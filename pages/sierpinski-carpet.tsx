import React from "react";
import P5 from "p5";
import dynamic from "next/dynamic";
import { NavElement } from "../components/Navbar";
import styles from "../styles/Fullscreen.module.css";
import { getDescription } from "../utils/readFiles";
import { SideDrawer } from "../components/SideDrawer";

class Config {
  public maxIterations = 5;
  public color = "#ffe100";
  public fillColor = "#000000";
  public background = "#252424";
  // public name = "img_name";
  // public save = () => saveCanvas(canvas, this.name, "jpg");
}

let config: Config;
let length: number;

const Sketch = dynamic(() => import("react-p5").then((mod) => mod.default), {
  ssr: false,
});

function drawSierpinskiCarpet(p5: P5) {
  if (window.innerWidth > window.innerHeight) {
    length = window.innerHeight * 0.8;
  } else {
    length = window.innerWidth * 0.8;
  }
  p5.fill(config.fillColor);
  p5.stroke(config.color);
  p5.background(config.background);
  p5.resetMatrix();
  p5.translate(
    (window.innerWidth - length) / 2,
    (window.innerHeight - length) / 2
  );
  SierpinskiCarpet(p5, length, { x: 0, y: 0 }, 0);
}

function SierpinskiCarpet(
  p5: P5,
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
        p5.fill(config.fillColor);
        p5.rect(newCoordinates.x, newCoordinates.y, len / 3, len / 3);
      } else {
        SierpinskiCarpet(p5, len / 3, newCoordinates, iterations + 1);
      }
    }
  }
}

type Props = {
  description: string;
};
const SierpinskiCarpetComponent = ({ description }: Props) => {
  const setup = (p5: P5, canvasParentRef: Element) => {
    p5.createCanvas(window.innerWidth, window.innerHeight).parent(
      canvasParentRef
    );
    config = new Config();
    // const gui = new dat.GUI();
    drawSierpinskiCarpet(p5);

    // const o = gui.addFolder("Options");
    // const iterationController = o.add(config, "maxIterations", 1, 6).step(1);
    // const colorController = o.addColor(config, "color");
    // const fillColorController = o.addColor(config, "fillColor");
    // const backgroundController = o.addColor(config, "background");

    // const saving = gui.addFolder("Save File");
    // saving.add(config, "name");
    // saving.add(config, "save");

    // iterationController.onChange(drawSierpinskiCarpet);
    // colorController.onChange(drawSierpinskiCarpet);
    // fillColorController.onChange(drawSierpinskiCarpet);
    // backgroundController.onChange(drawSierpinskiCarpet);
  };

  const windowResized = (p5: P5) => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    drawSierpinskiCarpet(p5);
  };

  return (
    <main className={styles.fullScreen}>
      <div className={styles.fullScreen}>
        <Sketch setup={setup} windowResized={windowResized} />
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
