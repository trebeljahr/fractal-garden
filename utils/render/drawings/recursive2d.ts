import type { Renderer } from "../types";

// Renderers for the recursive2d pages, merged into the registry.
export const RECURSIVE_2D_RENDERERS = {} satisfies Record<string, () => Renderer<never>>;
