type NumberPair = [number, number];

export type Range2D = { x: NumberPair; y: NumberPair };

export interface Scalable {
  ranges: Range2D;
}

export function limiter(
  { x: [xMin, xMax], y: [yMin, yMax] }: Range2D,
  padding = 0
): (dimensions: NumberPair) => NumberPair {
  const paddingFactor = 1 - 2 * padding;

  const ratio = (xMax - xMin) / (yMax - yMin);
  const isWide = ratio > 1;

  const limit = (dimensions: NumberPair, limitByWidth = isWide): NumberPair => {
    const [width, height] = dimensions;

    if (!limitByWidth) {
      // limit by screen height
      const heightLimit = height * paddingFactor;
      const widthLimit = heightLimit * ratio;
      const exceeding = widthLimit > width * paddingFactor;
      return exceeding ? limit(dimensions, !isWide) : [widthLimit, heightLimit];
    }

    // limit by screen width
    const widthLimit = width * paddingFactor;
    const heightLimit = widthLimit / ratio;
    const exceeding = heightLimit > height * paddingFactor;
    return exceeding ? limit(dimensions, !isWide) : [widthLimit, heightLimit];
  };

  return limit;
}

export function remapper(
  [pMin, pMax]: NumberPair,
  [tMin, tMax]: NumberPair
): (p: number) => number {
  const factor = (tMax - tMin) / (pMax - pMin);
  return (p) => tMin + factor * (p - pMin);
}
