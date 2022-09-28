import { useRef, useEffect, Dispatch, SetStateAction } from "react";

type Props = {
  width: number;
  height: number;
  setCtx: Dispatch<SetStateAction<CanvasRenderingContext2D | null>>;
};

export const Canvas = ({ setCtx, width, height }: Props) => {
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
