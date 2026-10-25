export const MAX_FLIGHT_PIXELS = 2_500_000;
const MIN_FLIGHT_PIXELS = 160_000;
const TARGET_FRAME_MS = 1000 / 60;

/** Feedback from consecutive rendered frames includes GPU presentation and CPU
 * work. Idle animation callbacks must not count as cheap rendered frames. */
export function createFlightFrameBudget() {
  let pixels = MAX_FLIGHT_PIXELS;
  let slowFrames = 0;
  let recoveryMs = 0;
  return {
    get pixels() {
      return pixels;
    },
    sample(elapsedMs: number, renderedPixels: number) {
      if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || renderedPixels <= 0) return;
      if (elapsedMs > TARGET_FRAME_MS * 1.35) {
        recoveryMs = 0;
        // Ignore a lone missed refresh, but react immediately to a long stall.
        if (++slowFrames < 2 && elapsedMs < TARGET_FRAME_MS * 3) return;
        pixels = Math.max(
          MIN_FLIGHT_PIXELS,
          Math.min(pixels * 0.8, renderedPixels * Math.max(0.25, TARGET_FRAME_MS / elapsedMs)),
        );
        slowFrames = 0;
      } else {
        slowFrames = 0;
        if (elapsedMs > TARGET_FRAME_MS * 1.1) {
          recoveryMs = 0;
          return;
        }
        recoveryMs += elapsedMs;
        if (recoveryMs >= 1000) {
          // Slow recovery avoids resolution pumping at the edge of the budget.
          pixels = Math.min(MAX_FLIGHT_PIXELS, pixels * 1.1);
          recoveryMs = 0;
        }
      }
    },
    pause() {
      slowFrames = 0;
      recoveryMs = 0;
    },
  };
}
