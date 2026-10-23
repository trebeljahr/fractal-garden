import { buildSpatialFrame, type SpatialRequest } from "../utils/spatial/geometry";

self.onmessage = (event: MessageEvent<{ id: number; request: SpatialRequest }>) => {
  try {
    const { id, request } = event.data;
    const result = buildSpatialFrame(request);
    self.postMessage(
      { id, result },
      {
        transfer: [result.vertices.buffer, ...(result.collision ? [result.collision.buffer] : [])],
      },
    );
  } catch (error) {
    self.postMessage({ id: event.data.id, error: String(error) });
  }
};
