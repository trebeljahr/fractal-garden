import { RomanescoRows } from "../components/RomanescoRows";
import { SceneFractalExplorer, type SceneVariant } from "../components/SceneFractalExplorer";
import { ROMANESCO_LEAD } from "../utils/lessons/romanescoRows";
import { getDescription } from "../utils/readFiles";

const VARIANTS: Record<string, SceneVariant> = {
  romanesco: {
    label: "Romanesco",
    maxIterations: 6,
    spec: { kind: "romanesco" },
  },
};

const FROM_ABOVE = { rotationX: 90, rotationY: 0 };
const LEAD = { ...ROMANESCO_LEAD, overlay: RomanescoRows };

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
      constructionLead={LEAD}
      constructionView={FROM_ABOVE}
    />
  );
}

export async function getStaticProps() {
  return { props: { description: await getDescription("romanesco.md") } };
}
