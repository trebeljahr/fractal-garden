import type { GpuFrame, GpuShape, GpuTransform } from "./model";

type V3 = [number, number, number];
type Matrix = [V3, V3, V3];
type Prepared = {
  center: V3;
  inverse: Matrix;
  inverseNorm: number;
  nominalSize: number;
  forwardNorm: number;
  geometryError: number;
};
type Node = {
  origin: V3;
  error: number;
  distanceScale: number;
  nominalSize: number;
  rank: number;
  continuation: boolean;
  depth: number;
  lower: number;
};
export type RomanescoCpuClearanceOptions = {
  maxRank?: number;
  growth?: number;
  /** At most this many child bounds are evaluated, apart from the local roots. */
  maxChildEvaluations?: number;
  maxDepth?: number;
  relativeTolerance?: number;
};
export type RomanescoCpuClearanceResult = {
  distance: number;
  expanded: number;
  evaluated: number;
  pending: number;
  budgetExhausted: boolean;
};

const F32_EPSILON = 2 ** -24;
const ROUNDING_ALLOWANCE = 64 * F32_EPSILON;
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v: V3) => Math.hypot(v[0], v[1], v[2]);
const clamp = (x: number, low: number, high: number) => Math.max(low, Math.min(high, x));
const matrixNormUpper = (rows: Matrix) => {
  // Gershgorin on M*M^T. Tight for a similarity, conservative after Float32
  // packing has perturbed its orthogonality. No assumption of perfect axes.
  let square = 0;
  for (let i = 0; i < 3; i++) {
    let sum = dot(rows[i], rows[i]);
    for (let j = 0; j < 3; j++) if (i !== j) sum += Math.abs(dot(rows[i], rows[j]));
    square = Math.max(square, sum);
  }
  return Math.sqrt(square) * (1 + 32 * Number.EPSILON);
};
function invert(rows: Matrix): Matrix {
  const [a, b, c] = rows;
  const x: V3 = [b[1] * c[2] - b[2] * c[1], b[2] * c[0] - b[0] * c[2], b[0] * c[1] - b[1] * c[0]];
  const y: V3 = [c[1] * a[2] - c[2] * a[1], c[2] * a[0] - c[0] * a[2], c[0] * a[1] - c[1] * a[0]];
  const z: V3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const determinant = dot(a, x);
  return [0, 1, 2].map((i) => [
    x[i] / determinant,
    y[i] / determinant,
    z[i] / determinant,
  ]) as Matrix;
}
function prepareTransform(t: GpuTransform, radius: number, growth = 1): Prepared {
  const base = t.center.map(Math.fround) as V3;
  const axes = t.axes.map((column) => column.map(Math.fround)) as Matrix;
  let nominalSize = Math.fround(norm(t.axes[0]));
  const center = base.slice() as V3;
  if (growth !== 1) {
    const offset = Math.fround(growth - 1);
    for (let i = 0; i < 3; i++)
      center[i] = Math.fround(center[i] + Math.fround(axes[1][i] * offset));
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) axes[i][j] = Math.fround(axes[i][j] * growth);
    nominalSize = Math.fround(nominalSize * growth);
  }
  const denominator = Math.fround(nominalSize * nominalSize);
  const inverse = axes.map((column) => column.map((v) => v / denominator)) as Matrix;
  const forward = invert(inverse);
  let differenceSquared = 0,
    centerDifferenceSquared = 0;
  for (let i = 0; i < 3; i++) {
    const idealCenter = t.center[i] + t.axes[1][i] * (growth - 1);
    centerDifferenceSquared += (center[i] - idealCenter) ** 2;
    for (let j = 0; j < 3; j++) differenceSquared += (forward[i][j] - t.axes[j][i] * growth) ** 2;
  }
  // The extra allowance also covers either contracted or separate multiply/add
  // evaluation of the growth translation in the fragment shader.
  const growthError = growth === 1 ? 0 : ROUNDING_ALLOWANCE * (norm(base) + norm(t.axes[1]));
  return {
    center,
    inverse,
    inverseNorm: matrixNormUpper(inverse),
    nominalSize,
    forwardNorm: matrixNormUpper(forward),
    geometryError:
      Math.sqrt(centerDifferenceSquared) + radius * Math.sqrt(differenceSquared) + growthError,
  };
}

