import { PATTERNS, type VoxelPattern } from "./camera";

/** Compile out the pattern branch repeated by every traversal/occupancy query. */
export function specializeVoxelShader(source: string, pattern: VoxelPattern) {
  return source.replace(
    "uniform int u_pattern;",
    `const int u_pattern = ${PATTERNS.indexOf(pattern)};`,
  );
}
