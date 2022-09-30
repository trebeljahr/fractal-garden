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
} from "react-dat-gui";
import { useWindowSize } from "../utils/hooks/useWindowResize";
import { Canvas } from "../components/Canvas";
import Head from "next/head";

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
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!config.animateIterations) return;
    const id = setInterval(() => {
      setConfig((old) => {
        return { ...old, maxIterations: (old.maxIterations % 5) + 1 };
      });
    }, 2000);
    return () => clearInterval(id);
  }, [config.animateIterations]);

  useEffect(() => {
    if (!ctx || !width || !height) return;

    let length: number;

    const drawSierpinskiCarpet = () => {
      length = Math.min(window.innerWidth, window.innerHeight) * 0.8;
      ctx.fillStyle = config.holeColor;
      ctx.strokeStyle = config.color;
      ctx.fillStyle = config.background;
      ctx.fillRect(0, 0, width, height);
      ctx.resetTransform();
      const ratio = Math.ceil(window.devicePixelRatio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      ctx.translate(
        (window.innerWidth - length) / 2,
        (window.innerHeight - length) / 2
      );
      sierpinskiCarpet(length, { x: 0, y: 0 }, 0);
    };

    const sierpinskiCarpet = (
      len: number,
      coordinates: { x: number; y: number },
      iterations: number
    ) => {
      if (iterations >= config.maxIterations) return;
      ctx.fillStyle = config.color;
      ctx.fillRect(coordinates.x, coordinates.y, len, len);
      for (let x = 0; x <= 2; x++) {
        for (let y = 0; y <= 2; y++) {
          const newCoordinates = {
            x: coordinates.x + x * (len / 3),
            y: coordinates.y + y * (len / 3),
          };
          if (x === 1 && y === 1) {
            ctx.fillStyle = config.holeColor;
            ctx.fillRect(newCoordinates.x, newCoordinates.y, len / 3, len / 3);
          } else {
            sierpinskiCarpet(len / 3, newCoordinates, iterations + 1);
          }
        }
      }
    };

    drawSierpinskiCarpet();
  }, [config, ctx, width, height, config.animateIterations]);

  const handleUpdate = (newData: Config) => {
    setConfig((prevState) => ({ ...prevState, ...newData }));
  };

  return (
    <>
      <Head>
        <title>Sierpinski Carpet</title>
        <meta
          name="description"
          content={`An interactive fractal implementation the Sierpinski Carpet, a fractal shape with 0 area.`}
        />
      </Head>
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
          <Canvas setCtx={setCtx} width={width} height={height} />
        </div>
        <SideDrawer description={description} />

        <NavElement />
      </main>
    </>
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
