import { StaticRenderer } from "../static2d";
import type { Renderer } from "../types";
import { drawApollonianGasket } from "./apollonianGasket";
import { drawHTree } from "./hTree";
import { drawNFlake } from "./nFlake";
import { drawPythagorasTree } from "./pythagorasTree";
import { drawSierpinskiCarpet } from "./sierpinskiCarpet";
import { drawVicsekFractal2D } from "./vicsekFractal2D";

// Renderers for the recursive2d pages, merged into the registry.
export const RECURSIVE_2D_RENDERERS = {
  hTree: () => new StaticRenderer(drawHTree),
  nFlake: () => new StaticRenderer(drawNFlake),
  vicsekFractal2D: () => new StaticRenderer(drawVicsekFractal2D),
  apollonianGasket: () => new StaticRenderer(drawApollonianGasket),
  pythagorasTree: () => new StaticRenderer(drawPythagorasTree),
  sierpinskiCarpet: () => new StaticRenderer(drawSierpinskiCarpet),
} satisfies Record<string, () => Renderer<never>>;
