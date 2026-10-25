import { fixedFromNumber, rescaleFixed } from "../deepZoom/math";
import {
  dodecahedronMesh,
  icosahedronMesh,
  type Mesh,
  octahedronMesh,
  squarePyramidMesh,
  tetrahedronMesh,
} from "../polyhedronFractals";
import type { SceneSpec } from "../render/scene3d";
import {
  ROMANESCO_BOUND,
  ROMANESCO_CHILDREN,
  ROMANESCO_PLACEMENT_RADIUS,
  ROMANESCO_RADIUS,
  ROMANESCO_ROOT,
} from "../romanesco";
import {
  type BigVec3,
  CAMERA_DISTANCE,
  cameraTarget,
  inverseRotate,
  relativeNumber,
  rotationOf,
  type SpatialCamera,
  type Vec3,
} from "../spatial/camera";
import type { SpatialStyle } from "../spatial/geometry";

export type GpuSpatialSpec = Extract<
  SceneSpec,
  { kind: "jerusalem" | "flake" | "kochSurface" | "quadraticKoch3d" | "romanesco" }
>;
export type Plane = [number, number, number, number];
/** Columns include uniform scale. All constructions are similarities. */
export type AncestorCone = {
  linear: Vec3;
  constant: number;
  axis: Vec3;
  quadraticScale: number;
  baseDistance: number;
  tipDistance: number;
  clearance: number;
};
export type GpuTransform = {
  center: Vec3;
  axes: [Vec3, Vec3, Vec3];
  rank: number;
  /** An ancestor's retained core, rebased analytically before float conversion. */
  cone?: AncestorCone;
};
export type GpuShape = {
  spec: GpuSpatialSpec;
  kind: 0 | 1 | 2 | 3;
  coneSlope?: number;
  boundConeSlope?: number;
  children: GpuTransform[];
  roots: GpuTransform[];
  hull: Plane[];
  edges: Plane[];
  low: Vec3;
  high: Vec3;
  radius: number;
  /** Smallest child feature resolved before replacing this primitive. */
  featureSize: number;
  seedVertices?: Vec3[];
  rootTriangles?: Vec3[][];
};
export type GpuFrame = {
  shape: GpuShape;
  roots: GpuTransform[];
  rootData: Float32Array;
  horizon: number;
  visited: number;
  camera: SpatialCamera;
  style: SpatialStyle;
  frontier: { bits: number; zoom: number; eye: BigVec3; reach: bigint; roots: FixedTransform[] };
};
export const MAX_GPU_ROOTS = 512;
export const GPU_STACK_DEPTH = 40;
export type GpuStackOptions = {
  minimumFootprint?: number;
  maxRank?: number;
  clearance?: boolean;
};
const childScaleCache = new WeakMap<GpuShape, number>();
/** Choose a smaller compiled stack only when the normal stopping rule proves it sufficient. */
export function selectGpuStackDepth(
  frame: Pick<GpuFrame, "shape" | "roots">,
  options: GpuStackOptions = {},
): 16 | 24 | 40 {
  if (frame.shape.kind !== 3) return 40;
  let ratio = childScaleCache.get(frame.shape);
  if (ratio === undefined) {
    ratio = Math.max(...frame.shape.children.map(transformSize));
    childScaleCache.set(frame.shape, ratio);
  }
  const floor = options.clearance ? 0.00002 : (options.minimumFootprint ?? 0);
  const feature = options.clearance ? frame.shape.radius : frame.shape.featureSize;
  const rankLimit = Number.isFinite(options.maxRank) ? options.maxRank! : Infinity;
  let required = 1;
  for (const root of frame.roots) {
    if (root.cone) continue;
    const rankDepth = Math.max(0, Math.ceil(rankLimit - root.rank));
    let detailDepth = Infinity;
    if (Number.isFinite(floor) && floor > 0 && ratio > 0 && ratio < 1) {
      let bound = transformSize(root) * feature;
      for (let depth = 0; depth < 40; depth++, bound *= ratio) {
        if (bound <= floor) {
          // One complete extra level covers floating-point rounding near a cutoff.
          detailDepth = depth + 1;
          break;
        }
      }
    }
    required = Math.max(required, Math.min(rankDepth, detailDepth) + 1);
    if (required > 24) return 40;
  }
  return required <= 16 ? 16 : 24;
}
export const add = (a: Vec3, b: Vec3): Vec3 => a.map((v, i) => v + b[i]) as Vec3;
export const sub = (a: Vec3, b: Vec3): Vec3 => a.map((v, i) => v - b[i]) as Vec3;
export const scale = (a: Vec3, s: number): Vec3 => a.map((v) => v * s) as Vec3;
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normalize = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(...a) || 1));
const identity = (s = 1): [Vec3, Vec3, Vec3] => [
  [s, 0, 0],
  [0, s, 0],
  [0, 0, s],
];
const transform = (center: Vec3 = [0, 0, 0], axes = identity(), rank = 0): GpuTransform => ({
  center,
  axes,
  rank,
});
export const applyVector = (a: GpuTransform, p: Vec3): Vec3 =>
  [0, 1, 2].map((i) => a.axes[0][i] * p[0] + a.axes[1][i] * p[1] + a.axes[2][i] * p[2]) as Vec3;
