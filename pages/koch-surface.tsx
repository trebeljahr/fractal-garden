import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { getMaxIterations } from "../utils/polyhedronFractals";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "triangle" | "tetrahedron";

// The open triangle is drawn from both sides, so budget twice its faces.
const VARIANTS: Record<Variant, SceneVariant> = {
  triangle: {
    label: "Single triangle",
    maxIterations: getMaxIterations(2, 6),
    spec: { kind: "kochSurface", start: "triangle" },
    doubleSided: true,
  },
  tetrahedron: {
    label: "Tetrahedron",
    maxIterations: getMaxIterations(4, 6),
    spec: { kind: "kochSurface", start: "tetrahedron" },
  },
};

const KochSurface = ({ description }: Props) => (
  <SceneFractalExplorer
    description={description}
    storageKey="koch-surface"
    title="Koch Surface"
    controlsTitle="Surface Studio"
    controlsHint="Start from one triangle or a whole tetrahedron, then tune growth and orbit."
    hint="Drag to rotate the surface and use the scroll wheel to dolly closer or farther away."
    variantLabel="Start shape"
    variants={VARIANTS}
    initialVariant="triangle"
    fillColor="#6fc3ff"
    strokeColor="#d8f0ff"
    rotationX={32}
  />
);

export default KochSurface;

export async function getStaticProps() {
  const description = await getDescription("koch-surface.md");
  return {
    props: {
      description,
    },
  };
}
