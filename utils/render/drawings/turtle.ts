import { StaticRenderer } from "../static2d";
import type { Renderer } from "../types";
import {
  drawCesaroFractal,
  drawDragonCurve,
  drawFibonacciWordFractal,
  drawGosperCurve,
  drawGosperIsland,
  drawKochAntiSnowflake,
  drawLevyTapestry,
  drawMinkowskiSausage,
  drawPeanoCurve,
  drawQuadraticKochIsland,
  drawStarFractal,
  drawTerdragon,
  drawTwindragon,
} from "./turtleCurves";

// Renderers for the turtle pages, merged into the registry.
export const TURTLE_RENDERERS = {
  cesaroFractal: () => new StaticRenderer(drawCesaroFractal),
  kochAntiSnowflake: () => new StaticRenderer(drawKochAntiSnowflake),
  quadraticKochIsland: () => new StaticRenderer(drawQuadraticKochIsland),
  minkowskiSausage: () => new StaticRenderer(drawMinkowskiSausage),
  dragonCurve: () => new StaticRenderer(drawDragonCurve),
  terdragon: () => new StaticRenderer(drawTerdragon),
  twindragon: () => new StaticRenderer(drawTwindragon),
  gosperCurve: () => new StaticRenderer(drawGosperCurve),
  gosperIsland: () => new StaticRenderer(drawGosperIsland),
  levyTapestry: () => new StaticRenderer(drawLevyTapestry),
  peanoCurve: () => new StaticRenderer(drawPeanoCurve),
  starFractal: () => new StaticRenderer(drawStarFractal),
  fibonacciWordFractal: () => new StaticRenderer(drawFibonacciWordFractal),
} satisfies Record<string, () => Renderer<never>>;