export const applyPoint = (a: GpuTransform, p: Vec3): Vec3 => add(a.center, applyVector(a, p));
export const composeTransforms = (a: GpuTransform, b: GpuTransform): GpuTransform =>
  transform(
    applyPoint(a, b.center),
    b.axes.map((v) => applyVector(a, v)) as [Vec3, Vec3, Vec3],
    a.rank + b.rank,
  );
export const transformSize = (a: GpuTransform) => Math.hypot(...a.axes[0]);
export const inverseVector = (a: GpuTransform, p: Vec3): Vec3 =>
  a.axes.map((v) => dot(v, p) / dot(v, v)) as Vec3;
export const inversePoint = (a: GpuTransform, p: Vec3) => inverseVector(a, sub(p, a.center));

function meshPlanes(mesh: Mesh): Plane[] {
  return mesh.faces.map((f) => {
    const a = mesh.vertices[f[0]],
      b = mesh.vertices[f[1]],
      c = mesh.vertices[f[2]];
    let n = normalize(cross(sub(b, a), sub(c, a)));
    let h = dot(n, a);
    if (mesh.vertices.some((p) => dot(n, p) > h + 1e-7)) {
      n = scale(n, -1);
      h = -h;
    }
    return [...n, h] as Plane;
  });
}
const CUBE: Mesh = {
  vertices: [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ],
  faces: [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 4, 7, 3],
    [1, 2, 6, 5],
    [0, 1, 5, 4],
    [3, 7, 6, 2],
  ],
};
export const TRIANGLE: Vec3[] = [
  [-0.5, -Math.sqrt(3) / 6, 0],
  [0.5, -Math.sqrt(3) / 6, 0],
  [0, Math.sqrt(3) / 3, 0],
];
function triangleTransform(points: Vec3[], rank = 0) {
  const u = sub(points[1], points[0]),
    size = Math.hypot(...u);
  const n = normalize(cross(u, sub(points[2], points[0])));
  return transform(
    scale(points.reduce(add, [0, 0, 0]), 1 / 3),
    [u, scale(cross(n, normalize(u)), size), scale(n, size)],
    rank,
  );
}

