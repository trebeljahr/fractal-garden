import { radians } from "./ctxHelpers";

/** Row-major 3x3 rotation matrix. View space has x right, y up, z towards the viewer. */
export type Orientation = number[];

export const IDENTITY: Orientation = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function multiply(a: Orientation, b: Orientation): Orientation {
  const out = new Array<number>(9);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      out[row * 3 + col] =
        a[row * 3] * b[col] + a[row * 3 + 1] * b[3 + col] + a[row * 3 + 2] * b[6 + col];
    }
  }
  return out;
}

/**
 * The full model-to-view rotation: turn (degrees) spins the model around its
 * own vertical axis, tilt (degrees) leans it towards the viewer, and `grab`
 * holds what dragging added on top, in view space.
 */
export function viewRotation(tilt: number, turn: number, grab: Orientation = IDENTITY) {
  const cx = Math.cos(radians(tilt));
  const sx = Math.sin(radians(tilt));
  const cy = Math.cos(radians(turn));
  const sy = Math.sin(radians(turn));
  const tiltTurn = [cy, 0, sy, sx * sy, cx, -sx * cy, -cx * sy, sx, cx * cy];
  return multiply(grab, tiltTurn);
}

/**
 * Turns `grab` the way a drag of (dx, dy) screen pixels would turn an object
 * held under the cursor: the near side follows the pointer, whatever way the
 * object currently faces. `angle` is the rotation in radians.
 */
export function dragRotation(grab: Orientation, dx: number, dy: number, angle: number) {
  const length = Math.hypot(dx, dy);
  if (length === 0 || angle === 0) return grab;
  // Screen y points down, view y up: a drag to the right turns around +y, a
  // drag downwards around +x.
  const ax = dy / length;
  const ay = dx / length;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const turn = [
    c + t * ax * ax,
    t * ax * ay,
    s * ay,
    t * ax * ay,
    c + t * ay * ay,
    -s * ax,
    -s * ay,
    s * ax,
    c,
  ];
  return orthonormalize(multiply(turn, grab));
}

// Keeps rounding errors from many small drags from skewing the matrix.
function orthonormalize(m: Orientation): Orientation {
  const x = [m[0], m[1], m[2]];
  const lx = Math.hypot(x[0], x[1], x[2]);
  for (let i = 0; i < 3; i++) x[i] /= lx;
  const d = x[0] * m[3] + x[1] * m[4] + x[2] * m[5];
  const y = [m[3] - d * x[0], m[4] - d * x[1], m[5] - d * x[2]];
  const ly = Math.hypot(y[0], y[1], y[2]);
  for (let i = 0; i < 3; i++) y[i] /= ly;
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [...x, ...y, ...z];
}
