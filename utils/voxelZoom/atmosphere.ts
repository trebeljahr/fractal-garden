import { LOCAL_COORDINATE_LIMIT } from "./camera";

// Artistic distances in the viewed fractal scale. Never adapt to GPU load.
export const FLIGHT_FOG_START = 0.2;
export const FLIGHT_FAR_DISTANCE = 96;
export const FLIGHT_FOG_DENSITY = 4;
/** Fog uses the independently damped visual scale. Render precision may
 * change independently without shifting the atmosphere. */
export function flightAtmosphere(level: number, atmosphereLevel = level) {
  const fogDistanceScale = 3 ** (atmosphereLevel - level) / FLIGHT_FAR_DISTANCE;
  return {
    farDistance: Math.min(LOCAL_COORDINATE_LIMIT, 1 / fogDistanceScale),
    fogDistanceScale,
    fogStart: FLIGHT_FOG_START / FLIGHT_FAR_DISTANCE,
    fogDensity: FLIGHT_FOG_DENSITY,
  };
}
