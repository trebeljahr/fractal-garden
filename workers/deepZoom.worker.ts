import type { DeepViewport } from "../utils/deepZoom/math";
import { buildReference } from "../utils/deepZoom/orbit";

self.onmessage = (event) => {
  const { id, view, formula, c, iterations, tiles } = event.data;
  try {
    const views: DeepViewport[] = tiles
      ? tiles.map((repair: { view: DeepViewport }) => repair.view)
      : [view];
    const references = views.map((target) => buildReference(target, formula, c, iterations));
    const transfer: ArrayBuffer[] = [];
    for (const reference of references) {
      transfer.push(reference.orbit.buffer);
      if (reference.critical) transfer.push(reference.critical.orbit.buffer);
    }
    self.postMessage({ id, references }, { transfer });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "Could not refine this view.",
    });
  }
};
