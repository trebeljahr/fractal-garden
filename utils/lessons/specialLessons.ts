export function bulbPower(radius: number, theta: number, phi: number, power: number) {
  const r = radius ** power;
  return [
    r * Math.sin(power * theta) * Math.cos(power * phi),
    r * Math.sin(power * theta) * Math.sin(power * phi),
    r * Math.cos(power * theta),
  ];
}

export type BulbPoint = [number, number, number];
export const ROUTE_JUMPS = 24;

export function bulbJump(z: BulbPoint, c: BulbPoint, power: number): BulbPoint {
  const radius = Math.hypot(...z);
  if (radius === 0) return c;
  const theta = Math.acos(Math.max(-1, Math.min(1, z[2] / radius)));
  const [x, y, w] = bulbPower(radius, theta, Math.atan2(z[1], z[0]), power);
  return [x + c[0], y + c[1], w + c[2]];
}

/** Jump 1 lands on the chosen position, so the route starts there. It stops past distance 2. */
export function bulbRoute(c: BulbPoint, power: number, jumps = ROUTE_JUMPS) {
  const route = [c];
  for (let jump = 1; jump < jumps && Math.hypot(...route[jump - 1]) <= 2; jump++)
    route.push(bulbJump(route[jump - 1], c, power));
  return route;
}

/** Turns a point around the vertical axis by this share of a full circle. */
export function turnAroundAxis([x, y, z]: BulbPoint, turn: number): BulbPoint {
  const cos = Math.cos(2 * Math.PI * turn);
  const sin = Math.sin(2 * Math.PI * turn);
  return [x * cos - y * sin, x * sin + y * cos, z];
}
