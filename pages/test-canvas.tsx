import { useEffect } from "react";
import { useCanvas } from "../utils/hooks/useCanvas";
import { useWindowSize } from "../utils/hooks/useWindowResize";

const TestCanvas = () => {
  const { width, height } = useWindowSize();
  const { Canvas, ctx } = useCanvas();

  useEffect(() => {
    if (!ctx || !width || !height) return;

    console.log("Drawing to canvas!");
    console.log(ctx);

    /* tslint:disable-next-line */
    window.ctx = ctx;

    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, width, height);
  }, [ctx, width, height]);

  return <Canvas width={width} height={height}></Canvas>;
};

export default TestCanvas;
