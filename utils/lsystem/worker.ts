import { expand, type Geometry, interpret } from "./engine";
import type { ColorMode, LSystemSpec } from "./spec";

export type WorkerRequest = {
  id: number;
  spec: LSystemSpec;
  iterations: number;
};

export type WorkerResult = {
  id: number;
  // The sentence itself stays in the worker; the page only shows its length.
  expansion: { length: number; iterations: number; limited: boolean };
  geometry: Geometry;
  // Color position 0..1 per segment, for the gradient and depth modes.
  colors: Float32Array;
  // Segments the turtle drew, before repeats were dropped.
  lines: number;
  center: [number, number, number];
  radius: number;
};

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResult, transfer: Transferable[]) => void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, spec, iterations } = event.data;
  const expansion = expand(spec, iterations);
  const geometry = interpret(expansion.sentence, spec);
  const lines = geometry.count;
  geometry.count = dropRepeats(geometry);
  const colors = colorSegments(geometry, spec.colorMode);
  const { center, radius } = bounds(geometry);

  scope.postMessage(
    {
      id,
      expansion: {
        length: expansion.sentence.length,
        iterations: expansion.iterations,
        limited: expansion.limited,
      },
      geometry,
      colors,
      lines,
      center,
      radius,
    },
    [geometry.positions.buffer, geometry.widths.buffer, geometry.depths.buffer, colors.buffer],
  );
};

function bounds(geometry: Geometry) {
  const { positions, count, min, max } = geometry;
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  // The farthest endpoint from the center fits tighter than the bounding box
  // diagonal, which matters for wide, flat shapes such as tree crowns.
  let farthest = 0;
  for (let o = 0; o < count * 6; o += 3) {
    const d =
      (positions[o] - center[0]) ** 2 +
      (positions[o + 1] - center[1]) ** 2 +
      (positions[o + 2] - center[2]) ** 2;
    if (d > farthest) farthest = d;
  }
  return { center, radius: Math.max(Math.sqrt(farthest), 1e-6) };
}

// Curves that retrace the same edges (F -> F&F, spirals) can stack thousands
// of copies of one segment. Past a few copies they add no brightness, only
// GPU fill cost, so later repeats are dropped in place, keeping the order.
const MAX_COPIES = 4;

function dropRepeats(geometry: Geometry) {
  const { positions, widths, depths, count, min, max } = geometry;
  if (count < 2) return count;
  const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1e-9);
  const scale = 1e6 / span;
  let size = 1;
  while (size < count * 2) size *= 2;
  const slots = new Int32Array(size).fill(-1);
  const copies = new Uint8Array(size);
  const key = new Int32Array(7);
  const other = new Int32Array(7);

  // Quantized endpoints, smaller endpoint first so A->B equals B->A.
  const quantize = (i: number, out: Int32Array) => {
    const o = i * 6;
    for (let k = 0; k < 3; k++) {
      out[k] = Math.round((positions[o + k] - min[k]) * scale);
      out[k + 3] = Math.round((positions[o + 3 + k] - min[k]) * scale);
    }
    if (
      out[0] > out[3] ||
      (out[0] === out[3] && (out[1] > out[4] || (out[1] === out[4] && out[2] > out[5])))
    ) {
      for (let k = 0; k < 3; k++) {
        const t = out[k];
        out[k] = out[k + 3];
        out[k + 3] = t;
      }
    }
    out[6] = Math.round(widths[i] * 1000);
  };

  let kept = 0;
  for (let i = 0; i < count; i++) {
    quantize(i, key);
    let h = 0x811c9dc5;
    for (let k = 0; k < 7; k++) h = Math.imul(h ^ key[k], 0x01000193);
    let slot = (h >>> 0) & (size - 1);
    let keep = true;
    while (slots[slot] !== -1) {
      quantize(slots[slot], other);
      let same = true;
      for (let k = 0; k < 7; k++) {
        if (key[k] !== other[k]) {
          same = false;
          break;
        }
      }
      if (same) {
        if (copies[slot] >= MAX_COPIES) keep = false;
        else copies[slot]++;
        break;
      }
      slot = (slot + 1) & (size - 1);
    }
    if (!keep) continue;
    if (slots[slot] === -1) {
      // Store the kept index, so later comparisons read moved data correctly.
      slots[slot] = kept;
      copies[slot] = 1;
    }
    if (kept !== i) {
      positions.copyWithin(kept * 6, i * 6, i * 6 + 6);
      widths[kept] = widths[i];
      depths[kept] = depths[i];
    }
    kept++;
  }
  return kept;
}

// Segments are blended in order. In the depth mode they are sorted by depth
// (a stable counting sort), so deeper branches paint over shallower ones, as
// they did when the canvas renderer stroked one color at a time.
function colorSegments(geometry: Geometry, colorMode: ColorMode) {
  const { positions, widths, depths, maxDepth, count } = geometry;
  const colors = new Float32Array(count);

  if (colorMode === "gradient" && count > 1) {
    for (let i = 0; i < count; i++) colors[i] = i / (count - 1);
  }

  if (colorMode === "depth" && maxDepth > 0) {
    const starts = new Uint32Array(maxDepth + 2);
    for (let i = 0; i < count; i++) starts[depths[i] + 1]++;
    for (let k = 0; k <= maxDepth; k++) starts[k + 1] += starts[k];
    const sortedPositions = new Float32Array(count * 6);
    const sortedWidths = new Float32Array(count);
    const sortedDepths = new Uint16Array(count);
    for (let i = 0; i < count; i++) {
      const j = starts[depths[i]]++;
      sortedPositions.set(positions.subarray(i * 6, i * 6 + 6), j * 6);
      sortedWidths[j] = widths[i];
      sortedDepths[j] = depths[i];
      colors[j] = depths[i] / maxDepth;
    }
    geometry.positions = sortedPositions;
    geometry.widths = sortedWidths;
    geometry.depths = sortedDepths;
  }

  return colors;
}
