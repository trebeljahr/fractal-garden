import { useState } from "react";
import { EscapeTimeFractal } from "../components/EscapeTimeFractal";
import {
  type EscapeTimeColoring,
  MANDELBAR_COLORING,
  updateColoring,
} from "../utils/escapeTimeColoring";
import { MANDELBAR_PLACES } from "../utils/escapeTimePlaces";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

const MandelbarSet = ({ description }: Props) => {
  const [config, setConfig] = useState<EscapeTimeColoring>(MANDELBAR_COLORING);

  return (
    <EscapeTimeFractal
      formula="mandelbar"
      title="Mandelbar Set"
      description={description}
      config={config}
      onUpdate={(newData) => setConfig((old) => updateColoring(old, newData))}
      onRestore={setConfig}
      initialCenter={[-0.25, 0]}
      initialZoomSize={2.05}
      views={MANDELBAR_PLACES}
      lines={["Drag to pan. Scroll or pinch to zoom."]}
    />
  );
};

export default MandelbarSet;

export async function getStaticProps() {
  const description = await getDescription("mandelbar-set.md");
  return {
    props: {
      description,
    },
  };
}
