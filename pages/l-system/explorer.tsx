import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { LSystemExplorer, type Preset } from "../../components/LSystemExplorer";
import { NavElement } from "../../components/Navbar";
import { SideDrawer } from "../../components/SideDrawer";
import styles from "../../styles/Fullscreen.module.css";
import { normalizeSpec } from "../../utils/lsystem/spec";
import { getDescription } from "../../utils/readFiles";

const DEFAULT_PRESET = "tree-3d";

type Props = {
  description: string;
  presets: Preset[];
};

export async function getStaticProps() {
  const dir = join(process.cwd(), "lsystem-presets");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".json"));
  const presets: Preset[] = await Promise.all(
    files.map(async (file) => {
      const { spec } = normalizeSpec(JSON.parse(await readFile(join(dir, file), "utf8")));
      return { slug: file.replace(/\.json$/, ""), spec: JSON.parse(JSON.stringify(spec)) };
    }),
  );

  presets.sort((a, b) =>
    a.slug === DEFAULT_PRESET
      ? -1
      : b.slug === DEFAULT_PRESET
        ? 1
        : a.spec.name.localeCompare(b.spec.name),
  );

  return {
    props: {
      description: await getDescription("l-system-explorer.md"),
      presets,
    },
  };
}

const LSystemExplorerPage = ({ description, presets }: Props) => {
  return (
    <main className={styles.fullScreen}>
      <LSystemExplorer presets={presets} />
      <SideDrawer description={description} />
      <NavElement />
    </main>
  );
};

export default LSystemExplorerPage;
