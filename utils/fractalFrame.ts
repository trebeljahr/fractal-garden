/** The drawing surface stays full size; these insets only frame the opening shape. */
export type FractalFrame = { width: number; height: number; top: number; bottom: number };

export function fitFractalFrame(width: number, height: number, top = 0, bottom = 0): FractalFrame {
  const surfaceWidth = Math.max(1, width);
  const surfaceHeight = Math.max(1, height);
  const safeTop = Math.max(0, Number.isFinite(top) ? top : 0);
  const safeBottom = Math.max(0, Number.isFinite(bottom) ? bottom : 0);
  const ratio = Math.min(1, (surfaceHeight - 1) / Math.max(1, safeTop + safeBottom));
  return {
    width: surfaceWidth,
    height: surfaceHeight,
    top: safeTop * ratio,
    bottom: safeBottom * ratio,
  };
}

export function readFractalFrame(element: HTMLElement): FractalFrame {
  const surface = element.closest<HTMLElement>("[data-fractal-viewport], [data-fractal-stage]");
  const rect = element.getBoundingClientRect();
  const style = surface ? getComputedStyle(surface) : null;
  return fitFractalFrame(
    rect.width,
    rect.height,
    Number.parseFloat(style?.scrollPaddingTop ?? "0"),
    Number.parseFloat(style?.scrollPaddingBottom ?? "0"),
  );
}
