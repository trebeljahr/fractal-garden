import { useRef, useEffect, Dispatch, SetStateAction } from "react";

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
    if (!context) return;
    setCtx(context);
  }, []);

  return <canvas ref={canvasRef} width={width} height={height} />;
};

type Props = {
  width: number | null;
  height: number | null;
  setCtx: Dispatch<SetStateAction<CanvasRenderingContext2D | null>>;
};

export const Canvas = ({ setCtx, width, height }: Props) => {
  return (
    <>
      {width && height && (
        <_Canvas setCtx={setCtx} width={width} height={height} />
      )}
    </>
  );
};

type WebGLCleanedProps = {
  width: number;
  height: number;
  setCtx: Dispatch<SetStateAction<WebGLRenderingContext | null>>;
};
export const _WebGLCanvas = ({ setCtx, width, height }: WebGLCleanedProps) => {
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("webgl");
    if (!context) return;
    setCtx(context);
  }, []);

  return <canvas ref={canvasRef} width={width} height={height} />;
};

type WebGLProps = {
  width: number | null;
  height: number | null;
  setGl: Dispatch<SetStateAction<WebGLRenderingContext | null>>;
};

export const WebGLCanvas = ({ setGl: setCtx, width, height }: WebGLProps) => {
  return (
    <>
      {width && height && (
        <_WebGLCanvas setCtx={setCtx} width={width} height={height} />
      )}
    </>
  );
};
