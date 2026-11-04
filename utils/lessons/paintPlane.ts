import type { ComplexPoint } from "../orbitLesson";

export type PlaneBounds = readonly [left: number, right: number, bottom: number, top: number];
export type PaintGrid = {
  columns: number;
  rows: number;
  bounds: PlaneBounds;
  /** The jump that crossed the escape circle, or STAYED, or UNTESTED. */
  steps: Int16Array;
  /** 1 for a cell already drawn as part of the edge. */
  inked: Uint8Array;
};

// Enough to show the shape. A few points near the edge need more and are drawn as staying.
export const PAINT_JUMPS = 300;
export const STAYED = -1;
export const UNTESTED = -2;

/** The first jump that lands outside the circle of radius 2, or STAYED. */
export function crossingJump(
  cReal: number,
  cImaginary: number,
  startReal: number,
  startImaginary: number,
  limit = PAINT_JUMPS,
) {
  let real = startReal;
  let imaginary = startImaginary;
  for (let jump = 0; jump <= limit; jump++) {
    const squareReal = real * real;
    const squareImaginary = imaginary * imaginary;
    if (squareReal + squareImaginary > 4) return jump;
    imaginary = 2 * real * imaginary + cImaginary;
    real = squareReal - squareImaginary + cReal;
  }
  return STAYED;
}

export function createGrid(bounds: PlaneBounds, columns: number): PaintGrid {
  const [left, right, bottom, top] = bounds;
  const rows = Math.round((columns * (top - bottom)) / (right - left));
  const cells = columns * rows;
  return {
    columns,
    rows,
    bounds,
    steps: new Int16Array(cells).fill(UNTESTED),
    inked: new Uint8Array(cells),
  };
}

function testCell(grid: PaintGrid, column: number, row: number) {
  const index = row * grid.columns + column;
  if (grid.steps[index] === UNTESTED) {
    const [left, right, bottom, top] = grid.bounds;
    grid.steps[index] = crossingJump(
      left + ((column + 0.5) / grid.columns) * (right - left),
      top - ((row + 0.5) / grid.rows) * (top - bottom),
      0,
      0,
    );
  }
  return grid.steps[index];
}

/** Inks a cell that stayed and touches one that crossed. Returns its index, or -1. */
function inkCell(grid: PaintGrid, column: number, row: number) {
  const index = row * grid.columns + column;
  if (grid.inked[index] || testCell(grid, column, row) !== STAYED) return -1;
  for (const [x, y] of [
    [column - 1, row],
    [column + 1, row],
    [column, row - 1],
    [column, row + 1],
  ]) {
    if (x < 0 || y < 0 || x >= grid.columns || y >= grid.rows) continue;
    if (testCell(grid, x, y) !== STAYED) {
      grid.inked[index] = 1;
      return index;
    }
  }
  return -1;
}

/** Inks the edge within radius of the point. Returns the cells it inked. */
export function outlineDab(grid: PaintGrid, center: ComplexPoint, radius: number) {
  const [left, right, bottom, top] = grid.bounds;
  const unit = grid.columns / (right - left);
  const column = (center.real - left) * unit;
  const row = (top - center.imaginary) * (grid.rows / (top - bottom));
  const reach = radius * unit;
  const changed: number[] = [];
  const firstRow = Math.max(0, Math.floor(row - reach));
  const lastRow = Math.min(grid.rows - 1, Math.ceil(row + reach));
  for (let y = firstRow; y <= lastRow; y++) {
    const firstColumn = Math.max(0, Math.floor(column - reach));
    const lastColumn = Math.min(grid.columns - 1, Math.ceil(column + reach));
    for (let x = firstColumn; x <= lastColumn; x++) {
      if ((x + 0.5 - column) ** 2 + (y + 0.5 - row) ** 2 > reach * reach) continue;
      const index = inkCell(grid, x, y);
      if (index >= 0) changed.push(index);
    }
  }
  return changed;
}

/** Dabs along a straight line, so a fast pointer still inks every edge it crosses. */
export function outlineStroke(
  grid: PaintGrid,
  from: ComplexPoint,
  to: ComplexPoint,
  radius: number,
) {
  const length = Math.hypot(to.real - from.real, to.imaginary - from.imaginary);
  const dabs = Math.max(1, Math.ceil(length / (radius / 2)));
  const changed: number[] = [];
  for (let dab = 1; dab <= dabs; dab++) {
    const t = dab / dabs;
    const center = {
      real: from.real + (to.real - from.real) * t,
      imaginary: from.imaginary + (to.imaginary - from.imaginary) * t,
    };
    for (const index of outlineDab(grid, center, radius)) changed.push(index);
  }
  return changed;
}

export function outlineRow(grid: PaintGrid, row: number) {
  const changed: number[] = [];
  for (let column = 0; column < grid.columns; column++) {
    const index = inkCell(grid, column, row);
    if (index >= 0) changed.push(index);
  }
  return changed;
}
