export type PlaneBounds = readonly [left: number, right: number, bottom: number, top: number];

const DEFAULT_JUMPS = 300;
export const STAYED = -1;

/** The first jump that lands outside the circle of radius 2, or STAYED. */
export function crossingJump(
  cReal: number,
  cImaginary: number,
  startReal: number,
  startImaginary: number,
  limit = DEFAULT_JUMPS,
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
