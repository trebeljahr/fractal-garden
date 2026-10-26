import { type DeepViewport, rescaleFixed } from "./math";
import { sampleEscape } from "./orbit";

export type PixelRepair = {
  x: number;
  y: number;
  width: number;
  height: number;
  mask: Uint8Array;
};

/** Complete uncertain Burning Ship pixels without one GPU draw per pixel. */
export function summarizeShipPixels(
  view: DeepViewport,
  iterations: number,
  frameWidth: number,
  frameHeight: number,
  tile: PixelRepair,
): Float32Array<ArrayBuffer> {
  const bits = Math.max(view.bits, 2 * Math.ceil(Math.max(0, -view.logZoom)) + 128);
  const exactView = {
    ...view,
    bits,
    x: rescaleFixed(view.x, view.bits, bits),
    y: rescaleFixed(view.y, view.bits, bits),
  };
  const output = new Float32Array(tile.width * tile.height * 4);
  const size = Math.min(frameWidth, frameHeight);
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const pixel = y * tile.width + x;
      if (!tile.mask[pixel]) continue;
      const dx = (2 * (tile.x + x + 0.5) - frameWidth) / size;
      const dy = -(2 * (tile.y + y + 0.5) - frameHeight) / size;
      const sample = sampleEscape(exactView, "burning-ship", [0, 0], iterations, dx, dy);
      const real = sample.z[0][0] * 2 ** sample.z[0][1];
      const imaginary = sample.z[1][0] * 2 ** sample.z[1][1];
      output[pixel * 4] = sample.iteration;
      output[pixel * 4 + 1] = sample.escaped
        ? Math.log(real * real + imaginary * imaginary) / 2
        : 0;
      output[pixel * 4 + 2] = sample.escaped ? 1 : 0;
      output[pixel * 4 + 3] = 1;
    }
  }
  return output;
}
