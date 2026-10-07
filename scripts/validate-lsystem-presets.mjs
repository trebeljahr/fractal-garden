import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeSpec, slugify } from "../utils/lsystem/spec.ts";

// Presets arrive as pull requests from the L-system explorer, so the build
// rejects any file the explorer itself would not accept.
const PRESET_DIR = join(process.cwd(), "lsystem-presets");

const files = (await readdir(PRESET_DIR)).filter((file) => file.endsWith(".json")).sort();
const problems = [];
const names = new Map();

for (const file of files) {
  const source = await readFile(join(PRESET_DIR, file), "utf8");
  let raw;

  try {
    raw = JSON.parse(source);
  } catch (error) {
    problems.push(`${file}: invalid JSON (${error.message})`);
    continue;
  }

  const { spec, errors } = normalizeSpec(raw);
  for (const error of errors) problems.push(`${file}: ${error}`);

  if (file !== `${slugify(file.replace(/\.json$/, ""))}.json`) {
    problems.push(`${file}: file names must be lowercase words joined by dashes.`);
  }

  const key = spec.name.toLowerCase();
  if (names.has(key)) problems.push(`${file}: same name as ${names.get(key)}.`);
  names.set(key, file);
}

if (problems.length > 0) {
  console.error(`Invalid L-system presets:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}

console.log(`Validated ${files.length} L-system presets.`);
