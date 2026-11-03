import {
  type GpuFrame,
  type GpuSpatialSpec,
  type GpuStackOptions,
  selectGpuStackDepth,
} from "./model";

// A level halves a patch. From the largest root inside the horizon, 24 levels end
// below the smallest footprint, and this stack is cleared for every pixel.
const KOCH_STACK_DEPTH = 24;

/** Select a smaller stack only when rank or the pixel footprint proves it safe. */
export function spatialShaderStackDepth(
  frame: Pick<GpuFrame, "shape" | "roots">,
  options: GpuStackOptions = {},
) {
  return selectGpuStackDepth(frame, options);
}

/** Compile only constructions whose fixed-kind arithmetic retains exact pixels. */
export function specializeSpatialShader(
  source: string,
  spec?: Pick<GpuSpatialSpec, "kind">,
  stackDepth: 8 | 12 | 16 | 24 | 40 = 40,
) {
  // Keep the generic sources unchanged; fixed-kind compilation alters their
  // Float32 rounding. Explicit stack overrides are for diagnostic experiments.
  if ((!spec || spec.kind === "jerusalem") && stackDepth === 40) return source;
  let shader = source.replace(
    "#version 300 es",
    `#version 300 es\n#define SPATIAL_STACK_DEPTH ${stackDepth}`,
  );
  // Fixed-kind compilation changes Float32 rounding on this path.
  // Keep its generic arithmetic; exact image comparisons cover it.
  if (!spec || spec.kind === "jerusalem") return shader;
  if (spec.kind === "kochSurface")
    return shader
      .replace("#define SPATIAL_STACK_DEPTH 40", `#define SPATIAL_STACK_DEPTH ${KOCH_STACK_DEPTH}`)
      .replace("#version 300 es", "#version 300 es\n#define KOCH_SURFACE")
      .replace("uniform int u_kind;", "const int u_kind = 1;")
      .replace("uniform int u_childCount;", "const int u_childCount = 6;")
      .replace("uniform int u_hullCount;", "const int u_hullCount = 4;")
      .replace("uniform int u_edgeCount;", "const int u_edgeCount = 3;");
  const kind = spec.kind === "romanesco" ? 3 : spec.kind === "quadraticKoch3d" ? 2 : 0;
  shader = shader.replace("uniform int u_kind;", `const int u_kind = ${kind};`);
  if (spec.kind !== "quadraticKoch3d") return shader;
  return shader
    .replace("#version 300 es", "#version 300 es\n#define QUADRATIC_KOCH")
    .replace("uniform int u_childCount;", "const int u_childCount = 13;")
    .replace("uniform int u_hullCount;", "const int u_hullCount = 6;")
    .replace("uniform int u_edgeCount;", "const int u_edgeCount = 4;");
}
