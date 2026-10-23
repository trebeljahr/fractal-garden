import { flightViewDistance, LOCAL_FAR } from "./camera";

export type FlightFog = { logWorldDistance: number };

/** Keep fog in physical units so changing the camera's local unit cannot flash
 * the screen. Smooth logarithms to treat zooming in and out symmetrically. */
export function updateFlightFog(
  previous: FlightFog | undefined,
  clearance: number,
  level: number,
  elapsed: number,
) {
  const scale = level * Math.log(3);
  const target = Math.log(flightViewDistance(clearance)) - scale;
  const delta = previous ? target - previous.logWorldDistance : 0;
  // Bound resumed frames and large wheel jumps as well as normal flight.
  const dt = Math.max(0, Math.min(0.1, elapsed));
  const step = Math.max(-dt * 2, Math.min(dt * 2, delta * -Math.expm1(-dt / 0.3)));
  const settling = Math.abs(delta - step) > 0.001;
  const state: FlightFog = {
    logWorldDistance: settling && previous ? previous.logWorldDistance + step : target,
  };
  return {
    state,
    distance: Math.min(LOCAL_FAR, Math.exp(state.logWorldDistance + scale)),
    settling,
  };
}
