type DepthOrderWorkspace = {
  bits: Uint32Array;
  keys: Uint32Array;
  scratch: Uint32Array;
  counts: Uint32Array;
};

// Each scene owns a depth array. Retain its sorting storage between frames,
// without adding scratch buffers to the scene's transferable geometry.
const workspaces = new WeakMap<Float32Array, DepthOrderWorkspace>();
const SIGN_BIT = 0x80000000;
const BYTE_BUCKETS = 256;

/** Stable ascending face order, exactly matching the Float32 depth comparator. */
export function sortFloatDepthOrder(
  depths: Float32Array,
  order: Uint32Array,
  count = order.length,
) {
  const visible = order.subarray(0, count);
  // For small constructions the built-in sort avoids the fixed radix setup.
  if (count < BYTE_BUCKETS) return visible.sort((a, b) => depths[a] - depths[b]);

  let workspace = workspaces.get(depths);
  if (!workspace || workspace.scratch.length < count) {
    workspace = {
      bits: new Uint32Array(depths.buffer, depths.byteOffset, depths.length),
      keys: new Uint32Array(depths.length),
      scratch: new Uint32Array(order.length),
      counts: new Uint32Array(BYTE_BUCKETS * 4),
    };
    workspaces.set(depths, workspace);
  }
  const { bits, keys, scratch, counts } = workspace;
  counts.fill(0);
  for (let i = 0; i < count; i++) {
    const face = order[i];
    const depth = depths[face];
    // A NaN comparator result is treated as a tie by the built-in sort. Its
    // ordering need not be transitive, so keep that exact fallback behavior.
    if (Number.isNaN(depth)) return visible.sort((a, b) => depths[a] - depths[b]);
    const raw = bits[face];
    // IEEE floats become ordered unsigned integers by reversing negative
    // bits and flipping the positive sign bit. Both zero signs compare equal.
    const key = (depth === 0 ? SIGN_BIT : raw & SIGN_BIT ? ~raw : raw ^ SIGN_BIT) >>> 0;
    keys[face] = key;
    counts[key & 255]++;
    counts[BYTE_BUCKETS + ((key >>> 8) & 255)]++;
    counts[BYTE_BUCKETS * 2 + ((key >>> 16) & 255)]++;
    counts[BYTE_BUCKETS * 3 + (key >>> 24)]++;
  }

  let source = order;
  let target = scratch;
  for (let pass = 0; pass < 4; pass++) {
    const offset = pass * BYTE_BUCKETS;
    const shift = pass * 8;
    let start = 0;
    for (let bucket = 0; bucket < BYTE_BUCKETS; bucket++) {
      const length = counts[offset + bucket];
      counts[offset + bucket] = start;
      start += length;
    }
    // Scattering in source order preserves ties, including coplanar faces.
    for (let i = 0; i < count; i++) {
      const face = source[i];
      target[counts[offset + ((keys[face] >>> shift) & 255)]++] = face;
    }
    const previous = source;
    source = target;
    target = previous;
  }
  // Four passes leave the result in the caller's original order buffer.
  return visible;
}
