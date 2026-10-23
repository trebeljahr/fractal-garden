export type OrbitPoint = { x: number; y: number };
export function histogramOrbit(c: OrbitPoint, limit = 80) {
  const points: OrbitPoint[] = [];
  let x = 0,
    y = 0;
  for (let i = 0; i < limit; i++) {
    const next = x * x - y * y + c.x;
    y = 2 * x * y + c.y;
    x = next;
    points.push({ x, y });
    if (x * x + y * y > 4) return { points, escaped: true };
  }
  return { points, escaped: false };
}
export function buddhaSamples(count = 2000) {
  let seed = 127;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () =>
    histogramOrbit({ x: -2 + 3 * random(), y: -1.5 + 3 * random() }),
  );
}
export function bulbPower(radius: number, theta: number, phi: number, power: number) {
  const r = radius ** power;
  return [
    r * Math.sin(power * theta) * Math.cos(power * phi),
    r * Math.sin(power * theta) * Math.sin(power * phi),
    r * Math.cos(power * theta),
  ];
}
