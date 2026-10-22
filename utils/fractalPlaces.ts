export type FractalPlace = {
  label: string;
  detail?: string;
  center: [number, number];
  zoomSize: number;
  iterations?: number;
  group?: string;
  preview?: string;
};

export function matchesPlace(
  place: FractalPlace,
  viewport: Pick<FractalPlace, "center" | "zoomSize">,
) {
  const tolerance = place.zoomSize * 1e-8;
  return (
    Math.abs(place.center[0] - viewport.center[0]) <= tolerance &&
    Math.abs(place.center[1] - viewport.center[1]) <= tolerance &&
    Math.abs(place.zoomSize - viewport.zoomSize) <= tolerance
  );
}

export type EscapeTimePlace = FractalPlace & {
  id: string;
  /** Exact decimal coordinates for destinations beyond binary64 resolution. */
  preciseCenter?: [string, string];
  parameters?: { preset: string; cReal: number; cImag: number };
};

export function matchesJuliaConstant(place: EscapeTimePlace, c: [number, number]) {
  return (
    !place.parameters ||
    (Math.abs(place.parameters.cReal - c[0]) < 1e-12 &&
      Math.abs(place.parameters.cImag - c[1]) < 1e-12)
  );
}
