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
    controlsHint="Shape and growth"
    hint="Drag to rotate. Scroll to zoom."
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
