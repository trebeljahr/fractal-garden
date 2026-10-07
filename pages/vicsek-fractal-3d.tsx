import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "default";

const MAX_ITERATIONS = 4;

const VARIANTS: Record<Variant, SceneVariant> = {
  default: {
    label: "3D Vicsek Fractal",
    maxIterations: MAX_ITERATIONS,
    spec: { kind: "vicsek3d" },
  },
};

const VicsekFractal3D = ({ description }: Props) => (
  <SceneFractalExplorer
    description={description}
    storageKey="vicsek-fractal-3d"
    title="3D Vicsek Fractal"
    controlsTitle="Scene Studio"
    controlsHint="Growth, framing, and rendering layers for the cubic cross."
    hint="Drag to orbit around the fractal and use the scroll wheel to dolly in or back out."
    variants={VARIANTS}
    initialVariant="default"
    fillColor="#f5b86d"
    strokeColor="#ffe8c5"
    rotationX={26}
    rotationY={30}
    lineWidth={0.8}
    rotationSpeed={0.45}
  />
);

export default VicsekFractal3D;

export async function getStaticProps() {
  const description = await getDescription("vicsek-fractal-3d.md");
  return {
    props: {
      description,
    },
  };
}
