import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { MOSELY_PLACES } from "../utils/moselyPlaces";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "lighter" | "heavier";

const MAX_ITERATIONS = 3;

const VARIANTS: Record<Variant, SceneVariant> = {
  lighter: {
    label: "Airy lattice",
    maxIterations: MAX_ITERATIONS,
    spec: { kind: "mosely", variant: "lighter" },
  },
  heavier: {
    label: "Dense lattice",
    maxIterations: MAX_ITERATIONS,
    spec: { kind: "mosely", variant: "heavier" },
  },
};

const MoselySnowflake = ({ description }: Props) => (
  <SceneFractalExplorer
    description={description}
    storageKey="mosely-snowflake"
    title="Mosely Snowflake"
    hint="Drag to rotate. Scroll to zoom."
    variantLabel="Snowflake type"
    variants={VARIANTS}
    initialVariant="lighter"
    fillColor="#8fb0ff"
    strokeColor="#dce9ff"
    rotationX={28}
    rotationY={32}
    rotationSpeed={0.45}
    places={MOSELY_PLACES}
  />
);

export default MoselySnowflake;

export async function getStaticProps() {
  const description = await getDescription("mosely-snowflake.md");
  return {
    props: {
      description,
    },
  };
}
