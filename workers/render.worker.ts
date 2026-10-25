import { calibrate } from "../utils/render/calibrate";
import { RenderHost } from "../utils/render/host";
import { createRenderer } from "../utils/render/registry";
import type { HostEvent, WorkerRequest } from "../utils/render/types";

// The project compiles against the DOM lib, so describe the worker scope by hand.
const scope = self as unknown as {
  postMessage: (message: HostEvent) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};
let host: RenderHost<unknown> | null = null;
let kind = "";

const emit = (event: HostEvent) => scope.postMessage(event);

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    switch (message.type) {
      case "export-png": {
        if (!host) {
          emit({ type: "png", id: message.id, error: "Drawing not ready" });
          break;
        }
        Promise.resolve()
          .then(() => host!.exportPng(message.ratio, () => createRenderer(kind)))
          .then(
            (blob) => emit({ type: "png", id: message.id, blob }),
            (error) => emit({ type: "png", id: message.id, error: String(error) }),
          );
        break;
      }
      case "pick":
        emit({ type: "picked", id: message.id, point: host?.pick(message.x, message.y) ?? null });
        break;
      case "snapshot":
        emit({ type: "snapshot", id: message.id, state: host?.snapshotView() });
        break;
      case "restore-view":
        host?.restoreView(message.state);
        break;
      case "init":
        kind = message.kind;
        host = new RenderHost(message.canvas, createRenderer(kind), emit, true);
        host.resize(message.width, message.height, message.ratio);
        break;
      case "resize":
        host?.resize(message.width, message.height, message.ratio);
        break;
      case "params":
        host?.setParams(message.params);
        break;
      case "remeasure":
        host?.remeasure();
        break;
      case "calibrate": {
        const reports = calibrate({
          ...message.request,
          template: message.request.params,
          createRenderer: () => createRenderer(kind),
          offThread: true,
        });
        emit({ type: "calibrated", reports });
        break;
      }
    }
  } catch (error) {
    emit({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
