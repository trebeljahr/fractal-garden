import { useState } from "react";
import { EscapeTimeFractal } from "../components/EscapeTimeFractal";
import { PanelNumber, PanelSelect } from "../components/ExplorerControls";
import {
  createColoring,
  type EscapeTimeColoring,
  updateColoring,
} from "../utils/escapeTimeColoring";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = EscapeTimeColoring & {
  preset: string;
  cReal: number;
  cImag: number;
};

const presets: Record<string, { cReal: number; cImag: number }> = {
  Rabbit: { cReal: -0.70176, cImag: -0.3842 },
  Spiral: { cReal: -0.8, cImag: 0.156 },
  Dendrite: { cReal: 0.285, cImag: 0.01 },
  Cauliflower: { cReal: -0.4, cImag: 0.6 },
};

const presetOptions = Object.keys(presets);
const presetLabels: Record<string, string> = {
  Rabbit: "Rabbit spiral",
  Spiral: "Sea spiral",
  Dendrite: "Electric dendrite",
  Cauliflower: "Cauliflower bloom",
};

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
      initialCenter={[0, 0]}
      initialZoomSize={1.8}
      c={[config.cReal, config.cImag]}
      controlsHint="Start from a preset, nudge c, then pick a look for the coloring."
      controlsTitle="Complex Constant"
      lines={[
        "Drag to pan and use the scroll wheel or a pinch gesture to zoom into the set.",
        "Open the studio to explore presets, reshape the family and recolor it.",
      ]}
    >
      <PanelSelect
        path="preset"
        label="Starting point"
        optionLabels={presetOptions.map((option) => presetLabels[option])}
        options={presetOptions}
      />
      <PanelNumber path="cReal" min={-1} max={1} step={0.001} />
      <PanelNumber path="cImag" min={-1} max={1} step={0.001} />
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
