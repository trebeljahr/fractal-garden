import {
  PolyhedronFractalExplorer,
  type PolyhedronVariant,
} from "../components/PolyhedronFractalExplorer";
import {
  buildFlakeScene,
  dodecahedronMesh,
  getMaxIterations,
  icosahedronMesh,
  octahedronMesh,
} from "../utils/polyhedronFractals";
import { getDescription } from "../utils/readFiles";

type Props = {
  description: string;
};

type Variant = "octahedron" | "dodecahedron" | "icosahedron";

const PHI = (1 + Math.sqrt(5)) / 2;

const octahedron = octahedronMesh();
const dodecahedron = dodecahedronMesh();
const icosahedron = icosahedronMesh();

const VARIANTS: Record<Variant, PolyhedronVariant> = {
  octahedron: {
    label: "Octahedron flake (6 copies)",
    maxIterations: getMaxIterations(octahedron.faces.length, 6),
    buildScene: (iterations) => buildFlakeScene(octahedron, 1 / 2, iterations),
  },
  dodecahedron: {
    label: "Dodecahedron flake (20 copies)",
    maxIterations: getMaxIterations(dodecahedron.faces.length, 20),
    buildScene: (iterations) => buildFlakeScene(dodecahedron, 1 / (2 + PHI), iterations),
  },
  icosahedron: {
    label: "Icosahedron flake (12 copies)",
    maxIterations: getMaxIterations(icosahedron.faces.length, 12),
    buildScene: (iterations) => buildFlakeScene(icosahedron, 1 / (1 + PHI), iterations),
  },
};

const PolyhedronFlake = ({ description }: Props) => (
  <PolyhedronFractalExplorer
    description={description}
    title="Polyhedron Flake"
    controlsTitle="Flake Studio"
    controlsHint="Pick a Platonic solid, then tune growth, orbit, and linework."
    hint="Drag to rotate the flake and use the scroll wheel to dolly closer or farther away."
    variantLabel="Solid"
    variants={VARIANTS}
    initialVariant="icosahedron"
    fillColor="#b49cff"
    strokeColor="#efe8ff"
  />
);

export default PolyhedronFlake;

export async function getStaticProps() {
  const description = await getDescription("polyhedron-flake.md");
  return {
    props: {
      description,
    },
  };
}