const shapeCache = new Map<string, GpuShape>();
export function buildGpuShape(spec: GpuSpatialSpec): GpuShape {
  const key = JSON.stringify(spec),
    cached = shapeCache.get(key);
  if (cached) return cached;
  let kind: GpuShape["kind"] = 0,
    vertices: Vec3[],
    hull: Plane[],
    edges: Plane[] = [],
    roots: GpuTransform[] = [transform()],
    children: GpuTransform[] = [],
    rootTriangles: Vec3[][] | undefined;
  if (spec.kind === "romanesco") {
    kind = 3;
    // Tangent planes enclose the circular construction envelope. Because each
    // child tip lies on that envelope and its whole cone fits below it, the
    // same 13 planes conservatively bound every descendant, not just the core.
    const sides = 12,
      slope = ROMANESCO_PLACEMENT_RADIUS / 2,
      length = Math.hypot(1, slope),
      radius = ROMANESCO_PLACEMENT_RADIUS / Math.cos(Math.PI / sides);
    vertices = Array.from({ length: sides }, (_, i) => {
      const angle = ((i + 0.5) * 2 * Math.PI) / sides;
      return [radius * Math.cos(angle), -1, radius * Math.sin(angle)] as Vec3;
    });
    vertices.push([0, 1, 0]);
    hull = [
      [0, -1, 0, 1],
      ...Array.from({ length: sides }, (_, i) => {
        const angle = (i * 2 * Math.PI) / sides;
        return [
          Math.cos(angle) / length,
          slope / length,
          Math.sin(angle) / length,
          slope / length,
        ] as Plane;
      }),
    ];
    roots = [transform(ROMANESCO_ROOT.center, identity(ROMANESCO_ROOT.scale))];
    children = ROMANESCO_CHILDREN.map((child) => transform(child.center, child.axes, 1));
  } else if (spec.kind === "flake" || spec.kind === "jerusalem") {
    const meshes = {
      tetrahedron: tetrahedronMesh,
      squarePyramid: squarePyramidMesh,
      octahedron: octahedronMesh,
      dodecahedron: dodecahedronMesh,
      icosahedron: icosahedronMesh,
    };
    const mesh = spec.kind === "jerusalem" ? CUBE : meshes[spec.mesh]();
    vertices = mesh.vertices;
    hull = meshPlanes(mesh);
    if (spec.kind === "flake")
      children = vertices.map((p) => transform(scale(p, 1 - spec.ratio), identity(spec.ratio), 1));
    else
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const middle = Number(x === 0) + Number(y === 0) + Number(z === 0);
            if (middle > 1) continue;
            const r = Math.SQRT2 - 1,
              s = middle ? r * r : r;
            children.push(transform(scale([x, y, z], 1 - s), identity(s), middle ? 2 : 1));
          }
  } else if (spec.kind === "kochSurface") {
    kind = 1;
    const [a, b, c] = TRIANGLE,
      ab = scale(add(a, b), 0.5),
      bc = scale(add(b, c), 0.5),
      ca = scale(add(c, a), 0.5),
      apex: Vec3 = [0, 0, Math.sqrt(2 / 3) / 2];
    vertices = [...TRIANGLE, apex];
    hull = meshPlanes({
      vertices,
      faces: [
        [0, 2, 1],
        [0, 1, 3],
        [1, 2, 3],
        [2, 0, 3],
      ],
    });
    edges = TRIANGLE.map((p, i) => {
      const d = sub(TRIANGLE[(i + 1) % 3], p),
        n = normalize([d[1], -d[0], 0]);
      return [...n, dot(n, p)] as Plane;
    });
    children = [
      [a, ab, ca],
      [ab, b, bc],
      [ca, bc, c],
      [ab, bc, apex],
      [bc, ca, apex],
      [ca, ab, apex],
    ].map((p) => triangleTransform(p, 1));
    if (spec.start === "triangle")
      rootTriangles = [
        [90, 330, 210].map(
          (angle) =>
            [
              1.6 * Math.cos((angle * Math.PI) / 180),
              -0.35,
              1.6 * Math.sin((angle * Math.PI) / 180),
            ] as Vec3,
        ),
      ];
    else {
      const mesh = tetrahedronMesh(1.3);
      rootTriangles = mesh.faces.map((f) => f.map((i) => mesh.vertices[i]));
    }
    roots = rootTriangles.map((points) => triangleTransform(points));
  } else {
    kind = 2;
    vertices = CUBE.vertices.map(([x, y, z]) => [x, y, (z + 1) / 2] as Vec3);
    hull = [
      [1, 0, 0, 1],
      [-1, 0, 0, 1],
      [0, 1, 0, 1],
      [0, -1, 0, 1],
      [0, 0, -1, 0],
      [0, 0, 1, 1],
    ];
    edges = hull.slice(0, 4);
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        if (a || b) children.push(transform([(2 * a) / 3, (2 * b) / 3, 0], identity(1 / 3), 1));
    children.push(transform([0, 0, 2 / 3], identity(1 / 3), 1));
    for (const s of [-1, 1]) {
      children.push(
        transform(
          [s / 3, 0, 1 / 3],
          [
            [0, 0, -s / 3],
            [0, 1 / 3, 0],
            [s / 3, 0, 0],
          ],
          1,
        ),
      );
      children.push(
        transform(
          [0, s / 3, 1 / 3],
          [
            [1 / 3, 0, 0],
            [0, 0, -s / 3],
            [0, s / 3, 0],
          ],
          1,
        ),
      );
    }
    roots = [];
    for (let axis = 0; axis < 3; axis++)
      for (const sign of [-1, 1]) {
        const n: Vec3 = [0, 0, 0],
          u: Vec3 = [0, 0, 0],
          v: Vec3 = [0, 0, 0];
        n[axis] = sign / 2;
        u[(axis + 1) % 3] = 0.5;
        v[(axis + 2) % 3] = sign / 2;
        roots.push(transform(n, [u, v, n]));
      }
  }
  const low = [0, 1, 2].map((i) => Math.min(...vertices.map((p) => p[i]))) as Vec3;
  const high = [0, 1, 2].map((i) => Math.max(...vertices.map((p) => p[i]))) as Vec3;
  const minimumScale = Math.min(...children.map(transformSize));
  let featureSize =
    kind === 1
      ? 0.5
      : kind === 2
        ? 2 / 3
        : kind === 3
          ? 2 * ROMANESCO_RADIUS * Math.max(...children.map(transformSize))
          : 2 * minimumScale;
  if (spec.kind === "flake") {
    let edge = Infinity;
    for (let i = 0; i < vertices.length; i++)
      for (let j = i + 1; j < vertices.length; j++)
        edge = Math.min(edge, Math.hypot(...sub(vertices[i], vertices[j])));
    featureSize = edge * minimumScale;
  }
  const shape = {
    spec,
    kind,
    roots,
    children,
    hull,
    edges,
    low,
    high,
    radius: kind === 3 ? ROMANESCO_BOUND : Math.max(...vertices.map((p) => Math.hypot(...p))),
    coneSlope: kind === 3 ? ROMANESCO_RADIUS / 2 : undefined,
    boundConeSlope: kind === 3 ? ROMANESCO_PLACEMENT_RADIUS / 2 : undefined,
    featureSize,
    seedVertices: kind === 0 ? vertices : undefined,
    rootTriangles,
  };
  shapeCache.set(key, shape);
  return shape;
}

