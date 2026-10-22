import { useState } from "react";
import { ComplexConstantControl } from "../components/ComplexConstantControl";
import { EscapeTimeFractal } from "../components/EscapeTimeFractal";
import { PanelSelect } from "../components/ExplorerControls";
import {
  createColoring,
  type EscapeTimeColoring,
  updateColoring,
} from "../utils/escapeTimeColoring";
import { JULIA_PLACES, JULIA_PRESET_LABELS, JULIA_PRESETS } from "../utils/escapeTimePlaces";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = EscapeTimeColoring & {
  preset: string;
  cReal: number;
  cImag: number;
};

const presets = JULIA_PRESETS;
const presetOptions = Object.keys(presets);
const presetLabels = JULIA_PRESET_LABELS;

const JuliaSet = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>(() => ({
    preset: "Rabbit",
    cReal: presets.Rabbit.cReal,
    cImag: presets.Rabbit.cImag,
    ...createColoring("classic", {
      iterations: 200,
      colorDensity: 0.45,
      colorOffset: 0.45,
      interior: "#252424",
    }),
  }));

  const handleUpdate = (newData: Config) => {
    setConfig((old) => {
      if (newData.preset && newData.preset !== old.preset) {
        return {
          ...old,
          preset: newData.preset,
          cReal: presets[newData.preset].cReal,
          cImag: presets[newData.preset].cImag,
        };
      }

      return updateColoring(old, newData);
    });
  };

  return (
    <EscapeTimeFractal
      formula="julia"
      title="Julia Set"
      description={description}
      config={config}
      onUpdate={handleUpdate}
      onRestore={setConfig}
      initialCenter={[0, 0]}
      initialZoomSize={1.8}
      c={[config.cReal, config.cImag]}
      views={JULIA_PLACES}
      shareRules={[
        { path: "cReal", kind: "number", min: -1, max: 1 },
        { path: "cImag", kind: "number", min: -1, max: 1 },
      ]}
      lines={["Drag to pan. Scroll or pinch to zoom."]}
    >
      <PanelSelect
        path="preset"
        label="Starting point"
        optionLabels={presetOptions.map((option) => presetLabels[option])}
        options={presetOptions}
      />
      <ComplexConstantControl
        value={config}
        onChange={(point) => setConfig((current) => ({ ...current, ...point }))}
      />
    </EscapeTimeFractal>
  );
};

export default JuliaSet;

export async function getStaticProps() {
  const description = await getDescription("julia-set.md");
  return {
    props: {
      description,
    },
  };
}
