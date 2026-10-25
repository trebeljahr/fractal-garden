import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import { watchDisplayResolution } from "../utils/displayResolution";
import { registerPngExporter, renderCanvasPng } from "../utils/pngExport";
import { webglPixelRatio } from "../utils/renderResolution";

type CleanedProps = {
  width: number;
  height: number;
  setCtx: Dispatch<SetStateAction<CanvasRenderingContext2D | null>>;
};

export const _Canvas = ({ setCtx, width, height }: CleanedProps) => {
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    return watchDisplayResolution(() => {
      const ratio = window.devicePixelRatio || 1;

      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      canvas.dispatchEvent(new Event("garden:redraw"));
    });
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    setCtx(context);
  }, [setCtx]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};

type Props = {
  width: number | null;
  height: number | null;
  setCtx: Dispatch<SetStateAction<CanvasRenderingContext2D | null>>;
};

export const Canvas = ({ setCtx, width, height }: Props) => {
  return <>{width && height && <_Canvas setCtx={setCtx} width={width} height={height} />}</>;
};

type WebGLCleanedProps = {
  width: number;
  height: number;
  setCtx: Dispatch<SetStateAction<WebGLRenderingContext | null>>;
  setCnv: Dispatch<SetStateAction<HTMLCanvasElement | null>>;
};
export const _WebGLCanvas = ({ setCtx, setCnv, width, height }: WebGLCleanedProps) => {
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("webgl");
    if (!context) return;
    setCtx(context);
    setCnv(canvas);
  }, [setCtx, setCnv]);

  useEffect(() => {
    const beforeExport = () => {
      // Renderers with a static WebGL frame provide a synchronous redraw.
      canvasRef.current?.dispatchEvent(new Event("garden:redraw"));
    };
    window.addEventListener("garden:before-export", beforeExport);
    return () => window.removeEventListener("garden:before-export", beforeExport);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return registerPngExporter(canvas, (size) => {
      const gl = canvas.getContext("webgl");
      if (!gl || gl.isContextLost()) return Promise.reject(new Error("Drawing not ready"));
      const rect = canvas.getBoundingClientRect();
      const ratio = webglPixelRatio(gl, rect.width, rect.height, size.ratio);
      return renderCanvasPng(
        canvas,
        { ratio, width: Math.round(rect.width * ratio), height: Math.round(rect.height * ratio) },
        () => {
          if (canvas.dispatchEvent(new Event("garden:redraw", { cancelable: true })))
            throw new Error("Drawing not ready");
        },
      );
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return watchDisplayResolution(() => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.dispatchEvent(new Event("garden:redraw"));
    });
  }, [width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};

type WebGLProps = {
  width: number | null;
  height: number | null;
  setGl: Dispatch<SetStateAction<WebGLRenderingContext | null>>;
  setCnv: Dispatch<SetStateAction<HTMLCanvasElement | null>>;
};

export const WebGLCanvas = ({ setGl: setCtx, setCnv, width, height }: WebGLProps) => {
  return (
    <>
      {width && height && (
        <_WebGLCanvas setCnv={setCnv} setCtx={setCtx} width={width} height={height} />
      )}
    </>
  );
};