type FixedTransform = {
  center: BigVec3;
  axes: [BigVec3, BigVec3, BigVec3];
  rank: number;
  points?: BigVec3[];
  size?: bigint;
  coreOnly?: boolean;
};
const integerSqrt = (n: bigint) => {
  if (n <= BigInt(0)) return BigInt(0);
  let x = BigInt(1) << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) {
    const next = (x + n / x) / BigInt(2);
    if (next >= x) return x;
    x = next;
  }
};

/**
 * A huge retained core cannot use a rounded centre and scale: their difference
 * loses the nearby surface. Evaluate its quadratic at the exact fixed-point eye
 * first. Dividing by the distance to the apex keeps local coefficients well
 * scaled both beside a huge flank and at its tip, even hundreds of doublings in.
 */
function ancestorCone(
  node: FixedTransform,
  eye: BigVec3,
  bits: number,
  zoom: number,
): AncestorCone {
  const one = BigInt(1) << BigInt(bits),
    square = (v: bigint) => v * v,
    sum = (v: bigint[]) => v.reduce((a, b) => a + b, BigInt(0)),
    size = integerSqrt(sum(node.axes[0].map(square))),
    delta = eye.map((v, i) => v - node.center[i]),
    crossFixed = (a: BigVec3, b: BigVec3) =>
      [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] as BigVec3,
    cofactors = [
      crossFixed(node.axes[1], node.axes[2]),
      crossFixed(node.axes[2], node.axes[0]),
      crossFixed(node.axes[0], node.axes[1]),
    ],
    determinant = sum(node.axes[0].map((v, i) => v * cofactors[0][i])),
    // Use the actual inverse before subtracting a huge surface. Assuming exact
    // orthogonality here amplifies tiny rotation roundoff at deep scales.
    inverseBasis = cofactors.map((row) => row.map((v) => (v * size * one) / determinant)),
    local = inverseBasis.map((axis) => sum(axis.map((v, i) => v * delta[i])) / one),
    slope = fixedFromNumber(ROMANESCO_RADIUS / 2, bits),
    slopeSquared = (slope * slope) / one,
    tip = size - local[1],
    distanceToTip = integerSqrt(square(local[0]) + square(local[2]) + square(tip)),
    normalizer = distanceToTip > BigInt(0) ? distanceToTip : BigInt(1),
    constant =
      ((square(local[0]) + square(local[2])) * one - slopeSquared * square(tip)) /
      (one * normalizer),
    linear = [0, 1, 2].map((i) =>
      relativeNumber(
        (BigInt(2) *
          (local[0] * inverseBasis[0][i] +
            local[2] * inverseBasis[2][i] +
            (slopeSquared * tip * inverseBasis[1][i]) / one)) /
          normalizer,
        bits,
        0,
      ),
    ) as Vec3,
    axis = inverseBasis[1].map((v) => relativeNumber(v, bits, 0)) as Vec3;
  const radial = integerSqrt(square(local[0]) + square(local[2])),
    side =
      ((radial - (slope * tip) / one) *
        fixedFromNumber(1 / Math.sqrt(1 + (ROMANESCO_RADIUS / 2) ** 2), bits)) /
      one,
    lower = [BigInt(0), side, -size - local[1], local[1] - size].reduce((a, b) => (a > b ? a : b)),
    bounded = (v: bigint) => Math.max(-1e30, Math.min(1e30, relativeNumber(v, bits, zoom)));
  return {
    linear,
    constant: bounded(constant),
    axis,
    quadraticScale: 1 / relativeNumber(normalizer, bits, zoom),
    baseDistance: bounded(size + local[1]),
    tipDistance: bounded(tip),
    clearance: Math.max(0, bounded(lower) * (1 - 1e-7) - 1e-8),
  };
}
function localRoot(node: FixedTransform, eye: BigVec3, bits: number, zoom: number): GpuTransform {
  if (node.coreOnly)
    return {
      center: [0, 0, 0],
      axes: identity(),
      rank: node.rank,
      cone: ancestorCone(node, eye, bits, zoom),
    };
  return {
    center: node.center.map((v, i) => relativeNumber(v - eye[i], bits, zoom)) as Vec3,
    axes: node.axes.map((v) => v.map((x) => relativeNumber(x, bits, zoom))) as GpuTransform["axes"],
    rank: node.rank,
  };
}

