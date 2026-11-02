import { useState } from "react";
import { EscapeTimeFractal } from "../components/EscapeTimeFractal";
import {
  BURNING_SHIP_COLORING,
  type EscapeTimeColoring,
  updateColoring,
} from "../utils/escapeTimeColoring";
import { BURNING_SHIP_PLACES } from "../utils/escapeTimePlaces";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

const BurningShip = ({ description }: Props) => {
  const [config, setConfig] = useState<EscapeTimeColoring>(BURNING_SHIP_COLORING);

  return (
    <EscapeTimeFractal
      formula="burning-ship"
      title="Burning Ship Fractal"
      description={description}
      config={config}
      onUpdate={(newData) => setConfig((old) => updateColoring(old, newData))}
      onRestore={setConfig}
      initialCenter={[-0.4, -0.543]}
      initialZoomSize={1.55}
      flipY
      views={BURNING_SHIP_PLACES}
      lines={["Drag to pan. Scroll or pinch to zoom."]}
    />
  );
};

export default BurningShip;

export async function getStaticProps() {
  const description = await getDescription("burning-ship.md");
  return {
    props: {
      description,
    },
  };
}
