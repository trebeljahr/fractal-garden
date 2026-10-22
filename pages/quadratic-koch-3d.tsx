import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "default";

const MAX_ITERATIONS = 3;

const VARIANTS: Record<Variant, SceneVariant> = {
  default: {
    label: "Quadratic Koch Surface",
    maxIterations: MAX_ITERATIONS,
    spec: { kind: "quadraticKoch3d" },
  },
};

const QuadraticKoch3D = ({ description }: Props) => (
  <SceneFractalExplorer
    description={description}
    storageKey="quadratic-koch-3d"
    title="Quadratic Koch Surface"
    controlsHint="Growth and view"
    hint="Drag to rotate. Scroll to zoom."
    variants={VARIANTS}
    initialVariant="default"
    fillColor="#ff8f7e"
    strokeColor="#ffe4de"
  />
);

export default QuadraticKoch3D;

export async function getStaticProps() {
  const description = await getDescription("quadratic-koch-3d.md");
  return {
    props: {
      description,
    },
  };
}
