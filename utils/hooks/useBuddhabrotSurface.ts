import { useCallback, useEffect, useRef, useState } from "react";
import { watchDisplayResolution } from "../displayResolution";
import { registerPngExporter } from "../pngExport";
import { type BuddhabrotParams, BuddhabrotRenderer } from "../render/buddhabrot";
import { RenderHost } from "../render/host";
import { useFractalFrame } from "./useFractalFrame";
import { openWorkerChannel } from "./useRenderSurface";

type Surface = {
  update: (params: BuddhabrotParams) => void;
  resize: (width: number, height: number, ratio: number) => void;
  exportPng: (ratio: number) => Promise<Blob>;
  dispose: () => void;
};

/** Own a GPU surface, replacing its canvas before falling back to a CPU worker. */
export function useBuddhabrotSurface(
  params: BuddhabrotParams,
  width: number | null,
  height: number | null,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const frame = useFractalFrame(width, height);
  const latest = useRef({ params, width, height, frame });
  const previous = useRef(params);
  if (previous.current !== params) {
    previous.current = params;
    latest.current.params = params;
  }
  latest.current.width = width;
  latest.current.height = height;
  latest.current.frame = frame;
  const surface = useRef<Surface | null>(null);
  const prepared = useCallback(
    () => ({ ...latest.current.params, framing: latest.current.frame ?? undefined }),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let animation = 0;
    let element: HTMLCanvasElement | null = null;
    let unregister = () => {};
    const mount = () => {
      unregister();
      element?.remove();
      const next = document.createElement("canvas");
      next.style.display = "block";
      container.appendChild(next);
      element = next;
      setCanvas(next);
      unregister = registerPngExporter(
        next,
        ({ ratio }) =>
          surface.current?.exportPng(ratio) ?? Promise.reject(new Error("Drawing not ready")),
      );
      return next;
    };
    const resize = () => {
      const { width: w, height: h } = latest.current;
      if (!w || !h || !element) return;
      element.style.width = `${w}px`;
      element.style.height = `${h}px`;
      surface.current?.resize(w, h, window.devicePixelRatio || 1);
    };
    const connect = (next: Surface) => {
      surface.current = next;
      resize();
      if (surface.current === next) next.update(prepared());
    };
    const mainThreadFallback = () => {
      if (disposed) return;
      surface.current?.dispose();
      surface.current = null;
      const replacement = mount();
      replacement.dataset.buddhabrotBackend = "cpu";
      replacement.dataset.buddhabrotExecution = "main";
      const host = new RenderHost(
        replacement,
        new BuddhabrotRenderer(),
        (event) => {
          if (event.type === "error") console.error(`[buddhabrot] ${event.message}`);
          if (event.type === "rendered") replacement.dataset.buddhabrotReady = "true";
        },
        false,
      );
      connect({
        update: (next) => host.setParams(next),
        resize: (w, h, ratio) => host.resize(w, h, ratio),
        exportPng: (ratio) => host.exportPng(ratio, () => new BuddhabrotRenderer()),
        dispose: () => host.dispose(),
      });
    };
    const fallback = () => {
      if (disposed) return;
      cancelAnimationFrame(animation);
      surface.current?.dispose();
      surface.current = null;
      const target = mount();
      target.dataset.buddhabrotBackend = "cpu";
      target.dataset.buddhabrotExecution = "worker";
      const worker = openWorkerChannel(target, "buddhabrot", (event) => {
        if (event.type === "error") mainThreadFallback();
        if (event.type === "rendered") target.dataset.buddhabrotReady = "true";
      });
      if (worker) {
        connect({
          update: worker.setParams,
          resize: worker.resize,
          exportPng: worker.exportPng,
          dispose: worker.dispose,
        });
      } else {
        mainThreadFallback();
      }
    };
    const target = mount();
    import("../buddhabrotGpu/renderer")
      .then(async ({ BuddhabrotGpuRenderer }) => {
        const gpu = await BuddhabrotGpuRenderer.create(target);
        if (disposed) {
          gpu?.dispose();
          return;
        }
        if (!gpu) {
          fallback();
          return;
        }
        gpu.onFailure = () => fallback();
        target.dataset.buddhabrotBackend = "webgpu";
        let dirty = true;
        const schedule = () => {
          if (!animation && !disposed) animation = requestAnimationFrame(tick);
        };
        const tick = () => {
          animation = 0;
          if (disposed) return;
          if (document.hidden) return;
          try {
            if (dirty) {
              dirty = false;
              if (gpu.draw()) {
                dirty = true;
                schedule();
              }
            }
          } catch (error) {
            console.warn("Buddhabrot GPU unavailable; using CPU.", error);
            fallback();
          }
        };
        connect({
          update: (next) => {
            try {
              gpu.update(next);
              dirty = true;
              schedule();
            } catch {
              fallback();
            }
          },
          resize: (w, h, ratio) => {
            try {
              gpu.resize(w, h, ratio);
              dirty = true;
              schedule();
            } catch {
              fallback();
            }
          },
          exportPng: async (ratio) => gpu.exportPng(ratio),
          dispose: () => {
            cancelAnimationFrame(animation);
            animation = 0;
            gpu.dispose();
          },
        });
      })
      .catch((error) => {
        if (!disposed) {
          console.warn("Buddhabrot GPU unavailable; using CPU.", error);
          fallback();
        }
      });
    const visibility = () => {
      if (!document.hidden) surface.current?.update(prepared());
    };
    const unwatch = watchDisplayResolution(resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      document.removeEventListener("visibilitychange", visibility);
      unwatch();
      unregister();
      surface.current?.dispose();
      surface.current = null;
      element?.remove();
    };
  }, [prepared]);

  useEffect(() => {
    if (!width || !height || !canvas) return;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    surface.current?.resize(width, height, window.devicePixelRatio || 1);
  }, [width, height, canvas]);
  // The latest imperative camera is retained when only framing changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: params and framing invalidate the prepared value
  useEffect(() => {
    surface.current?.update(prepared());
  }, [params, frame, prepared]);
  const setParams = useCallback(
    (next: BuddhabrotParams) => {
      latest.current.params = next;
      surface.current?.update(prepared());
    },
    [prepared],
  );
  return { containerRef, canvas, setParams };
}
