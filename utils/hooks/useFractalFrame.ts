import { useEffect, useState } from "react";
import { type FractalFrame, fitFractalFrame } from "../fractalFrame";

export function useFractalFrame(width: number | null, height: number | null): FractalFrame | null {
  const [frame, setFrame] = useState<FractalFrame | null>(null);
  useEffect(() => {
    if (!width || !height) return;
    const surface = document.querySelector<HTMLElement>(
      "[data-fractal-viewport], [data-fractal-stage]",
    );
    if (!surface) return;
    const measure = () => {
      const style = getComputedStyle(surface);
      const next = fitFractalFrame(
        width,
        height,
        parseFloat(style.scrollPaddingTop),
        parseFloat(style.scrollPaddingBottom),
      );
      setFrame((old) =>
        old &&
        Object.keys(next).every(
          (key) => old[key as keyof FractalFrame] === next[key as keyof FractalFrame],
        )
          ? old
          : next,
      );
    };
    const resize = new ResizeObserver(measure);
    resize.observe(surface);
    const modes = new MutationObserver(measure);
    modes.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-fractal-clean", "data-fractal-fullscreen"],
    });
    measure();
    return () => {
      resize.disconnect();
      modes.disconnect();
    };
  }, [width, height]);
  return frame;
}
