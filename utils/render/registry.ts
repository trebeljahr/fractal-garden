import { LSystem2DRenderer } from "./lsystem2d";
import { Scene3DRenderer } from "./scene3d";
import type { Renderer } from "./types";

export const RENDERERS = {
  scene3d: () => new Scene3DRenderer(),
  lsystem2d: () => new LSystem2DRenderer(),
} satisfies Record<string, () => Renderer<never>>;

export type RendererKind = keyof typeof RENDERERS;

export function createRenderer(kind: string): Renderer<unknown> {
  const factory = RENDERERS[kind as RendererKind];
  if (!factory) throw new Error(`Unknown renderer: ${kind}`);
  return factory() as Renderer<unknown>;
}
