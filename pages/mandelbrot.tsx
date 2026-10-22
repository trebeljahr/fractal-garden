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
      onRestore={setConfig}
      initialCenter={[-0.5, 0]}
      initialZoomSize={1.5}
      views={[
        {
          label: "Whole set",
          detail: "Return to the starting view.",
          center: [-0.5, 0],
          zoomSize: 1.5,
          iterations: 200,
        },
        {
          label: "Seahorse Valley",
          detail: "Curling tails along the edge of the main body.",
          center: [-0.7463, 0.1102],
          zoomSize: 0.005,
          iterations: 800,
        },
        {
          label: "Double spiral",
          detail: "Two spirals meet in a narrow fold.",
          center: [-0.7612, -0.0852],
          zoomSize: 0.004,
          iterations: 800,
        },
        {
          label: "Miniature Mandelbrot",
          detail: "A smaller copy on the long antenna.",
          center: [-1.7549, 0],
          zoomSize: 0.035,
          iterations: 600,
        },
      ]}
      lines={[
        "Drag to pan and use the scroll wheel or a pinch gesture to zoom into the set.",
        "Open Fractal Studio Controls to switch between classic coloring algorithms and palettes.",
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
