import { type LogisticRender, renderLogistic } from "./logisticMap";

// The page keeps one job in flight and replaces any queued work with the latest view.
self.onmessage = ({ data }: MessageEvent<LogisticRender>) => {
  const pixels = renderLogistic(data);
  self.postMessage(
    { width: data.width, height: data.height, pixels },
    { transfer: [pixels.buffer] },
  );
};
