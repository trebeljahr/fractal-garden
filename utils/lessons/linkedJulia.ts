import { encodeView } from "../explorerShare";
import type { ComplexPoint } from "../orbitLesson";

export const LINKED_LIMIT = 96;
export function quadraticEscape(c: ComplexPoint, start: ComplexPoint, limit = LINKED_LIMIT) {
  let x = start.real;
  let y = start.imaginary;
  for (let iteration = 0; iteration <= limit; iteration++) {
    if (x * x + y * y > 16) return iteration;
    if (iteration === limit) return null;
    const next = x * x - y * y + c.real;
    y = 2 * x * y + c.imaginary;
    x = next;
  }
  return null;
}

export function juliaExplorerLink(c: ComplexPoint) {
  return (
    "/julia-set" +
    encodeView("/julia-set", {
      config: { cReal: c.real, cImag: c.imaginary },
      viewport: { center: [0, 0], zoomSize: 1.8 },
    })
  );
}
