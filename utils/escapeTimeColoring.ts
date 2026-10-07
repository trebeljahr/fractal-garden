export type EscapeTimeColoring = {
  look: string;
  colorMode: string;
  palette: string;
  iterations: number;
  colorDensity: number;
  colorOffset: number;
  interior: string;
};

// Order matches the MODE_* constants in escape-time.frag.
export const COLOR_MODES = [
  "smooth",
  "log",
  "banded",
  "distance",
  "stripes",
  "trap-point",
  "trap-cross",
] as const;

export const COLOR_MODE_LABELS: Record<(typeof COLOR_MODES)[number], string> = {
  smooth: "Smooth escape time",
  log: "Log escape time",
  banded: "Banded escape time",
  distance: "Distance estimate",
  stripes: "Stripe average",
  "trap-point": "Orbit trap (point)",
  "trap-cross": "Orbit trap (cross)",
};

// Order matches the u_palette branches in escape-time.frag.
export const PALETTES = [
  "classic",
  "ultra-fractal",
  "fire",
  "ice",
  "rainbow",
  "twilight",
  "grayscale",
] as const;

export const PALETTE_LABELS: Record<(typeof PALETTES)[number], string> = {
  classic: "Classic",
  "ultra-fractal": "Ultra Fractal",
  fire: "Fire",
  ice: "Ice",
  rainbow: "Rainbow",
  twilight: "Twilight",
  grayscale: "Grayscale",
};

type Look = {
  label: string;
  values: Partial<Omit<EscapeTimeColoring, "look">>;
};

export const CUSTOM_LOOK = "custom";

export const LOOKS: Record<string, Look> = {
  classic: {
    label: "Classic",
    values: { colorMode: "smooth", palette: "classic", colorDensity: 1, colorOffset: 0.5 },
  },
  "ultra-fractal": {
    label: "Ultra Fractal",
    values: { colorMode: "smooth", palette: "ultra-fractal", colorDensity: 3, colorOffset: 0 },
  },
  inferno: {
    label: "Inferno",
    values: {
      colorMode: "log",
      palette: "fire",
      iterations: 500,
      colorDensity: 1,
      colorOffset: 0,
      interior: "#000000",
    },
  },
  "edge-glow": {
    label: "Edge glow",
    values: { colorMode: "distance", palette: "ice", colorDensity: 1, colorOffset: 0 },
  },
  bands: {
    label: "Iteration bands",
    values: { colorMode: "banded", palette: "ultra-fractal", colorDensity: 1, colorOffset: 0 },
  },
  stripes: {
    label: "Stripes",
    values: { colorMode: "stripes", palette: "twilight", colorDensity: 1, colorOffset: 0 },
  },
  "orbit-trap": {
    label: "Orbit trap",
    values: { colorMode: "trap-point", palette: "rainbow", colorDensity: 1, colorOffset: 0 },
  },
  "cross-trap": {
    label: "Cross trap",
    values: { colorMode: "trap-cross", palette: "fire", colorDensity: 1.5, colorOffset: 0 },
  },
};

export const LOOK_OPTIONS = [...Object.keys(LOOKS), CUSTOM_LOOK];
export const LOOK_LABELS = [...Object.values(LOOKS).map((look) => look.label), "Custom"];

const COLORING_KEYS = [
  "colorMode",
  "palette",
  "iterations",
  "colorDensity",
  "colorOffset",
  "interior",
] as const;

export function createColoring(
  look: string,
  defaults: Omit<EscapeTimeColoring, "look" | "colorMode" | "palette">,
): EscapeTimeColoring {
  return {
    colorMode: "smooth",
    palette: "classic",
    ...LOOKS[look]?.values,
    ...defaults,
    look,
  };
}

/**
 * Merges a dat-gui update. Picking a look applies its values; tweaking any
 * coloring value by hand switches the look to "Custom".
 */
export function updateColoring<T extends EscapeTimeColoring>(old: T, newData: T): T {
  if (newData.look !== old.look && LOOKS[newData.look]) {
    return { ...old, ...newData, ...LOOKS[newData.look].values };
  }

  const tweaked = COLORING_KEYS.some((key) => newData[key] !== old[key]);
  return { ...old, ...newData, look: tweaked ? CUSTOM_LOOK : newData.look };
}

export function parseHexColor(hex: string) {
  const clean = hex.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16) / 255,
    Number.parseInt(clean.slice(2, 4), 16) / 255,
    Number.parseInt(clean.slice(4, 6), 16) / 255,
  ] as const;
}

type ColoringLocations = Record<
  "colorMode" | "palette" | "iterations" | "colorDensity" | "colorOffset" | "interior",
  WebGLUniformLocation | null
>;

export function getColoringLocations(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
): ColoringLocations {
  return {
    colorMode: gl.getUniformLocation(program, "u_colorMode"),
    palette: gl.getUniformLocation(program, "u_palette"),
    iterations: gl.getUniformLocation(program, "u_maxIterations"),
    colorDensity: gl.getUniformLocation(program, "u_colorDensity"),
    colorOffset: gl.getUniformLocation(program, "u_colorOffset"),
    interior: gl.getUniformLocation(program, "u_interior"),
  };
}

export function setColoringUniforms(
  gl: WebGLRenderingContext,
  locations: ColoringLocations,
  coloring: EscapeTimeColoring,
) {
  const mode = COLOR_MODES.indexOf(coloring.colorMode as (typeof COLOR_MODES)[number]);
  const palette = PALETTES.indexOf(coloring.palette as (typeof PALETTES)[number]);
  const [r, g, b] = parseHexColor(coloring.interior);

  gl.uniform1i(locations.colorMode, Math.max(mode, 0));
  gl.uniform1i(locations.palette, Math.max(palette, 0));
  gl.uniform1f(locations.iterations, Math.round(coloring.iterations));
  gl.uniform1f(locations.colorDensity, coloring.colorDensity);
  gl.uniform1f(locations.colorOffset, coloring.colorOffset);
  gl.uniform3f(locations.interior, r, g, b);
}