type Geometry = {
  normal: Prepared[];
  grown?: Prepared[];
  growth?: number;
  envelopeSlack: number;
  grownSlack?: number;
  slope: number;
};
const geometries = new WeakMap<GpuShape, Geometry>();
function geometryFor(shape: GpuShape, growth: number) {
  let geometry = geometries.get(shape);
  const slack = (children: Prepared[], slope: number) =>
    Math.max(
      2 * Math.abs(slope - shape.coneSlope!),
      ...children.map((child) => child.geometryError / Math.max(1e-12, 1 - child.forwardNorm)),
    ) + 1e-7;
  if (!geometry) {
    const normal = shape.children.map((child) => prepareTransform(child, shape.radius));
    const slope = Math.fround(shape.coneSlope!);
    geometry = { normal, slope, envelopeSlack: slack(normal, slope) };
    geometries.set(shape, geometry);
  }
  if (growth > 0 && growth !== 1 && geometry.growth !== growth) {
    geometry.growth = growth;
    geometry.grown = shape.children.map((child) => prepareTransform(child, shape.radius, growth));
    geometry.grownSlack = Math.max(geometry.envelopeSlack, slack(geometry.grown, geometry.slope));
  }
  return geometry;
}

/** Distance to the solid circular cone, reduced to its radial cross-section. */
export function solidConeDistance(origin: V3, slope: number) {
  const radial = Math.hypot(origin[0], origin[2]),
    y = origin[1],
    radius = 2 * slope;
  if (y >= -1 && y <= 1 && radial <= slope * (1 - y)) return 0;
  const along = clamp((radial * radius - 2 * (y - 1)) / (radius * radius + 4), 0, 1);
  const side = Math.hypot(radial - along * radius, y - (1 - 2 * along));
  const base = Math.hypot(Math.max(0, radial - radius), y + 1);
  return Math.min(side, base);
}

function envelopeDistance(shape: GpuShape, origin: V3) {
  // Each term is a distance lower bound to an enclosing convex set. The round
  // top cone dominates the twelve tangent side planes in shape.hull.
  const radial = Math.hypot(origin[0], origin[2]),
    k = shape.boundConeSlope!;
  return Math.max(
    0,
    (radial - k * (1 - origin[1])) / Math.hypot(1, k),
    shape.boundConeBase! - origin[1],
    origin[1] - 1,
    radial - shape.boundCylinderRadius!,
  );
}

function transformed(
  parent: Pick<Node, "origin" | "error" | "distanceScale" | "nominalSize">,
  t: Prepared,
) {
  const delta = parent.origin.map((v, i) => v - t.center[i]) as V3;
  const origin = t.inverse.map((row) => dot(row, delta)) as V3;
  // Absolute error in local units. Sixty-four Float32 unit roundoffs cover
  // translation, three dot products, division and their contraction choices.
  // Including the cone neighbourhood handles errors at its surface as well as
  // at the eye. JS arithmetic has a much smaller error than this allowance.
  const error =
    t.inverseNorm *
    (parent.error +
      ROUNDING_ALLOWANCE * (norm(parent.origin) + norm(t.center) + t.nominalSize * 4));
  return {
    origin,
    error,
    distanceScale: parent.distanceScale / t.inverseNorm,
    nominalSize: parent.nominalSize * t.nominalSize,
  };
}

/**
 * Certified lower bound to the retained union. An unfinished frontier remains
 * part of the result; exhausting work never silently drops its geometry.
 */
