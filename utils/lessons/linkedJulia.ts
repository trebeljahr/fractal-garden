import type { EscapeTimeColoring } from "../escapeTimeColoring";
import { encodeView } from "../explorerShare";
import type { ComplexPoint } from "../orbitLesson";

export const LINKED_LIMIT = 96;
// This lesson allows |c| above 2, where a smaller circle would not guarantee escape.
export const LINKED_RADIUS = 4;
export function juliaExplorerLink(c: ComplexPoint, coloring?: EscapeTimeColoring) {
  const colors = coloring && {
    colorDensity: coloring.colorDensity,
    colorOffset: coloring.colorOffset,
    interior: coloring.interior,
  };
  return (
    "/julia-set" +
    encodeView("/julia-set", { config: { cReal: c.real, cImag: c.imaginary, ...colors } })
  );
}
