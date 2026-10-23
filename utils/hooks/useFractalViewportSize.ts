import { useEffect, useState } from "react";

/** Content size of the marked drawing area, clear of navigation. */
export function useFractalViewportSize() {
  const [size, setSize] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  });

  useEffect(() => {
    const viewport = document.querySelector<HTMLElement>("[data-fractal-viewport]");
    if (!viewport) return;

    const measure = () => {
      const style = getComputedStyle(viewport);
      const width = viewport.clientWidth;
      const height = Math.max(
        1,
        viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      );
      setSize((old) => (old.width === width && old.height === height ? old : { width, height }));
    };

    // Observe the content box: breakpoint and clean-view padding changes also resize it.
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return size;
}
