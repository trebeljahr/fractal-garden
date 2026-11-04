import { QuadraticShadow } from "../components/QuadraticShadow";
import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { QUADRATIC_SHADOW_LEAD, SHADOW_LEVELS } from "../utils/lessons/quadraticShadow";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "default";

const MAX_ITERATIONS = 3;

const LEAD = {
  ...QUADRATIC_SHADOW_LEAD,
  flat: {
    when: (view: Record<string, unknown>) => view.show === "shadow",
    max: SHADOW_LEVELS,
    draw: QuadraticShadow,
  },
};

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
    hint="Drag to rotate. Scroll to zoom."
    variants={VARIANTS}
    initialVariant="default"
    fillColor="#ff8f7e"
    strokeColor="#ffe4de"
    constructionLead={LEAD}
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
