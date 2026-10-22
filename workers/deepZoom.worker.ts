import { buildReference } from "../utils/deepZoom/orbit";

self.onmessage = (event) => {
  const { id, view, formula, c, iterations } = event.data;
  try {
    const reference = buildReference(view, formula, c, iterations);
    const transfer = [reference.orbit.buffer];
    if (reference.critical) transfer.push(reference.critical.orbit.buffer);
    self.postMessage({ id, reference }, { transfer });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "Could not refine this view.",
    });
  }
};
