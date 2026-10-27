import type { CanvasViewport } from "./canvasViewport";
import { isRecord } from "./explorerShare";
import type { Orientation } from "./orientation";

export type ConstructionView = CanvasViewport & {
  cameraDistance: number;
  rotationX: number;
  rotationY: number;
  grab?: Orientation;
  autoRotate: boolean;
  resetId: number;
  background: string;
  color: string;
  fillColor: string;
  strokeColor: string;
  nearColor: string;
  farColor: string;
  lineWidth: number;
  showFaces: boolean;
  showWireframe: boolean;
  lighting: "classic" | "depth";
  occlusion: "off" | "soft" | "minecraft";
  [key: string]: unknown;
};

export const CONSTRUCTION_NUMBERS = {
  angle: { min: 0, max: 180, step: 1 },
  ratio: { min: 0.1, max: 0.9, step: 0.01 },
  sides: { min: 3, max: 12, step: 1 },
  divideFactor: { min: 1, max: 5, step: 0.01 },
} as const;
export const CONSTRUCTION_BOOLEANS = [
  "fillSquares",
  "strokeSquares",
  "fillPolygons",
  "strokePolygons",
  "fillCircles",
  "strokeCircles",
  "showOuterCircle",
  "includeCenter",
];

export function constructionIs3D(kind: string, params: unknown) {
  return (
    kind === "scene3d" ||
    kind === "polylineScene" ||
    (kind === "lsystemConstruction" && isRecord(params) && params.dimension === "3d")
  );
}

export function initialConstructionView(params: unknown, cameraDistance = 7.5): ConstructionView {
  const root = isRecord(params) ? params : {};
  const paint = isRecord(root.view) ? root.view : isRecord(root.config) ? root.config : root;
  const value = (key: string, fallback: string) =>
    typeof paint[key] === "string" ? (paint[key] as string) : fallback;
  const extras = Object.fromEntries(
    [...Object.keys(CONSTRUCTION_NUMBERS), ...CONSTRUCTION_BOOLEANS]
      .filter((key) => key in root)
      .map((key) => [key, root[key]]),
  );
  return {
    x: 0,
    y: 0,
    zoom: 1,
    cameraDistance,
    rotationX: typeof paint.rotationX === "number" ? paint.rotationX : 24,
    rotationY: typeof paint.rotationY === "number" ? paint.rotationY : 28,
    autoRotate: false,
    resetId: 0,
    background: value("background", "#252424"),
    color: value("color", "#eee8ce"),
    fillColor: value("fillColor", "#eee8ce"),
    strokeColor: value("strokeColor", "#eee8ce"),
    nearColor: value("nearColor", "#eee8ce"),
    farColor: value("farColor", "#f5c56d"),
    lineWidth: typeof paint.lineWidth === "number" ? paint.lineWidth : 1,
    showFaces: paint.showFaces !== false,
    showWireframe: paint.showWireframe === true,
    lighting: paint.lighting === "depth" ? "depth" : "classic",
    occlusion:
      paint.occlusion === "off" || paint.occlusion === "minecraft" ? paint.occlusion : "soft",
    ...extras,
  };
}

export function constructionViewParams(
  kind: string,
  params: unknown,
  view: ConstructionView,
): unknown {
  if (!isRecord(params)) return params;
  const {
    cameraDistance,
    rotationX,
    rotationY,
    grab,
    autoRotate,
    background,
    color,
    fillColor,
    strokeColor,
    nearColor,
    farColor,
    lineWidth,
    showFaces,
    showWireframe,
  } = view;
  const camera = { cameraDistance, rotationX, rotationY, grab, autoRotate };
  if (kind === "scene3d")
    return {
      ...params,
      view: {
        ...(params.view as object),
        ...camera,
        background,
        fillColor,
        strokeColor,
        lineWidth,
        showFaces,
        showWireframe,
      },
    };
  if (kind === "polylineScene")
    return {
      ...params,
      config: {
        ...(params.config as object),
        ...camera,
        viewScale: 0.64,
        background,
        nearColor,
        farColor,
        lineWidth,
      },
    };
  const extras = Object.fromEntries(
    [...Object.keys(CONSTRUCTION_NUMBERS), ...CONSTRUCTION_BOOLEANS]
      .filter((key) => key in params)
      .map((key) => [key, view[key]]),
  );
  return {
    ...params,
    ...extras,
    background,
    color,
    lineWidth,
    ...(kind === "lsystemConstruction" ? { constructionView: camera } : {}),
  };
}
