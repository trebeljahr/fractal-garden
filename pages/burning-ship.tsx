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

const BurningShip = ({ description }: Props) => {
  const [config, setConfig] = useState<EscapeTimeColoring>(() =>
    createColoring("classic", {
      iterations: 200,
      colorDensity: 0.5,
      colorOffset: 0.55,
      interior: "#000000",
    }),
  );

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
      views={[
        {
          label: "Whole ship",
          detail: "Return to the starting view.",
          center: [-0.4, -0.543],
          zoomSize: 1.55,
          iterations: 200,
        },
        {
          label: "Little ship",
          detail: "A small ship with ridged sails.",
          center: [-1.76, -0.03],
          zoomSize: 0.06,
          iterations: 500,
        },
        {
          label: "Along the sails",
          detail: "Explore the little ship's fine vertical folds.",
          center: [-1.76, -0.03],
          zoomSize: 0.012,
          iterations: 900,
        },
      ]}
      lines={[
        "Drag to pan and use the scroll wheel or a pinch gesture to zoom into the ship.",
        "Open Fractal Studio Controls and pick the Inferno look to set the ship on fire.",
      ]}
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
