import { useState } from "react";
import { EscapeTimeFractal } from "../components/EscapeTimeFractal";
import {
  createColoring,
  type EscapeTimeColoring,
  updateColoring,
} from "../utils/escapeTimeColoring";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

const Mandelbrot = ({ description }: Props) => {
  const [config, setConfig] = useState<EscapeTimeColoring>(() =>
    createColoring("classic", {
      iterations: 200,
      colorDensity: 1,
      colorOffset: 0.5,
      interior: "#000000",
    }),
  );

  return (
    <EscapeTimeFractal
      formula="mandelbrot"
      title="Mandelbrot Set"
      description={description}
      config={config}
      onUpdate={(newData) => setConfig((old) => updateColoring(old, newData))}
      initialCenter={[-0.5, 0]}
      initialZoomSize={1.5}
      lines={[
        "Drag to pan and use the scroll wheel or a pinch gesture to zoom into the set.",
        "Open the studio to switch between classic coloring algorithms and palettes.",
      ]}
    />
  );
};

export default Mandelbrot;

export async function getStaticProps() {
  const description = await getDescription("mandelbrot.md");
  return {
    props: {
      description,
    },
  };
}
