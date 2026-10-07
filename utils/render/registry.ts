import { BuddhabrotRenderer } from "./buddhabrot";
import { drawFractalCanopy } from "./drawings/fractalCanopy";
import { RECURSIVE_2D_RENDERERS } from "./drawings/recursive2d";
import { drawTSquare } from "./drawings/tSquare";
import { TURTLE_RENDERERS } from "./drawings/turtle";
import { LSystem2DRenderer } from "./lsystem2d";
import { PolylineSceneRenderer } from "./polylineScene";
import { Scene3DRenderer } from "./scene3d";
import { StaticRenderer } from "./static2d";
import type { Renderer } from "./types";

export const RENDERERS = {
  scene3d: () => new Scene3DRenderer(),
  lsystem2d: () => new LSystem2DRenderer(),
  polylineScene: () => new PolylineSceneRenderer(),
  buddhabrot: () => new BuddhabrotRenderer(),
  tSquare: () => new StaticRenderer(drawTSquare),
  fractalCanopy: () => new StaticRenderer(drawFractalCanopy),
  ...RECURSIVE_2D_RENDERERS,
  ...TURTLE_RENDERERS,
} satisfies Record<string, () => Renderer<never>>;

export type RendererKind = keyof typeof RENDERERS;

export function createRenderer(kind: string): Renderer<unknown> {
  const factory = RENDERERS[kind as RendererKind];
  if (!factory) throw new Error(`Unknown renderer: ${kind}`);
  return factory() as Renderer<unknown>;
}
