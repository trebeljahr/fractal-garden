import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { getMaxIterations, squarePyramidMesh, tetrahedronMesh } from "../utils/polyhedronFractals";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "tetrahedron" | "squarePyramid";

const tetrahedron = tetrahedronMesh();
const squarePyramid = squarePyramidMesh();

const VARIANTS: Record<Variant, SceneVariant> = {
  tetrahedron: {
    label: "Tetrahedron (4 copies)",
    maxIterations: getMaxIterations(tetrahedron.faces.length, 4),
    spec: { kind: "flake", mesh: "tetrahedron", ratio: 1 / 2 },
  },
  squarePyramid: {
    label: "Square pyramid (5 copies)",
    maxIterations: getMaxIterations(squarePyramid.faces.length, 5),
    spec: { kind: "flake", mesh: "squarePyramid", ratio: 1 / 2 },
  },
};

const SierpinskiTetrahedron = ({ description }: Props) => (
  <SceneFractalExplorer
    description={description}
    storageKey="sierpinski-tetrahedron"
    title="Sierpinski Tetrahedron"
    controlsTitle="Pyramid Studio"
    controlsHint="Pick a base solid, then tune growth, orbit, and linework."
    hint="Drag to rotate the pyramid and use the scroll wheel to dolly closer or farther away."
    variantLabel="Base solid"
    variants={VARIANTS}
    initialVariant="tetrahedron"
    fillColor="#f2a65a"
    strokeColor="#ffe3c2"
    rotationX={18}
  />
);

export default SierpinskiTetrahedron;

export async function getStaticProps() {
  const description = await getDescription("sierpinski-tetrahedron.md");
  return {
    props: {
      description,
    },
  };
}
