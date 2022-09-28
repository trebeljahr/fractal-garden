import { useRef, useEffect, useState } from "react";

// type drawFunc = (context: CanvasRenderingContext2D, frameCount: number) => void;
// type Props = {
//   draw: drawFunc;
//   [key: string]: any;
// };

export const useCanvas = () => {
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  //   useEffect(() => {
  //     const canvas = canvasRef.current;
  //     if (!canvas) return;

  //     const context = canvas.getContext("2d");
  //     if (!context) return;

  //     let frameCount = 0;
  //     let animationFrameId: number;

  //     const render = () => {
  //       frameCount++;
  //       draw(context, frameCount);
  //       animationFrameId = window.requestAnimationFrame(render);
  //     };
  //     render();

  //     return () => {
  //       window.cancelAnimationFrame(animationFrameId);
  //     };
  //   }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    setCtx(context);
  }, [canvasRef]);

  return {
    Canvas: ({ ...props }) => <canvas ref={canvasRef} {...props} />,
    ctx,
  };
};
