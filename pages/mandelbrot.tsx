import { useState } from "react";
import { EscapeTimeFractal } from "../components/EscapeTimeFractal";
import {
  createColoring,
  type EscapeTimeColoring,
  updateColoring,
} from "../utils/escapeTimeColoring";
import { MANDELBROT_PLACES } from "../utils/escapeTimePlaces";
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
      views={MANDELBROT_PLACES}
      lines={["Drag to pan. Scroll or pinch to zoom."]}
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