export function packTransforms(transforms: GpuTransform[], capacity = transforms.length) {
  const data = new Float32Array(capacity * 16);
  transforms.forEach((t, i) => {
    const c = t.cone;
    data.set(
      c
        ? [
            ...c.linear,
            c.constant,
            ...c.axis,
            c.quadraticScale,
            c.baseDistance,
            c.tipDistance,
            t.rank,
            0,
            c.clearance,
            0,
            0,
            1,
          ]
        : [...t.center, t.rank, ...t.axes[0], 0, ...t.axes[1], 0, ...t.axes[2], 0],
      i * 16,
    );
  });
  return data;
}
const octantDirection = (octant: number): Vec3 => [
  octant & 1 ? 1 : -1,
  octant & 2 ? 1 : -1,
  octant & 4 ? 1 : -1,
];
const childrenInOctant = (shape: GpuShape, octant: number) => {
  const direction = octantDirection(octant);
  return shape.children.slice().sort((a, b) => dot(a.center, direction) - dot(b.center, direction));
};
/** Coherent near-first orders reduce traversal without changing intersections. */
export function packOrderedChildren(shape: GpuShape) {
  return packTransforms(
    Array.from({ length: 8 }, (_, octant) => childrenInOctant(shape, octant)).flat(),
  );
}

/**
 * Threaded child BVH. Two texels store low/leaf and high/escape for each node.
 * A leaf bounds the complete circular descendant envelope, not just its seed.
 * Eight preorder layouts change visit order only; every layout has every child.
 */
