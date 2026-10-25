/** Encode a bound endpoint in binary16, rounding strictly toward the outside. */
function halfBound(value: number, upper: boolean) {
  if (!Number.isFinite(value) || Math.abs(value) > 65504)
    throw new Error("The child BVH exceeds finite half-float coordinates.");
  if (value === 0) return 0;
  const negative = value < 0,
    magnitude = Math.abs(value);
  const round = upper !== negative ? Math.ceil : Math.floor;
  let bits: number;
  if (magnitude < 2 ** -14) bits = round(magnitude * 2 ** 24);
  else {
    const exponent = Math.floor(Math.log2(magnitude));
    bits = (exponent + 15) * 1024 + round(magnitude / 2 ** (exponent - 10)) - 1024;
  }
  return bits | (negative ? 0x8000 : 0);
}

/** One integer texel per threaded BVH node, with conservative half-float bounds. */
export function packGpuChildBounds(bounds: { data: Float32Array; nodeCount: number }) {
  if (!bounds.nodeCount) return { data: new Uint32Array(4), nodeCount: 0 };
  const rows = bounds.data.length / 8;
  const data = new Uint32Array(rows * 4);
  for (let row = 0; row < rows; row++) {
    const input = row * 8,
      output = row * 4;
    for (let axis = 0; axis < 3; axis++)
      data[output + axis] =
        halfBound(bounds.data[input + axis], false) |
        (halfBound(bounds.data[input + 4 + axis], true) << 16);
    const leaf = bounds.data[input + 3] + 1,
      escapeAt = bounds.data[input + 7];
    if (
      !Number.isInteger(leaf) ||
      leaf < 0 ||
      leaf > 65535 ||
      !Number.isInteger(escapeAt) ||
      escapeAt < 0 ||
      escapeAt > 65535
    )
      throw new Error("The child BVH exceeds packed traversal indices.");
    data[output + 3] = leaf | (escapeAt << 16);
  }
  return { data, nodeCount: bounds.nodeCount };
}
