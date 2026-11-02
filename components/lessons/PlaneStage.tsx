import { type ReactNode, useEffect, useRef } from "react";

type Bounds = readonly [left: number, right: number, bottom: number, top: number];

/**
 * A pixel picture of part of the plane with drawn marks on top. Children use math
 * coordinates, with y pointing up, by flipping y themselves: y on screen is -y.
 */
export function PlaneStage({
  bounds,
  label,
  width = 640,
  paint,
  paintKey,
  onPick,
  children,
}: {
  bounds: Bounds;
  label: string;
  width?: number;
  paint?: (pixels: ImageData) => void;
  paintKey?: unknown;
  onPick?: (x: number, y: number) => void;
  children?: ReactNode;
}) {
  const [left, right, bottom, top] = bounds;
  const height = Math.round((width * (top - bottom)) / (right - left));
  const canvas = useRef<HTMLCanvasElement>(null);
  const latestPaint = useRef(paint);
  latestPaint.current = paint;
  // biome-ignore lint/correctness/useExhaustiveDependencies: paintKey names everything the picture depends on
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context || !latestPaint.current) return;
    const image = context.createImageData(width, height);
    latestPaint.current(image);
    context.putImageData(image, 0, 0);
  }, [paintKey, width, height]);
  const pick = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onPick?.(
      left + ((event.clientX - rect.left) / rect.width) * (right - left),
      top - ((event.clientY - rect.top) / rect.height) * (top - bottom),
    );
  };
  return (
    <div
      style={{
        position: "relative",
        background: "#10151a",
        lineHeight: 0,
        // Keep the controls below the picture on screen together with it.
        maxWidth: `${(64 * width) / height}vh`,
        margin: "0 auto",
      }}
    >
      <canvas
        ref={canvas}
        width={width}
        height={height}
        style={{ display: "block", width: "100%", height: "auto" }}
      />
      <svg
        viewBox={`${left} ${-top} ${right - left} ${top - bottom}`}
        role="img"
        aria-label={label}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "transparent",
          touchAction: onPick ? "none" : undefined,
          cursor: onPick ? "crosshair" : undefined,
        }}
        onPointerDown={(event) => {
          if (!onPick) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (onPick && event.currentTarget.hasPointerCapture(event.pointerId)) pick(event);
        }}
      >
        {children}
      </svg>
    </div>
  );
}

export function planePixels(image: ImageData) {
  return new Uint32Array(image.data.buffer);
}
