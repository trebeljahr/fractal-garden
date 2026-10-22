// Coordinates are -1, 0 or 1 within a three-by-three-by-three subdivision.
export function keepMengerCube(x: number, y: number, z: number) {
  return Number(x === 0) + Number(y === 0) + Number(z === 0) <= 1;
}

export function mengerLayers() {
  return [-1, 0, 1].map((z) =>
    [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((x) => ({ x, y, z, kept: keepMengerCube(x, y, z) }))),
  );
}
