export type ComplexPoint = { real: number; imaginary: number };
export type OrbitStep = { iteration: number; point: ComplexPoint; folded?: ComplexPoint };

export function traceTeachingOrbit(
  c: ComplexPoint,
  start: ComplexPoint,
  fold = false,
  limit = 12,
): OrbitStep[] {
  const orbit: OrbitStep[] = [{ iteration: 0, point: start }];
  let z = start;
  for (let i = 0; i < limit; i++) {
    if (Math.hypot(z.real, z.imaginary) > 4) break;
    const input = fold ? { real: Math.abs(z.real), imaginary: Math.abs(z.imaginary) } : z;
    z = {
      real: input.real ** 2 - input.imaginary ** 2 + c.real,
      imaginary: 2 * input.real * input.imaginary + c.imaginary,
    };
    orbit.push({ iteration: i + 1, point: z, folded: fold ? input : undefined });
  }
  return orbit;
}
