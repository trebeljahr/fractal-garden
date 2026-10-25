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
  { kind: "jerusalem" | "flake" | "kochSurface" | "quadraticKoch3d" }
>;
export type Plane = [number, number, number, number];
/** Columns include uniform scale. All constructions are similarities. */
export type GpuTransform = { center: Vec3; axes: [Vec3, Vec3, Vec3]; rank: number };
export type GpuShape = {
  spec: GpuSpatialSpec;
  kind: 0 | 1 | 2;
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
  if (spec.kind === "flake" || spec.kind === "jerusalem") {
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
  let featureSize = kind === 1 ? 0.5 : kind === 2 ? 2 / 3 : 2 * minimumScale;
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
    radius: Math.max(...vertices.map((p) => Math.hypot(...p))),
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
};
export function packTransforms(transforms: GpuTransform[], capacity = transforms.length) {
  const data = new Float32Array(capacity * 16);
  transforms.forEach((t, i) => {
    data.set([...t.center, t.rank, ...t.axes[0], 0, ...t.axes[1], 0, ...t.axes[2], 0], i * 16);
  });
  return data;
}
/** Coherent near-first orders reduce traversal without changing intersections. */
export function packOrderedChildren(shape: GpuShape) {
  const ordered: GpuTransform[] = [];
  for (let octant = 0; octant < 8; octant++) {
    const direction: Vec3 = [octant & 1 ? 1 : -1, octant & 2 ? 1 : -1, octant & 4 ? 1 : -1];
    ordered.push(
      ...shape.children.slice().sort((a, b) => dot(a.center, direction) - dot(b.center, direction)),
    );
  }
  return packTransforms(ordered);
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
      const roots = old.roots.map((node) => ({
        center: node.center.map((v, i) =>
          relativeNumber(v - currentEye[i], old.bits, camera.zoom),
        ) as Vec3,
        axes: node.axes.map((v) =>
          v.map((x) => relativeNumber(x, old.bits, camera.zoom)),
        ) as GpuTransform["axes"],
        rank: node.rank,
      }));
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
  const subdivide = (node: FixedTransform): FixedTransform[] => {
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
  const number = (v: bigint) => relativeNumber(v, bits, camera.zoom);
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
        const center = node.center.map((v, i) => number(v - eye[i])) as Vec3;
        const axes = node.axes.map((v) => v.map(number)) as [Vec3, Vec3, Vec3];
        result.push({ center, axes, rank: node.rank });
        retained.push(node);
        if (result.length > MAX_GPU_ROOTS) {
          overflow = true;
          break;
        }
      } else {
        if (visited > 250000)
          throw new Error("The local GPU root frontier exceeds its traversal budget.");
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
