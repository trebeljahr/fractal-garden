export type PngExportSize = { width: number; height: number; ratio: number };
type Exporter = (size: PngExportSize) => Promise<Blob>;
const exporters = new WeakMap<HTMLCanvasElement, Exporter>();

/** Render larger than the preview, preserving its aspect ratio and CSS framing. */
export function pngExportSize(width: number, height: number, ratio = 1): PngExportSize {
  if (!(width > 0 && height > 0) || !Number.isFinite(width + height))
    throw new Error("Drawing not ready");
  const scale = Math.min(
    Math.max(Number.isFinite(ratio) && ratio > 0 ? ratio : 1, 4096 / Math.max(width, height)),
    8192 / Math.max(width, height),
    Math.sqrt(32_000_000 / (width * height)),
  );
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    ratio: scale,
  };
}

export function registerPngExporter(canvas: HTMLCanvasElement, exporter: Exporter) {
  exporters.set(canvas, exporter);
  return () => {
    if (exporters.get(canvas) === exporter) exporters.delete(canvas);
  };
}

export function canvasToPng(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type: "image/png" });
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))),
      "image/png",
    );
  });
}

/** toBlob snapshots synchronously; restore the live canvas before yielding. */
export function renderCanvasPng(
  canvas: HTMLCanvasElement,
  size: PngExportSize,
  draw: (ratio: number) => void,
) {
  const width = canvas.width,
    height = canvas.height;
  const rect = canvas.getBoundingClientRect();
  try {
    canvas.width = size.width;
    canvas.height = size.height;
    draw(size.ratio);
    return canvasToPng(canvas);
  } finally {
    canvas.width = width;
    canvas.height = height;
    draw(width / Math.max(1, rect.width));
  }
}

export function exportCanvasPng(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const exporter = exporters.get(canvas);
  if (exporter)
    return exporter(pngExportSize(rect.width, rect.height, window.devicePixelRatio || 1));
  // Older renderers still supply their latest actual pixels; never upscale a bitmap.
  window.dispatchEvent(new Event("garden:before-export"));
  return canvasToPng(canvas);
}

export function downloadPng(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Allow the browser to start reading the object URL before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