export function romanescoCpuClearance(
  frame: GpuFrame,
  options: RomanescoCpuClearanceOptions = {},
): RomanescoCpuClearanceResult {
  if (frame.shape.kind !== 3) throw new Error("CPU clearance expects a Romanesco frame.");
  const { shape } = frame;
  const maxRank = options.maxRank ?? 1000,
    growth = Math.fround(clamp(options.growth ?? 1, 0, 1));
  const budget = Math.max(0, Math.floor(options.maxChildEvaluations ?? 2048));
  const maxDepth = Math.max(0, Math.floor(options.maxDepth ?? 40));
  const tolerance = clamp(options.relativeTolerance ?? 0.03, 0, 1);
  const geometry = geometryFor(shape, growth);
  const slack = growth !== 1 && growth > 0 ? geometry.grownSlack! : geometry.envelopeSlack;
  const heap: Node[] = [];
  let resolved = frame.horizon,
    expanded = 0,
    evaluated = 0,
    budgetExhausted = false;
  const push = (node: Node) => {
    let at = heap.length;
    heap.push(node);
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (heap[parent].lower <= node.lower) break;
      heap[at] = heap[parent];
      at = parent;
    }
    heap[at] = node;
  };
  const pop = () => {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let at = 0;
      while (at * 2 + 1 < heap.length) {
        let child = at * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1].lower < heap[child].lower) child++;
        if (heap[child].lower >= last.lower) break;
        heap[at] = heap[child];
        at = child;
      }
      heap[at] = last;
    }
    return first;
  };
  const localLower = (node: Node, local: number) =>
    Math.max(0, (local - node.error) * node.distanceScale);
  const finish = (distance: number) => ({
    distance: Number.isFinite(distance) ? Math.max(0, distance - 1e-8 * Math.max(1, distance)) : 0,
    expanded,
    evaluated,
    pending: heap.length,
    budgetExhausted,
  });
  const eye = { origin: [0, 0, 0] as V3, error: 0, distanceScale: 1, nominalSize: 1 };
  for (const root of frame.roots) {
    if (root.cone) {
      resolved = Math.min(resolved, Math.max(0, root.cone.clearance));
      continue;
    }
    if (root.continuation && root.rank >= maxRank) continue;
    const node: Node = {
      ...transformed(eye, prepareTransform(root, shape.radius)),
      rank: root.rank,
      continuation: !!root.continuation,
      depth: 0,
      lower: 0,
    };
    node.lower = localLower(node, envelopeDistance(shape, node.origin) - slack);
    if (!Number.isFinite(node.lower) || !Number.isFinite(node.error)) return finish(0);
    if (node.lower < resolved) push(node);
  }
  while (heap.length && resolved > 0) {
    const node = heap[0];
    if (node.lower >= resolved || node.lower >= resolved * (1 - tolerance)) break;
    if (!node.continuation) {
      const core = localLower(node, solidConeDistance(node.origin, geometry.slope));
      resolved = Math.min(resolved, Math.max(node.lower, core));
      if (resolved <= 0) return finish(0);
    }
    // A finite terminal contains only its retained core. An unresolved spatial
    // terminal must retain its envelope in the frontier/result instead.
    if (node.rank >= maxRank) {
      pop();
      continue;
    }
    if (
      node.depth >= maxDepth ||
      node.nominalSize * shape.radius <= Math.max(0.00002, node.lower * tolerance)
    )
      break;
    let childCount = 0;
    for (const child of shape.children) {
      if (node.continuation && child.baseCover) continue;
      if (node.rank + child.rank === maxRank && growth === 0) continue;
      childCount++;
    }
    if (evaluated + childCount > budget) {
      budgetExhausted = true;
      break;
    }
    // Keep the parent live until this entire atomic expansion is admitted.
    // All children are evaluated before the next budget decision.
    pop();
    expanded++;
    for (let index = 0; index < shape.children.length; index++) {
      const child = shape.children[index];
      if (node.continuation && child.baseCover) continue;
      const lastRank = node.rank + child.rank === maxRank;
      if (lastRank && growth === 0) continue;
      const t = lastRank && growth !== 1 ? geometry.grown![index] : geometry.normal[index];
      const next: Node = {
        ...transformed(node, t),
        rank: node.rank + child.rank,
        continuation: !!child.continuation,
        depth: node.depth + 1,
        lower: 0,
      };
      evaluated++;
      next.lower = Math.max(
        node.lower,
        localLower(next, envelopeDistance(shape, next.origin) - slack),
      );
      if (!Number.isFinite(next.lower) || !Number.isFinite(next.error)) return finish(0);
      if (next.lower < resolved && !(next.continuation && next.rank >= maxRank)) push(next);
    }
  }
  return finish(Math.min(resolved, heap.length ? heap[0].lower : frame.horizon));
}
