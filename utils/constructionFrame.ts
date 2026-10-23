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
      view: { ...source.view, autoRotate: false, grab: undefined, cameraDistance: 6 },
    } satisfies Scene3DParams;
  }
  if (kind === "lsystem2d") {
    const source = params as LSystem2DParams;
    const scale = Math.min(720 / width, 480 / height);
    return {
      ...source,
      iterations: level,
      initialLength: source.initialLength * scale,
      translation: [
        360 + (source.translation[0] - width / 2) * scale,
        240 + (source.translation[1] - height / 2) * scale,
      ],
    } satisfies LSystem2DParams;
  }
  return { ...(isRecord(params) ? params : {}), iterations: level, viewport: undefined };
}
