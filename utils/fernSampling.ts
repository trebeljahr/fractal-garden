import { FernPointCloud, type FernPointView } from "./fernPoints";
import { createFernWalker, type FernMethod } from "./fernViewport";

export type FernPointRequest =
  | ({ type: "view"; id: number } & FernPointView)
  | { type: "init"; matrix: number[][]; method: FernMethod; paused: boolean }
  | { type: "pause"; paused: boolean };
export type FernPointMessage =
  | { type: "projection"; id: number; source: FernPointView; points: Float32Array }
  | { type: "remove"; ids: number[] }
  | {
      type: "points";
      id: number;
      appends: import("./fernPoints").FernPointAppend[];
      samples: number;
      visited: number;
      resolution: number;
      count: number;
      complete: boolean;
    };

export function createFernSampling(
  emit: (message: FernPointMessage, transfer: Transferable[]) => void,
) {
  const cloud = new FernPointCloud();
  let matrix: number[][] = [],
    method: FernMethod = "chaos",
    paused = true;
  let pending: Extract<FernPointRequest, { type: "view" }> | null = null;
  let active: {
    request: Extract<FernPointRequest, { type: "view" }>;
    walker: ReturnType<typeof createFernWalker>;
    added: boolean;
    complete: boolean;
  } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  const schedule = (delay = 0) => {
    if (!disposed && timer === null) timer = setTimeout(tick, delay);
  };
  function tick() {
    timer = null;
    if (disposed) return;
    // Retain the traversal through its first sample so rapid input cannot
    // repeatedly throw away a deep affine prefix before any dots appear.
    if (pending && (!active || active.added || active.complete)) {
      const request = pending;
      pending = null;
      const removed = cloud.prune(request);
      if (removed.length) emit({ type: "remove", ids: removed }, []);
      const { occupied, projections } = cloud.coverage(request);
      for (const p of projections)
        emit({ type: "projection", id: p.id, source: request, points: p.points }, [
          p.points.buffer,
        ]);
      active = {
        request,
        added: false,
        complete: false,
        walker: createFernWalker(
          matrix,
          request.view,
          request.width,
          request.height,
          method,
          42,
          occupied,
        ),
      };
    }
    if (!active) return;
    const { request, walker } = active;
    const started = performance.now();
    const points: number[] = [];
    let complete = false;
    do {
      points.push(...walker.step(128));
      complete =
        !walker.pending &&
        (method === "deterministic" || walker.samples >= 300000 || walker.tiles === 0);
    } while ((!complete || (!paused && walker.tiles > 0)) && performance.now() - started < 3);
    active.added ||= points.length > 0;
    active.complete = complete;
    const appends = cloud.append(request, points);
    emit(
      {
        type: "points",
        id: request.id,
        appends,
        samples: walker.samples,
        visited: walker.visited,
        resolution: walker.resolution,
        count: cloud.count,
        complete,
      },
      appends.map((p) => p.points.buffer),
    );
    if (pending || !complete || (!paused && walker.tiles > 0)) schedule(12);
  }
  return {
    receive(data: FernPointRequest) {
      if (data.type === "init") {
        matrix = data.matrix;
        method = data.method;
        paused = data.paused;
      } else if (data.type === "view") {
        pending = data;
        schedule();
      } else {
        paused = data.paused;
        if (!paused) schedule();
      }
    },
    dispose() {
      disposed = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      active = null;
      pending = null;
    },
  };
}
