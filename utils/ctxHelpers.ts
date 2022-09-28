export function radians(angle: number) {
  return (angle * Math.PI) / 180;
}

export function remap(
  value: number,
  l1: number,
  h1: number,
  l2: number,
  h2: number
) {
  return l2 + ((h2 - l2) * (value - l1)) / (h1 - l1);
}

export function rgb(r: number, g: number, b: number) {
  return `rgb(${r}, ${g}, ${b})`;
}
