import { useState } from "react";
import { ComplexConstantControl } from "../components/ComplexConstantControl";
import { EscapeTimeFractal } from "../components/EscapeTimeFractal";
import { PanelNumber, PanelSelect } from "../components/ExplorerControls";
import {
  BARNSLEY_TREE_COLORING,
  type EscapeTimeColoring,
  updateColoring,
} from "../utils/escapeTimeColoring";
import {
  BARNSLEY_TREE_MIN_LOG_ZOOM,
  BARNSLEY_TREE_PLACES,
  BARNSLEY_TREE_PRESET_LABELS,
  BARNSLEY_TREE_PRESETS,
} from "../utils/escapeTimePlaces";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Config = EscapeTimeColoring & {
  preset: string;
  cReal: number;
  cImag: number;
  escapeRadius: number;
};

const presets = BARNSLEY_TREE_PRESETS;
const presetOptions = [...Object.keys(presets), "Custom"];
const presetLabels: Record<string, string> = {
  ...BARNSLEY_TREE_PRESET_LABELS,
  Custom: "Custom number",
};

const BarnsleyTree = ({ description }: Props) => {
  const [config, setConfig] = useState<Config>(() => ({
    preset: "Scrolls",
    ...presets.Scrolls,
    ...BARNSLEY_TREE_COLORING,
  }));

  const handleUpdate = (newData: Config) => {
    setConfig((old) => {
      if (newData.preset === "Custom" && old.preset !== "Custom")
        return { ...old, preset: "Custom" };
      if (newData.preset && newData.preset !== "Custom" && newData.preset !== old.preset) {
        return { ...old, preset: newData.preset, ...presets[newData.preset] };
      }
      return updateColoring(old, newData);
    });
  };

  return (
    <EscapeTimeFractal
      formula="barnsley-tree"
      title="Barnsley's Tree"
      description={description}
      config={config}
      onUpdate={handleUpdate}
      onRestore={(saved) => setConfig({ ...saved, preset: "Custom" })}
      initialCenter={[0, 0]}
      initialZoomSize={2.3}
      maxZoomSize={8}
      minLogZoom={BARNSLEY_TREE_MIN_LOG_ZOOM}
      c={[config.cReal, config.cImag]}
      views={BARNSLEY_TREE_PLACES}
      placeMatches={(view) =>
        !view.parameters ||
        (Math.abs(view.parameters.cReal - config.cReal) < 1e-12 &&
          Math.abs(view.parameters.cImag - config.cImag) < 1e-12 &&
          view.parameters.escapeRadius === config.escapeRadius)
      }
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
      <PanelNumber path="escapeRadius" label="Escape radius" min={1} max={32} step={0.1} />
    </EscapeTimeFractal>
  );
};

export default BarnsleyTree;

export async function getStaticProps() {
  const description = await getDescription("barnsley-tree.md");
  return {
    props: {
      description,
    },
  };
}
