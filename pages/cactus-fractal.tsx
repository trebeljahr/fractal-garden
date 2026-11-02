import { useState } from "react";
import { EscapeTimeFractal } from "../components/EscapeTimeFractal";
import {
  CACTUS_COLORING,
  type EscapeTimeColoring,
  updateColoring,
} from "../utils/escapeTimeColoring";
import { CACTUS_PLACES } from "../utils/escapeTimePlaces";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

const CactusFractal = ({ description }: Props) => {
  const [config, setConfig] = useState<EscapeTimeColoring>(CACTUS_COLORING);

  return (
    <EscapeTimeFractal
      formula="cactus"
      title="Cactus Fractal"
      description={description}
      config={config}
      onUpdate={(newData) => setConfig((old) => updateColoring(old, newData))}
      onRestore={setConfig}
      initialCenter={[-0.45, 0]}
      initialZoomSize={1.25}
      maxZoomSize={3}
      views={CACTUS_PLACES}
      lines={["Drag to pan. Scroll or pinch to zoom."]}
    />
  );
};

export default CactusFractal;

export async function getStaticProps() {
  const description = await getDescription("cactus-fractal.md");
  return {
    props: {
      description,
    },
  };
}
