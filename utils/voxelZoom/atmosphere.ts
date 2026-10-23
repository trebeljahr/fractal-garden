import { LOCAL_COORDINATE_LIMIT } from "./camera";

// Artistic distances in the viewed fractal scale. Never adapt to GPU load.
export const FLIGHT_FOG_START = 0.1;
export const FLIGHT_FAR_DISTANCE = 32;
export const FLIGHT_FOG_DENSITY = 7;
/** Render units may change near geometry. Only explicit wheel/pinch zoom may
 * change the exploration scale and therefore the physical atmosphere. */
export function flightAtmosphere(level: number, viewLevel = level) {
  const fogDistanceScale = 3 ** (viewLevel - level) / FLIGHT_FAR_DISTANCE;
  return {
    farDistance: Math.min(LOCAL_COORDINATE_LIMIT, 1 / fogDistanceScale),
    fogDistanceScale,
    fogStart: FLIGHT_FOG_START / FLIGHT_FAR_DISTANCE,
    fogDensity: FLIGHT_FOG_DENSITY,
  };
}
