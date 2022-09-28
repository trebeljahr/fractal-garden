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
