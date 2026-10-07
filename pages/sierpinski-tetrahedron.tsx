import {
  PolyhedronFractalExplorer,
  type PolyhedronVariant,
} from "../components/PolyhedronFractalExplorer";
import {
  buildFlakeScene,
  getMaxIterations,
  squarePyramidMesh,
  tetrahedronMesh,
} from "../utils/polyhedronFractals";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "tetrahedron" | "squarePyramid";

const tetrahedron = tetrahedronMesh();
const squarePyramid = squarePyramidMesh();

const VARIANTS: Record<Variant, PolyhedronVariant> = {
  tetrahedron: {
    label: "Tetrahedron (4 copies)",
    maxIterations: getMaxIterations(tetrahedron.faces.length, 4),
    buildScene: (iterations) => buildFlakeScene(tetrahedron, 1 / 2, iterations),
  },
  squarePyramid: {
    label: "Square pyramid (5 copies)",
    maxIterations: getMaxIterations(squarePyramid.faces.length, 5),
    buildScene: (iterations) => buildFlakeScene(squarePyramid, 1 / 2, iterations),
  },
};

const SierpinskiTetrahedron = ({ description }: Props) => (
  <PolyhedronFractalExplorer
    description={description}
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
