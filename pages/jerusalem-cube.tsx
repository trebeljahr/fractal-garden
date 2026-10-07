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
    storageKey="jerusalem-cube"
    title="Jerusalem Cube"
    controlsTitle="Scene Studio"
    controlsHint="Growth, orbit, and rendering layers for the cube."
    hint="Drag to rotate the cube and use the scroll wheel to dolly closer or farther away."
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
