export function radians(angle: number) {
  return (angle * Math.PI) / 180;
}

export function rgb(r: number, g: number, b: number) {
  return `rgb(${r}, ${g}, ${b})`;
}

export function constrain(num: number, min: number, max: number) {
  return Math.min(max, Math.max(num, min));
}
