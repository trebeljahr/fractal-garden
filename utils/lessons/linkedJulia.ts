import { encodeView } from "../explorerShare";
import type { ComplexPoint } from "../orbitLesson";

export const LINKED_LIMIT = 96;
// This lesson allows |c| above 2, where a smaller circle would not guarantee escape.
export const LINKED_RADIUS = 4;
export function juliaExplorerLink(c: ComplexPoint) {
  return (
    "/julia-set" +
    encodeView("/julia-set", {
      config: { cReal: c.real, cImag: c.imaginary },
      viewport: { center: [0, 0], zoomSize: 1.8 },
    })
  );
}
