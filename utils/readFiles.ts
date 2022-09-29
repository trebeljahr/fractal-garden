import { readFile } from "fs/promises";
import { join } from "path";

export function getDescription(fileName: string) {
  return readFile(
    join(process.cwd(), "fractal-descriptions", fileName),
    "utf-8"
  );
}
