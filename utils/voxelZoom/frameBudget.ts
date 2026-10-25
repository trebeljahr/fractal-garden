// Fixed for movement and stationary views. Frame timing never changes quality.
// Covers native 5K/6K displays; larger surfaces retain a bounded allocation.
export const MAX_FLIGHT_PIXELS = 32_000_000;
