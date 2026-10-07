import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "default";

const MAX_ITERATIONS = 3;

const VARIANTS: Record<Variant, SceneVariant> = {
  default: { label: "Menger Sponge", maxIterations: MAX_ITERATIONS, spec: { kind: "menger" } },
};

const MengerSponge = ({ description }: Props) => (
  <SceneFractalExplorer
    description={description}
    storageKey="menger-sponge"
    title="Menger Sponge"
    controlsTitle="Scene Studio"
    controlsHint="Growth, orbit, and rendering layers for the sponge."
    hint="Drag to rotate the sponge and use the scroll wheel to dolly closer or farther away."
    variants={VARIANTS}
    initialVariant="default"
    fillColor="#7ce3c2"
    strokeColor="#d9fff3"
  />
);

export default MengerSponge;

export async function getStaticProps() {
  const description = await getDescription("menger-sponge.md");
  return {
    props: {
      description,
    },
  };
}
