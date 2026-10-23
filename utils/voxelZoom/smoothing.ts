/** Critically damp the visual scale during movement. Collision can demand an
 * immediate speed reduction; it must not instantly replace the whole fog volume.
 * Bound the spring's lead so even a turn into a microscopic wall stays gradual. */
export function easeFlightAtmosphere(
  initialLevel: number,
  initialVelocity: number,
  from: number,
  to: number,
  duration: number,
  throttle = 0.75,
) {
  let level = initialLevel;
  let velocity = initialVelocity;
  const steps = Math.max(1, Math.ceil(duration * 120));
  const dt = duration / steps;
  const frequency = 4;
  // Shift refines up to four times faster; the visual scale must keep up
  // without letting a one-frame directional collision dictate its target.
  const lead = 2 * Math.max(1, Math.min(3, throttle));
  const decay = Math.exp(-frequency * dt);
  for (let step = 0; step < steps; step++) {
    const target = from + (to - from) * ((step + 0.5) / steps);
    const goal = Math.max(level - lead, Math.min(level + lead, target));
    const error = level - goal;
    const spring = velocity + frequency * error;
    level = goal + (error + spring * dt) * decay;
    velocity = (velocity - frequency * spring * dt) * decay;
  }
  return { level: Math.max(0, Math.min(256, level)), velocity };
}
