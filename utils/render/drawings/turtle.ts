import type { Renderer } from "../types";

// Renderers for the turtle pages, merged into the registry.
export const TURTLE_RENDERERS = {} satisfies Record<string, () => Renderer<never>>;
