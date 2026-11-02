import { useState } from "react";
import { ComplexConstantControl } from "../components/ComplexConstantControl";
import { EscapeTimeFractal } from "../components/EscapeTimeFractal";
import { PanelSelect } from "../components/ExplorerControls";
import {
  type EscapeTimeColoring,
  JULIA_COLORING,
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
const presetOptions = [...Object.keys(presets), "Custom"];
const presetLabels: Record<string, string> = { ...JULIA_PRESET_LABELS, Custom: "Custom number" };

const JuliaSet = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>(() => ({
    preset: "Stars",
    cReal: presets.Stars.cReal,
    cImag: presets.Stars.cImag,
    ...JULIA_COLORING,
  }));

  const handleUpdate = (newData: Config) => {
    setConfig((old) => {
      if (newData.preset === "Custom" && old.preset !== "Custom")
        return { ...old, preset: "Custom" };
      if (newData.preset && newData.preset !== "Custom" && newData.preset !== old.preset) {
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
      onRestore={(saved) => setConfig({ ...saved, preset: "Custom" })}
      initialCenter={[0, 0]}
      initialZoomSize={1.8}
      c={[config.cReal, config.cImag]}
      views={JULIA_PLACES}
      shareRules={[
        { path: "cReal", kind: "number", min: -2, max: 2 },
        { path: "cImag", kind: "number", min: -2, max: 2 },
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
        extent={2}
        value={config}
        onChange={(point) => setConfig((current) => ({ ...current, ...point, preset: "Custom" }))}
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
