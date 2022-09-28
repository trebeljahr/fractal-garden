import { useEffect, useState } from "react";
import { Canvas } from "../components/Canvas";
import { useWindowSize } from "../utils/hooks/useWindowResize";

const Wrapper = () => {
  const { width, height } = useWindowSize();
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (!ctx || !width || !height) return;
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, width, height);
  }, [ctx, width, height]);

  return <Canvas setCtx={setCtx} width={width} height={height} />;
};

export default Wrapper;
