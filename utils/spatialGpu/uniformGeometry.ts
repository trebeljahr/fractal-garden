export const ROMANESCO_UNIFORM_CHILD_CAPACITY = 112;
export const ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY =
  4 * (2 * ROMANESCO_UNIFORM_CHILD_CAPACITY - 1);

/** Exact std140 records, each block smaller than WebGL2's guaranteed 16 KiB. */
export function packGpuRomanescoUniformGeometry(
  orderedChildren: Float32Array,
  bounds: { data: Uint32Array; nodeCount: number },
) {
  const childCount = orderedChildren.length / (8 * 16);
  if (
    !Number.isInteger(childCount) ||
    childCount < 1 ||
    childCount > ROMANESCO_UNIFORM_CHILD_CAPACITY
  )
    throw new Error("Romanesco children exceed uniform geometry capacity.");
  if (
    !Number.isInteger(bounds.nodeCount) ||
    bounds.nodeCount < 0 ||
    bounds.nodeCount > 2 * ROMANESCO_UNIFORM_CHILD_CAPACITY - 1 ||
    bounds.data.length !== (bounds.nodeCount ? bounds.nodeCount * 8 * 4 : 4)
  )
    throw new Error("Romanesco bounds exceed uniform geometry capacity.");

  const transformBytes = ROMANESCO_UNIFORM_CHILD_CAPACITY * 4 * 16;
  const childBuffer = new ArrayBuffer(transformBytes + ROMANESCO_UNIFORM_CHILD_CAPACITY * 2 * 16);
  const canonicalBits = new Uint32Array(childBuffer, 0, ROMANESCO_UNIFORM_CHILD_CAPACITY * 16);
  const sourceBits = new Uint32Array(
    orderedChildren.buffer,
    orderedChildren.byteOffset,
    orderedChildren.length,
  );
  canonicalBits.set(sourceBits.subarray(0, childCount * 16));
  const order = new Uint32Array(childBuffer, transformBytes, ROMANESCO_UNIFORM_CHILD_CAPACITY * 8);
  for (let row = 0; row < childCount * 8; row++) {
    const canonical = orderedChildren[row * 16 + 15];
    if (!Number.isInteger(canonical) || canonical < 0 || canonical >= childCount)
      throw new Error("Romanesco child order contains an invalid canonical row.");
    for (let value = 0; value < 16; value++)
      if (sourceBits[row * 16 + value] !== canonicalBits[canonical * 16 + value])
        throw new Error("Romanesco octant transforms must match their canonical rows exactly.");
    order[row] = canonical;
  }
  const halfWords = ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY * 4;
  const bounds0 = new Uint32Array(halfWords);
  const bounds1 = new Uint32Array(halfWords);
  if (bounds.nodeCount) {
    bounds0.set(bounds.data.subarray(0, halfWords));
    bounds1.set(bounds.data.subarray(halfWords));
  }
  return { children: new Uint8Array(childBuffer), bounds0, bounds1 };
}
