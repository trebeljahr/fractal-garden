import { LOCAL_COORDINATE_LIMIT } from "./camera";

// Artistic world-space distances. Never adapt these to clearance or GPU load.
export const FLIGHT_FOG_START = 1;
export const FLIGHT_FAR_DISTANCE = 16;

export function flightAtmosphere(level: number) {
  const worldUnitsPerLocal = 2 / 3 ** level;
  return {
    farDistance: Math.min(LOCAL_COORDINATE_LIMIT, FLIGHT_FAR_DISTANCE / worldUnitsPerLocal),
    fogDistanceScale: worldUnitsPerLocal / FLIGHT_FAR_DISTANCE,
    fogStart: FLIGHT_FOG_START / FLIGHT_FAR_DISTANCE,
  };
}
