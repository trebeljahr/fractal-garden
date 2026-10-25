import type { GpuSpatialSpec } from "./model";

/** The quadratic construction has a fixed box hull and thirteen square children. */
export function specializeSpatialShader(source: string, spec?: Pick<GpuSpatialSpec, "kind">) {
  if (spec?.kind !== "quadraticKoch3d") return source;
  return source
    .replace("#version 300 es", "#version 300 es\n#define QUADRATIC_KOCH")
    .replace("uniform int u_kind;", "const int u_kind = 2;")
    .replace("uniform int u_childCount;", "const int u_childCount = 13;")
    .replace("uniform int u_hullCount;", "const int u_hullCount = 6;")
    .replace("uniform int u_edgeCount;", "const int u_edgeCount = 4;");
}
