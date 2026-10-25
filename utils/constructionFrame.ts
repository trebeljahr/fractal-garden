import { isRecord } from "./explorerShare";
import type { LSystem2DParams } from "./render/lsystem2d";
import type { PolylineSceneParams } from "./render/polylineScene";
import type { RendererKind } from "./render/registry";
import type { Scene3DParams } from "./render/scene3d";

// A lesson always starts outside the shape, independent of the explorer camera.
export function constructionFrame(
  kind: RendererKind,
  params: unknown,
  level: number,
  width: number,
  height: number,
  targetWidth = 720,
  targetHeight = 480,
): unknown {
  if (kind === "polylineScene") {
    const source = params as PolylineSceneParams;
    return {
      ...source,
      source:
        source.source.kind === "hilbert3d" ? { ...source.source, order: level } : source.source,
      config: { ...source.config, animateTrail: false, autoRotate: false, grab: undefined },
    } satisfies PolylineSceneParams;
  }
  if (kind === "scene3d") {
    const source = params as Scene3DParams;
    return {
      ...source,
      iterations: level,
      view: { ...source.view, autoRotate: false, grab: undefined, cameraDistance: 7.5 },
    } satisfies Scene3DParams;
  }
  if (kind === "lsystem2d") {
    const source = params as LSystem2DParams;
    const { framing, ...drawing } = source;
    const top = framing?.top ?? 0;
    const fitHeight = Math.max(1, height - top - (framing?.bottom ?? 0));
    const scale = Math.min(targetWidth / width, targetHeight / fitHeight);
    return {
      ...drawing,
      iterations: level,
      initialLength: source.initialLength * scale,
      translation: [
        targetWidth / 2 + (source.translation[0] - width / 2) * scale,
        targetHeight / 2 + (source.translation[1] - top - fitHeight / 2) * scale,
      ],
    } satisfies LSystem2DParams;
  }
  return { ...(isRecord(params) ? params : {}), iterations: level, viewport: undefined };
}
