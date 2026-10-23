import { LOCAL_COORDINATE_LIMIT } from "./camera";

// Artistic distances in the viewed fractal scale. Never adapt to GPU load.
export const FLIGHT_FOG_START = 0.1;
export const FLIGHT_FAR_DISTANCE = 32;
export const FLIGHT_FOG_DENSITY = 7;
export type FlightAtmosphere = { zoomLevel: number };

export function flightAtmosphere(level: number, previous?: FlightAtmosphere, elapsed = 1 / 60) {
  // Camera units jump by three at level boundaries. Ease the visual scale in
  // physical space, so that bookkeeping change cannot flash the atmosphere.
  const dt = Math.max(0, Math.min(0.1, elapsed));
  const delta = level - (previous?.zoomLevel ?? level);
  const step = delta * -Math.expm1(-dt / 0.25);
  const settling = Math.abs(delta - step) > 0.0001;
  const state = { zoomLevel: settling && previous ? previous.zoomLevel + step : level };
  const fogDistanceScale = 3 ** (state.zoomLevel - level) / FLIGHT_FAR_DISTANCE;
  return {
    state,
    settling,
    farDistance: Math.min(LOCAL_COORDINATE_LIMIT, 1 / fogDistanceScale),
    fogDistanceScale,
    fogStart: FLIGHT_FOG_START / FLIGHT_FAR_DISTANCE,
    fogDensity: FLIGHT_FOG_DENSITY,
  };
}
