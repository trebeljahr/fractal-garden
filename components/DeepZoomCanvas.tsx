import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";

import styles from "../styles/DeepZoom.module.css";

type Props = {
  width: number | null;
  height: number | null;
  setGl: Dispatch<SetStateAction<WebGLRenderingContext | null>>;
  setCnv: Dispatch<SetStateAction<HTMLCanvasElement | null>>;
};

export function DeepZoomCanvas({ width, height, setGl, setCnv }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [w, h] = [width || 1, height || 1];
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const setup = () => {
      // Progressive repairs and PNG export retain the exact completed frame.
      const gl = canvas.getContext("webgl", {
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
        antialias: false,
      });
      setGl(gl);
      setCnv(canvas);
      setError(gl ? "" : "WebGL is unavailable in this browser.");
    };
    const lost = (event: Event) => {
      event.preventDefault();
      setGl(null);
      setError("Graphics connection lost. Waiting for the browser to restore it…");
    };
    setup();
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", setup);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", setup);
      setGl(null);
      setCnv(null);
    };
  }, [setGl, setCnv]);
  return (
    <>
      <canvas
        ref={ref}
        style={{ width: w, height: h, display: "block" }}
        aria-label="Interactive fractal. Drag to pan; scroll or pinch to zoom."
      />
      {error && (
        <output className={styles.error} data-fractal-chrome role="alert">
          {error}
        </output>
      )}
    </>
  );
}
