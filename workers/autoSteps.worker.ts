import { probeStepLimit } from "../utils/deepZoom/autoSteps";

self.onmessage = (event) => {
  const { id, ...probe } = event.data;
  self.postMessage({ id, limit: probeStepLimit(probe) });
};
