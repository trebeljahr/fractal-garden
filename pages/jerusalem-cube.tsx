import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "default";

const MAX_ITERATIONS = 4;

const VARIANTS: Record<Variant, SceneVariant> = {
  default: { label: "Jerusalem Cube", maxIterations: MAX_ITERATIONS, spec: { kind: "jerusalem" } },
};

const JerusalemCube = ({ description }: Props) => (
  <SceneFractalExplorer
    description={description}
    // Renamed when only the surface started being drawn: budgets timed on the
    // slower renderer would otherwise keep capping the growth.
    storageKey="jerusalem-cube-surface"
    title="Jerusalem Cube"
    controlsHint="Growth and view"
    hint="Drag to rotate. Scroll to zoom."
    variants={VARIANTS}
    initialVariant="default"
    fillColor="#b994f2"
    strokeColor="#efe4ff"
  />
);

export default JerusalemCube;

export async function getStaticProps() {
  const description = await getDescription("jerusalem-cube.md");
  return {
    props: {
      description,
    },
  };
}
