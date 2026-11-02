// z -> conj(z)^d + c. Rotating c by a (d+1)th of a turn rotates the whole orbit with it.

export type PlanePoint = { x: number; y: number };

export function mirroredPower({ x, y }: PlanePoint, power: number): PlanePoint {
  let re = 1;
  let im = 0;
  for (let i = 0; i < power; i++) {
    const next = re * x + im * y;
    im = im * x - re * y;
    re = next;
  }
  return { x: re, y: im };
}

export function mandelbarOrbit(c: PlanePoint, power: number, limit: number): PlanePoint[] {
  const orbit: PlanePoint[] = [{ x: 0, y: 0 }];
  let z = orbit[0];
  for (let i = 0; i < limit; i++) {
    if (z.x * z.x + z.y * z.y > 4) break;
    const value = mirroredPower(z, power);
    z = { x: value.x + c.x, y: value.y + c.y };
    orbit.push(z);
  }
  return orbit;
}

export function rotatePoint({ x, y }: PlanePoint, turns: number): PlanePoint {
  const angle = 2 * Math.PI * turns;
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  };
}

/** One route per rotated copy of c. */
export function matchingOrbits(c: PlanePoint, power: number, limit: number) {
  return Array.from({ length: power + 1 }, (_, copy) =>
    mandelbarOrbit(rotatePoint(c, copy / (power + 1)), power, limit),
  );
}

/** The edge of the region where a route settles on one point: |2z| = 1 in z = conj(z)^2 + c. */
export function mandelbarBodyEdge(angle: number): PlanePoint {
  return {
    x: Math.cos(angle) / 2 - Math.cos(2 * angle) / 4,
    y: Math.sin(angle) / 2 + Math.sin(2 * angle) / 4,
  };
}

export function mandelbrotBodyEdge(angle: number): PlanePoint {
  return {
    x: Math.cos(angle) / 2 - Math.cos(2 * angle) / 4,
    y: Math.sin(angle) / 2 - Math.sin(2 * angle) / 4,
  };
}

export const MANDELBAR_LESSON_ITERATIONS = 48;

export function mandelbarEscapes(
  c: PlanePoint,
  power: number,
  limit = MANDELBAR_LESSON_ITERATIONS,
) {
  let x = 0;
  let y = 0;
  for (let i = 0; i < limit; i++) {
    let re = 1;
    let im = 0;
    for (let k = 0; k < power; k++) {
      const next = re * x + im * y;
      im = im * x - re * y;
      re = next;
    }
    x = re + c.x;
    y = im + c.y;
    if (x * x + y * y > 16) return i + 1;
  }
  return 0;
}