export function packChildBounds(shape: GpuShape) {
  if (shape.kind !== 3) return { data: new Float32Array(8), nodeCount: 0 };
  type Node = { low: Vec3; high: Vec3; child?: GpuTransform; branches?: [Node, Node] };
  const leaves: Node[] = shape.children.map((child) => {
    const low: Vec3 = [0, 0, 0],
      high: Vec3 = [0, 0, 0];
    for (let axis = 0; axis < 3; axis++) {
      const x = child.axes[0][axis],
        y = child.axes[1][axis],
        z = child.axes[2][axis];
      const radial = ROMANESCO_PLACEMENT_RADIUS * Math.hypot(x, z);
      low[axis] = child.center[axis] - Math.max(-y, y + radial);
      high[axis] = child.center[axis] + Math.max(y, -y + radial);
    }
    return { low, high, child };
  });
  const build = (nodes: Node[]): Node => {
    if (nodes.length === 1) return nodes[0];
    const low = [0, 1, 2].map((i) => Math.min(...nodes.map((n) => n.low[i]))) as Vec3;
    const high = [0, 1, 2].map((i) => Math.max(...nodes.map((n) => n.high[i]))) as Vec3;
    let axis = 0;
    for (let i = 1; i < 3; i++) if (high[i] - low[i] > high[axis] - low[axis]) axis = i;
    nodes.sort((a, b) => a.low[axis] + a.high[axis] - b.low[axis] - b.high[axis]);
    const middle = Math.floor(nodes.length / 2);
    return { low, high, branches: [build(nodes.slice(0, middle)), build(nodes.slice(middle))] };
  };
  const tree = build(leaves),
    nodeCount = shape.children.length * 2 - 1;
  if (nodeCount >= 65536) throw new Error("The child BVH exceeds its packed cursor range.");
  const data = new Float32Array(nodeCount * 8 * 8);
  for (let octant = 0; octant < 8; octant++) {
    const direction = octantDirection(octant);
    const indices = new Map(childrenInOctant(shape, octant).map((child, index) => [child, index]));
    let cursor = 0;
    const flatten = (node: Node) => {
      const at = cursor++,
        offset = (octant * nodeCount + at) * 8;
      if (node.branches) {
        const [a, b] = node.branches;
        const distance = (n: Node) => dot(add(n.low, n.high), direction);
        if (distance(a) <= distance(b)) {
          flatten(a);
          flatten(b);
        } else {
          flatten(b);
          flatten(a);
        }
      }
      // Outward padding keeps Float32 storage conservative at tangencies.
      data.set(
        [
          ...node.low.map((v) => v - 1e-6 * Math.max(1, Math.abs(v))),
          node.child ? indices.get(node.child)! : -1,
          ...node.high.map((v) => v + 1e-6 * Math.max(1, Math.abs(v))),
          cursor,
        ],
        offset,
      );
    };
    flatten(tree);
  }
  return { data, nodeCount };
}

