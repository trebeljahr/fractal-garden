import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { getDescription } from "../utils/readFiles";

const VARIANTS: Record<string, SceneVariant> = {
  romanesco: {
    label: "Romanesco",
    maxIterations: 4,
    spec: { kind: "romanesco" },
  },
};

export default function Romanesco({ description }: { description: string }) {
  return (
    <SceneFractalExplorer
      description={description}
      storageKey="romanesco"
      title="Romanesco"
      hint="Follow the spirals into smaller florets."
      variants={VARIANTS}
      initialVariant="romanesco"
      fillColor="#c4e87c"
      strokeColor="#d8e99c"
      rotationX={65}
      rotationY={28}
      showWireframe={false}
      lighting="classic"
    />
  );
}

export async function getStaticProps() {
  return { props: { description: await getDescription("romanesco.md") } };
}
