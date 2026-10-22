export type ForkPoint = { x: number; y: number };

export function pythagorasFork(angle: number) {
  const radians = (angle * Math.PI) / 180;
  const a = { x: 0, y: 0 };
  const b = { x: 1, y: 0 };
  const tip = { x: Math.cos(radians) ** 2, y: Math.cos(radians) * Math.sin(radians) };
  const square = (start: ForkPoint, end: ForkPoint) => {
    const normal = { x: start.y - end.y, y: end.x - start.x };
    return [
      start,
      end,
      { x: end.x + normal.x, y: end.y + normal.y },
      { x: start.x + normal.x, y: start.y + normal.y },
    ];
  };
  return {
    parent: [a, { x: 0, y: -1 }, { x: 1, y: -1 }, b],
    triangle: [a, tip, b],
    left: square(a, tip),
    right: square(tip, b),
    leftArea: Math.cos(radians) ** 2,
    rightArea: Math.sin(radians) ** 2,
  };
}
