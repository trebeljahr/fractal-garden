import { canvasToPng, type PngExportSize } from "../pngExport";
import type { EscapeFormula } from "./orbit";
import { createDeepZoomRenderer, type RenderState } from "./renderer";

/** Render a fixed view independently, including every precision repair. */
export function exportDeepZoomPng(
  formula: EscapeFormula,
  source: RenderState,
  size: PngExportSize,
  signal?: AbortSignal,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("PNG export cancelled.", "AbortError"));
      return;
    }
    const state: RenderState = {
      ...source,
      view: { ...source.view },
      c: [...source.c],
      config: { ...source.config },
      width: size.width,
      height: size.height,
    };
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) {
      reject(new Error("Could not prepare the PNG renderer."));
      return;
    }
    let renderer: ReturnType<typeof createDeepZoomRenderer> | undefined;
    let finished = false;
    let encoding = false;
    const finish = (blob?: Blob, error?: unknown) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener("abort", aborted);
      canvas.removeEventListener("webglcontextlost", lost);
      renderer?.destroy();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.width = 1;
      canvas.height = 1;
      if (blob) resolve(blob);
      else reject(error);
    };
    const aborted = () =>
      finish(undefined, new DOMException("PNG export cancelled.", "AbortError"));
    const lost = (event: Event) => {
      event.preventDefault();
      finish(undefined, new Error("The graphics connection was lost while saving the PNG."));
    };
    signal?.addEventListener("abort", aborted, { once: true });
    canvas.addEventListener("webglcontextlost", lost);
    try {
      renderer = createDeepZoomRenderer(
        gl,
        formula,
        () => state,
        (status) => {
          if (status.error) {
            finish(undefined, new Error(status.message));
          } else if (
            !encoding &&
            (status.message === "Ready" || status.message === "Detail ready")
          ) {
            encoding = true;
            canvasToPng(canvas).then(
              (blob) => finish(blob),
              (error) => finish(undefined, error),
            );
          }
        },
        { pixelRatio: 1 },
      );
      renderer.update();
    } catch (error) {
      finish(undefined, error);
    }
  });
}
