import type { ComplexPoint } from "../orbitLesson";
import type { PlaneBounds } from "./paintPlane";

export const ORBIT_JUMPS = 300;
// The orbit keeps drawing past the circle of radius 2, so it visibly leaves the plane.
export const OFF_PLANE_RADIUS = 8;
// Past this size, a choice of c could send a point outside radius 2 back inside.
export const LARGEST_C = 2;

// Numbers past these limits would read as exponents in the list of answers.
const SMALLEST_ANSWER = 1e-6;
const LARGEST_ANSWER = 1e9;

/** The start and its repeated squares, stopping before an answer gets unreadable. */
export function squaringChain(start: number, most = 6) {
  const chain = [start];
  let x = start;
  while (chain.length < most) {
    const next = x * x;
    if (next !== 0 && (next < SMALLEST_ANSWER || next > LARGEST_ANSWER)) break;
    chain.push(next);
    x = next;
  }
  return chain;
}

export function squaringFate(start: number) {
  const size = Math.abs(start);
  if (size === 0) return "Stays on 0";
  if (start === 1) return "Stays on 1";
  if (start === -1) return "Lands on 1 and stays";
  return size < 1 ? "Heads toward 0" : "Grows without limit";
}

export function clampToDisk(point: ComplexPoint, radius: number) {
  const size = Math.hypot(point.real, point.imaginary);
  if (size <= radius) return point;
  return { real: (point.real / size) * radius, imaginary: (point.imaginary / size) * radius };
}

// Cells a point may land on before the search stops following it. One keeps the dots even.
const VISITS_PER_CELL = 1;
const MOST_POINTS = 400000;

/**
 * Marks the cells on the Julia set by running the jumps backward. Each point has two square
 * roots of z - c, and the set contains both of them whenever it contains the point.
 */
export function juliaEdge(c: ComplexPoint, bounds: PlaneBounds, columns: number, rows: number) {
  const [left, right, bottom, top] = bounds;
  const hits = new Uint8Array(columns * rows);
  const root = squareRoot(1 - 4 * c.real, -4 * c.imaginary);
  // This fixed point pushes nearby points away, so it is always on the set.
  const stack: number[] = [(1 + root.real) / 2, root.imaginary / 2];
  let points = 0;
  while (stack.length && points++ < MOST_POINTS) {
    const imaginary = stack.pop() as number;
    const real = stack.pop() as number;
    const column = Math.floor(((real - left) / (right - left)) * columns);
    const row = Math.floor(((top - imaginary) / (top - bottom)) * rows);
    if (column >= 0 && column < columns && row >= 0 && row < rows) {
      const cell = row * columns + column;
      if (hits[cell] >= VISITS_PER_CELL) continue;
      hits[cell]++;
    }
    const next = squareRoot(real - c.real, imaginary - c.imaginary);
    stack.push(next.real, next.imaginary, -next.real, -next.imaginary);
  }
  return hits;
}

function squareRoot(real: number, imaginary: number) {
  const size = Math.hypot(real, imaginary);
  const rootReal = Math.sqrt((size + real) / 2);
  const rootImaginary = Math.sqrt(Math.max(0, (size - real) / 2));
  return { real: rootReal, imaginary: imaginary < 0 ? -rootImaginary : rootImaginary };
}
