import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import {
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

const VARIANTS: Record<Variant, SceneVariant> = {
  octahedron: {
    label: "Octahedron flake (6 copies)",
    maxIterations: getMaxIterations(octahedron.faces.length, 6),
    spec: { kind: "flake", mesh: "octahedron", ratio: 1 / 2 },
  },
  dodecahedron: {
    label: "Dodecahedron flake (20 copies)",
    maxIterations: getMaxIterations(dodecahedron.faces.length, 20),
    spec: { kind: "flake", mesh: "dodecahedron", ratio: 1 / (2 + PHI) },
  },
  icosahedron: {
    label: "Icosahedron flake (12 copies)",
    maxIterations: getMaxIterations(icosahedron.faces.length, 12),
    spec: { kind: "flake", mesh: "icosahedron", ratio: 1 / (1 + PHI) },
  },
};

const PolyhedronFlake = ({ description }: Props) => (
  <SceneFractalExplorer
    description={description}
    storageKey="polyhedron-flake"
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
