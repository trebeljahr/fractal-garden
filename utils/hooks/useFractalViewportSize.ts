import { useEffect, useState } from "react";

/** Full drawing surface below the header, including the area behind bottom controls. */
export function useFractalViewportSize() {
  const [size, setSize] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  });

  useEffect(() => {
    const viewport = document.querySelector<HTMLElement>("[data-fractal-viewport]");
    if (!viewport) return;

    const measure = () => {
      const width = viewport.clientWidth;
      const height = Math.max(1, viewport.clientHeight);
      setSize((old) => (old.width === width && old.height === height ? old : { width, height }));
    };

    // Breakpoints and clean view can change the header height.
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