/** Only select local roots here. Their arbitrarily large descendant trees stay on the GPU. */
export function buildGpuFrame(
  shape: GpuShape,
  camera: SpatialCamera,
  style: SpatialStyle,
  options: { horizon?: number; maxRootSize?: number; previous?: GpuFrame } = {},
): GpuFrame {
  const bits = camera.bits,
    one = BigInt(1) << BigInt(bits),
    rotation = rotationOf(style),
    target = cameraTarget(camera);
  const eyeOffset = inverseRotate([0, 0, CAMERA_DISTANCE], rotation);
  const eye = target.map(
    (v, i) => v + fixedFromNumber(eyeOffset[i] * 2 ** -camera.zoom, bits),
  ) as BigVec3;
  const horizon = options.horizon ?? 128;
  // A guarded frontier survives nearby movement and turns. Rebase the same fixed
  // roots before conversion; never transform previously rounded GPU coordinates.
  const reach = fixedFromNumber(horizon * 2 * 2 ** -camera.zoom, bits);
  const previous = options.previous;
  if (previous?.shape === shape && Math.abs(camera.zoom - previous.frontier.zoom) < 0.5) {
    const old = previous.frontier,
      currentEye = eye.map((v) => rescaleFixed(v, bits, old.bits)) as BigVec3;
    const required = fixedFromNumber(horizon * 2 ** -camera.zoom, old.bits);
    if (
      currentEye.every((v, i) => {
        const delta = v - old.eye[i];
        return (delta < BigInt(0) ? -delta : delta) + required <= old.reach;
      })
    ) {
      const roots = old.roots.map((node) => localRoot(node, currentEye, old.bits, camera.zoom));
      return {
        shape,
        roots,
        rootData: packTransforms(roots, MAX_GPU_ROOTS),
        horizon,
        visited: 0,
        camera,
        style,
        frontier: old,
      };
    }
  }
  const toFixed = (t: GpuTransform): FixedTransform => ({
    center: t.center.map((v) => fixedFromNumber(v, bits)) as BigVec3,
    axes: t.axes.map((p) => p.map((v) => fixedFromNumber(v, bits))) as FixedTransform["axes"],
    rank: t.rank,
  });
  const big = (p: Vec3) => p.map((v) => fixedFromNumber(v, bits)) as BigVec3;
  const plus = (a: BigVec3, b: BigVec3) => a.map((v, i) => v + b[i]) as BigVec3;
  const minus = (a: BigVec3, b: BigVec3) => a.map((v, i) => v - b[i]) as BigVec3;
  const times = (a: BigVec3, b: bigint, d = one) => a.map((v) => (v * b) / d) as BigVec3;
  const midpoint = (a: BigVec3, b: BigVec3) => times(plus(a, b), BigInt(1), BigInt(2));
  const triangleNode = (points: BigVec3[], rank: number): FixedTransform => {
    const [a, b, c] = points,
      u = minus(b, a),
      ac = minus(c, a);
    const un = u.map((v) => relativeNumber(v, bits, 0)) as Vec3,
      acn = ac.map((v) => relativeNumber(v, bits, 0)) as Vec3;
    const size = fixedFromNumber(Math.hypot(...un), bits),
      normal = normalize(cross(normalize(un), normalize(acn)));
    const v = times(minus(c, midpoint(a, b)), fixedFromNumber(2 / Math.sqrt(3), bits));
    return {
      center: times(points.reduce(plus, [BigInt(0), BigInt(0), BigInt(0)]), BigInt(1), BigInt(3)),
      axes: [u, v, times(big(normal), size)],
      rank,
      points,
      size,
    };
  };
  const triangleApex = (node: FixedTransform) =>
    plus(node.center, times(node.axes[2], fixedFromNumber(Math.sqrt(2 / 3) / 2, bits)));
  const roots = shape.rootTriangles
    ? shape.rootTriangles.map((points) => triangleNode(points.map(big), 0))
    : shape.roots.map(toFixed);
  const fixedRatio = fixedFromNumber(
    shape.spec.kind === "flake" ? shape.spec.ratio : Math.SQRT2 - 1,
    bits,
  );
  const seedVertices = shape.seedVertices?.map(big);
  const fixedChildren = shape.kind === 3 ? shape.children.map(toFixed) : [];
  const subdivide = (node: FixedTransform): FixedTransform[] => {
    if (shape.kind === 3) {
      const world = (point: BigVec3) =>
        [0, 1, 2].map(
          (i) =>
            (node.axes[0][i] * point[0] + node.axes[1][i] * point[1] + node.axes[2][i] * point[2]) /
            one,
        ) as BigVec3;
      return fixedChildren.map((child) => ({
        center: plus(node.center, world(child.center)),
        axes: child.axes.map(world) as FixedTransform["axes"],
        rank: node.rank + child.rank,
      }));
    }
    if (shape.spec.kind === "flake" || shape.spec.kind === "jerusalem") {
      const size = node.axes[0][0];
      return shape.children.map((child, i) => {
        const childSize =
          child.rank === 2
            ? (size * fixedRatio * fixedRatio) / one / one
            : (size * fixedRatio) / one;
        const anchor =
          shape.spec.kind === "flake"
            ? seedVertices![i]
            : (child.center.map((v) => BigInt(Math.sign(v)) * one) as BigVec3);
        return {
          center: plus(node.center, times(anchor, size - childSize)),
          axes: [
            [childSize, BigInt(0), BigInt(0)],
            [BigInt(0), childSize, BigInt(0)],
            [BigInt(0), BigInt(0), childSize],
          ],
          rank: node.rank + child.rank,
        };
      });
    }
    if (node.points) {
      const [a, b, c] = node.points,
        ab = midpoint(a, b),
        bc = midpoint(b, c),
        ca = midpoint(c, a);
      // Match the finite generator's midpoint centroid before adding its apex.
      const base = times(plus(plus(ab, bc), ca), BigInt(1), BigInt(3));
      const apex = plus(base, times(node.axes[2], fixedFromNumber(Math.sqrt(2 / 3) / 2, bits)));
      return [
        [a, ab, ca],
        [ab, b, bc],
        [ca, bc, c],
        [ab, bc, apex],
        [bc, ca, apex],
        [ca, ab, apex],
      ].map((p) => triangleNode(p, node.rank + 1));
    }
    // Dividing axes directly preserves the exact ternary boundaries at deep zoom.
    const axes = node.axes.map((p) => times(p, BigInt(1), BigInt(3))) as FixedTransform["axes"];
    return shape.children.map((child) => {
      const offset = child.center.map((v) => BigInt(Math.round(v * 3))) as BigVec3;
      const world = (p: BigVec3) =>
        [0, 1, 2].map((i) => axes[0][i] * p[0] + axes[1][i] * p[1] + axes[2][i] * p[2]) as BigVec3;
      return {
        center: plus(node.center, world(offset)),
        axes: child.axes.map((p) =>
          world(p.map((v) => BigInt(Math.round(v * 3))) as BigVec3),
        ) as FixedTransform["axes"],
        rank: node.rank + 1,
      };
    });
  };
  const low = shape.low.map((v) => fixedFromNumber(v, bits)),
    high = shape.high.map((v) => fixedFromNumber(v, bits));
  const visible = (node: FixedTransform) => {
    if (node.points) {
      const points = [...node.points, triangleApex(node)];
      for (let i = 0; i < 3; i++) {
        const coordinates = points.map((p) => p[i]),
          lo = coordinates.reduce((a, b) => (a < b ? a : b)),
          hi = coordinates.reduce((a, b) => (a > b ? a : b));
        if (lo - eye[i] > reach || hi - eye[i] < -reach) return false;
      }
      return true;
    }
    for (let i = 0; i < 3; i++) {
      let lo = node.center[i],
        hi = lo;
      for (let j = 0; j < 3; j++) {
        const a = (node.axes[j][i] * low[j]) / one,
          b = (node.axes[j][i] * high[j]) / one;
        lo += a < b ? a : b;
        hi += a > b ? a : b;
      }
      if (lo - eye[i] > reach || hi - eye[i] < -reach) return false;
    }
    return true;
  };
  let visited = 0,
    rootSize = options.maxRootSize ?? 64;
  for (let attempt = 0; attempt < 12; attempt++, rootSize *= 2) {
    const threshold = fixedFromNumber(rootSize * 2 ** -camera.zoom, bits),
      pending = roots.slice(),
      result: GpuTransform[] = [],
      retained: FixedTransform[] = [];
    let overflow = false;
    while (pending.length) {
      const node = pending.pop()!;
      visited++;
      if (!visible(node)) continue;
      if (node.axes.every((v) => v.every((x) => (x < BigInt(0) ? -x : x) <= threshold))) {
        result.push(localRoot(node, eye, bits, camera.zoom));
        retained.push(node);
        if (result.length > MAX_GPU_ROOTS) {
          overflow = true;
          break;
        }
      } else {
        if (visited > 250000)
          throw new Error("The local GPU root frontier exceeds its traversal budget.");
        if (shape.kind === 3) {
          const core = { ...node, coreOnly: true };
          const converted = localRoot(core, eye, bits, camera.zoom);
          // The whole retained core is present, but distant ancestor surfaces
          // need not occupy a local root slot.
          if (converted.cone!.clearance <= horizon * 2) {
            result.push(converted);
            retained.push(core);
            if (result.length > MAX_GPU_ROOTS) {
              overflow = true;
              break;
            }
          }
        }
        pending.push(...subdivide(node));
      }
    }
    if (!overflow)
      return {
        shape,
        roots: result,
        rootData: packTransforms(result, MAX_GPU_ROOTS),
        horizon,
        visited,
        camera,
        style,
        frontier: { bits, zoom: camera.zoom, eye, reach, roots: retained },
      };
  }
  throw new Error("The local GPU root frontier cannot fit without losing precision.");
}
