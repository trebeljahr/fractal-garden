import { fixedFromNumber } from "../deepZoom/math";
import type { Orientation } from "../orientation";
import {
  dodecahedronMesh,
  icosahedronMesh,
  type Mesh,
  octahedronMesh,
  squarePyramidMesh,
  tetrahedronMesh,
} from "../polyhedronFractals";
import { generateHilbertCurve3D } from "../polyline3d";
import type { SceneSpec } from "../render/scene3d";
import {
  type BigVec3,
  bigPoint,
  CAMERA_DISTANCE,
  cameraTarget,
  FAR_PLANE,
  FOCAL_SCALE,
  NEAR_PLANE,
  relativeNumber,
  rotationOf,
  type SpatialCamera,
  type Vec3,
} from "./camera";

export type SpatialStyle = {
  rotationX: number;
  rotationY: number;
  grab?: Orientation;
  background: string;
  fillColor: string;
  strokeColor: string;
  showFaces: boolean;
  showWireframe: boolean;
  lineWidth: number;
  autoRotate: boolean;
  cameraDistance: number;
  nearColor?: string;
  farColor?: string;
  farAlpha?: number;
  lighting?: "classic" | "depth";
  occlusion?: "off" | "soft" | "minecraft";
};
export type SpatialRequest = {
  spec: SceneSpec | { kind: "hilbert3d" };
  camera: SpatialCamera;
  style: SpatialStyle;
  width: number;
  height: number;
  maxVertices?: number;
  pixelSize?: number;
  maxDepth?: number;
  /** Include nearby surfaces behind the eye for flight collision. */
  flight?: boolean;
};
export type SpatialGeometry = {
  vertices: Float32Array;
  collision?: Float32Array;
  pixelSize?: number;
  depth: number;
  visited: number;
  leaves: number;
  limited: boolean;
};
const MESHES = {
  tetrahedron: tetrahedronMesh(),
  squarePyramid: squarePyramidMesh(),
  octahedron: octahedronMesh(),
  dodecahedron: dodecahedronMesh(),
  icosahedron: icosahedronMesh(),
};
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
const add = (a: BigVec3, b: BigVec3): BigVec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: BigVec3, b: BigVec3): BigVec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: BigVec3, k: bigint, one: bigint): BigVec3 => a.map((v) => (v * k) / one) as BigVec3;
const div = (a: BigVec3, k: number): BigVec3 => a.map((v) => v / BigInt(k)) as BigVec3;
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return a.map((v) => v / l) as Vec3;
};
type Node = { center: BigVec3; size: bigint; depth: number; points?: BigVec3[] };

// Each octant is the order-one path transformed by a cube symmetry. Derive those
// symmetries from the existing Skilling generator so both renderers use the same convention.
const hilbertOne = Array.from(
  { length: 8 },
  (_, i) =>
    Array.from(generateHilbertCurve3D(1).points.slice(i * 3, i * 3 + 3)).map(
      (v) => v * 2 - 1,
    ) as Vec3,
);
const hilbertTwo = generateHilbertCurve3D(2).points;
const perms = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];
const hilbertChildren = Array.from({ length: 8 }, (_, child) => {
  const points = Array.from({ length: 8 }, (_, i) =>
    Array.from(hilbertTwo.slice((child * 8 + i) * 3, (child * 8 + i) * 3 + 3)),
  );
  const min = [0, 1, 2].map((axis) => Math.min(...points.map((p) => p[axis])));
  const center = min.map((v) => v / 2 - 0.5) as Vec3;
  for (const perm of perms)
    for (let mask = 0; mask < 8; mask++) {
      const signs = [0, 1, 2].map((i) => (mask & (1 << i) ? 1 : -1));
      if (
        points.every((p, j) =>
          p.every((v, i) => 2 * (v - min[i]) - 1 === signs[i] * hilbertOne[j][perm[i]]),
        )
      ) {
        const matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < 3; i++) matrix[i * 3 + perm[i]] = signs[i];
        return { center, matrix };
      }
    }
  throw new Error("Hilbert octant does not match its recursive orientation");
});
const matrixPoint = (matrix: number[], point: Vec3): Vec3 =>
  [0, 1, 2].map(
    (i) => matrix[i * 3] * point[0] + matrix[i * 3 + 1] * point[1] + matrix[i * 3 + 2] * point[2],
  ) as Vec3;
export const hilbertEnds = [0, 7].map((index) => {
  let point: Vec3 = [0, 0, 0];
  const { center, matrix } = hilbertChildren[index];
  for (let i = 0; i < 80; i++)
    point = matrixPoint(matrix, point).map((v, j) => center[j] + v / 2) as Vec3;
  return point;
});

/** Descendant bounds, rather than current faces, drive culling. All world positions stay fixed point. */
export function buildSpatialGeometry(request: SpatialRequest): SpatialGeometry {
  const { camera, spec, width, height, style } = request;
  const bits = camera.bits,
    one = BigInt(1) << BigInt(bits),
    target = cameraTarget(camera),
    rotation = rotationOf(style);
  const maxVertices = request.maxVertices ?? 240000,
    pixelSize = request.pixelSize ?? 1.5;
  const output: number[] = [];
  let deepest = 0,
    visited = 0,
    leaves = 0,
    limited = false;
  const number = (v: bigint) => relativeNumber(v, bits, camera.zoom);
  const local = (p: BigVec3): Vec3 => {
    const d = sub(p, target).map(number);
    return [0, 1, 2].map(
      (i) => rotation[i * 3] * d[0] + rotation[i * 3 + 1] * d[1] + rotation[i * 3 + 2] * d[2],
    ) as Vec3;
  };
  const visible = (node: Node, bound: number) => {
    const p = local(node.center),
      r = number(node.size) * bound,
      d = CAMERA_DISTANCE - p[2];
    if (request.flight) return Math.hypot(p[0], p[1], d) <= r + 24;
    if (d + r < NEAR_PLANE || d - r > FAR_PLANE) return false;
    // Plane tests avoid projecting corners behind the camera.
    const tx = width / Math.min(width, height) / (2 * FOCAL_SCALE),
      ty = height / Math.min(width, height) / (2 * FOCAL_SCALE);
    return (
      Math.abs(p[0]) - tx * d <= r * Math.hypot(1, tx) &&
      Math.abs(p[1]) - ty * d <= r * Math.hypot(1, ty)
    );
  };
  const small = (node: Node, bound: number) => {
    const p = local(node.center),
      r = number(node.size) * bound;
    return (
      (r * 2 * FOCAL_SCALE * Math.min(width, height)) /
        Math.max(
          NEAR_PLANE,
          (request.flight
            ? Math.hypot(p[0], p[1], CAMERA_DISTANCE - p[2])
            : CAMERA_DISTANCE - p[2]) - r,
        ) <=
      pixelSize
    );
  };
  const face = (points: BigVec3[], doubleSided = false, padding = 0) => {
    const p = points.map(local),
      a = p[0],
      b = p[1],
      c = p[2];
    let normal = norm(cross(b.map((v, i) => v - a[i]) as Vec3, c.map((v, i) => v - a[i]) as Vec3));
    const facing = normal[0] * -a[0] + normal[1] * -a[1] + normal[2] * (CAMERA_DISTANCE - a[2]);
    if (facing <= 0 && !doubleSided && !request.flight) return;
    if (facing < 0) normal = normal.map((v) => -v) as Vec3;
    for (let i = 1; i < p.length - 1; i++) {
      const edge = [1, Number(i === p.length - 2), Number(i === 1)];
      [p[0], p[i], p[i + 1]].forEach((v, j) => {
        output.push(
          ...v,
          ...(request.flight ? [padding, 0, 0] : normal),
          ...[0, 1, 2].map((k) => Number(j === k)),
          ...edge,
        );
      });
    }
  };
  const meshLeaf = (node: Node, mesh: Mesh) => {
    const vertices = mesh.vertices.map((p) =>
      add(node.center, mul(bigPoint(p, bits), node.size, one)),
    );
    mesh.faces.forEach((indices) => {
      face(indices.map((i) => vertices[i]));
    });
  };
  const budget = (node: Node) => {
    visited++;
    deepest = Math.max(deepest, node.depth);
    if (visited > 100000 || output.length / 12 > maxVertices - 360) {
      limited = true;
      return true;
    }
    return node.depth >= (request.maxDepth ?? Math.min(420, Math.ceil(camera.zoom * 3) + 32));
  };
  const descend = (nodes: Node[], bound: number, visit: (node: Node) => void) => {
    nodes
      .filter((n) => visible(n, bound))
      .sort((a, b) => local(b.center)[2] - local(a.center)[2])
      .forEach((n) => {
        // Keep drawing valid coarse leaves when the refinement budget fills.
        if (output.length / 12 < maxVertices - 360) visit(n);
        else limited = true;
      });
  };
  if (spec.kind === "hilbert3d") {
    const ribbon = (a: BigVec3, b: BigVec3) => {
      const p = local(a),
        q = local(b),
        dp = CAMERA_DISTANCE - p[2],
        dq = CAMERA_DISTANCE - q[2];
      if (dp < NEAR_PLANE || dq < NEAR_PLANE || (dp > FAR_PLANE && dq > FAR_PLANE)) return;
      const dx = q[0] / dq - p[0] / dp,
        dy = q[1] / dq - p[1] / dp,
        length = Math.hypot(dx, dy);
      if (length < 1e-12) return;
      const half = Math.max(0.6, style.lineWidth) / 2 / (Math.min(width, height) * FOCAL_SCALE);
      const u: Vec3 = [(-dy / length) * half, (dx / length) * half, 0];
      const corners = [
        p.map((v, i) => v + u[i] * dp),
        p.map((v, i) => v - u[i] * dp),
        q.map((v, i) => v - u[i] * dq),
        q.map((v, i) => v + u[i] * dq),
      ];
      for (const tri of [
        [0, 1, 2],
        [0, 2, 3],
      ])
        tri.forEach((index, j) => {
          output.push(
            ...corners[index],
            0,
            0,
            1,
            ...[0, 1, 2].map((k) => Number(j === k)),
            0,
            0,
            0,
          );
        });
    };
    type HilbertNode = Node & { matrix: number[] };
    const world = (node: HilbertNode, p: Vec3) =>
      add(node.center, mul(bigPoint(matrixPoint(node.matrix, p), bits), node.size, one));
    const visit = (node: HilbertNode) => {
      if (!visible(node, Math.sqrt(3))) return;
      if (budget(node) || small(node, Math.sqrt(3))) {
        leaves++;
        const points = [
          hilbertEnds[0],
          ...hilbertOne.map((p) => p.map((v) => v / 2) as Vec3),
          hilbertEnds[1],
        ].map((p) => world(node, p));
        for (let i = 1; i < points.length; i++) ribbon(points[i - 1], points[i]);
        return;
      }
      for (const child of hilbertChildren) {
        if (output.length / 12 > maxVertices - 360) {
          limited = true;
          break;
        }
        const matrix = Array.from({ length: 9 }, (_, i) => {
          const r = Math.floor(i / 3),
            c = i % 3;
          return (
            node.matrix[r * 3] * child.matrix[c] +
            node.matrix[r * 3 + 1] * child.matrix[3 + c] +
            node.matrix[r * 3 + 2] * child.matrix[6 + c]
          );
        });
        visit({
          center: world(node, child.center),
          size: node.size / BigInt(2),
          depth: node.depth + 1,
          matrix,
        });
      }
    };
    visit({
      center: [BigInt(0), BigInt(0), BigInt(0)],
      size: one,
      depth: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    });
  } else if (spec.kind === "flake" || spec.kind === "jerusalem") {
    const mesh = spec.kind === "flake" ? MESHES[spec.mesh] : CUBE;
    const bound = Math.max(...mesh.vertices.map((p) => Math.hypot(...p)));
    const ratio =
      spec.kind === "flake"
        ? fixedFromNumber(spec.ratio, bits)
        : fixedFromNumber(Math.SQRT2 - 1, bits);
    const visit = (node: Node) => {
      if (!visible(node, bound)) return;
      const stop = budget(node);
      if (stop || small(node, bound)) {
        leaves++;
        meshLeaf(node, mesh);
        return;
      }
      const children: Node[] = [];
      if (spec.kind === "flake") {
        const size = (node.size * ratio) / one;
        mesh.vertices.forEach((p) => {
          children.push({
            center: add(node.center, mul(bigPoint(p, bits), node.size - size, one)),
            size,
            depth: node.depth + 1,
          });
        });
      } else {
        for (let x = -1; x <= 1; x++)
          for (let y = -1; y <= 1; y++)
            for (let z = -1; z <= 1; z++) {
              const middle = Number(x === 0) + Number(y === 0) + Number(z === 0);
              if (middle > 1) continue;
              const size =
                middle === 0 ? (node.size * ratio) / one : (node.size * ratio * ratio) / one / one;
              children.push({
                center: add(node.center, [
                  BigInt(x) * (node.size - size),
                  BigInt(y) * (node.size - size),
                  BigInt(z) * (node.size - size),
                ]),
                size,
                depth: node.depth + (middle === 0 ? 1 : 2),
              });
            }
      }
      descend(children, bound, visit);
    };
    visit({ center: [BigInt(0), BigInt(0), BigInt(0)], size: one, depth: 0 });
  } else if (spec.kind === "kochSurface") {
    const triangle = (points: BigVec3[], depth: number): Node => {
      const center = div(points.reduce(add, [BigInt(0), BigInt(0), BigInt(0)]), 3);
      const delta = sub(points[1], points[0]).map((v) => relativeNumber(v, bits, 0));
      return { points, center, size: fixedFromNumber(Math.hypot(...delta), bits), depth };
    };
    const visit = (node: Node) => {
      if (!visible(node, 2)) return;
      if (budget(node) || small(node, 2)) {
        leaves++;
        face(node.points!, spec.start === "triangle", number(node.size) * 2);
        return;
      }
      const [a, b, c] = node.points!,
        ab = div(add(a, b), 2),
        bc = div(add(b, c), 2),
        ca = div(add(c, a), 2);
      const av = sub(b, a).map((v) => relativeNumber(v, bits, 0)) as Vec3,
        bv = sub(c, a).map((v) => relativeNumber(v, bits, 0)) as Vec3;
      const n = norm(cross(norm(av), norm(bv)));
      const apex = add(
        div(add(add(ab, bc), ca), 3),
        mul(
          bigPoint(n, bits),
          (node.size * fixedFromNumber(Math.sqrt(2 / 3) / 2, bits)) / one,
          one,
        ),
      );
      descend(
        [
          [a, ab, ca],
          [ab, b, bc],
          [ca, bc, c],
          [ab, bc, apex],
          [bc, ca, apex],
          [ca, ab, apex],
        ].map((p) => triangle(p, node.depth + 1)),
        2,
        visit,
      );
    };
    if (spec.start === "tetrahedron") {
      const mesh = tetrahedronMesh(1.3),
        p = mesh.vertices.map((v) => bigPoint(v, bits));
      descend(
        mesh.faces.map((f) =>
          triangle(
            f.map((i) => p[i]),
            0,
          ),
        ),
        2,
        visit,
      );
    } else {
      visit(
        triangle(
          [90, 330, 210].map((angle) =>
            bigPoint(
              [
                1.6 * Math.cos((angle * Math.PI) / 180),
                -0.35,
                1.6 * Math.sin((angle * Math.PI) / 180),
              ],
              bits,
            ),
          ),
          0,
        ),
      );
    }
  } else if (spec.kind === "quadraticKoch3d") {
    // A patch's descendants remain within 3 half-widths of its centre.
    type Patch = Node & { u: BigVec3; v: BigVec3; n: BigVec3 };
    const visit = (node: Patch) => {
      if (!visible(node, 3)) return;
      if (budget(node) || small(node, 3)) {
        leaves++;
        face(
          [
            add(sub(node.center, node.u), node.v),
            sub(sub(node.center, node.u), node.v),
            sub(add(node.center, node.u), node.v),
            add(add(node.center, node.u), node.v),
          ],
          false,
          number(node.size) * 3,
        );
        return;
      }
      const u = div(node.u, 3),
        v = div(node.v, 3),
        n = div(node.n, 3),
        size = node.size / BigInt(3),
        depth = node.depth + 1;
      const children: Patch[] = [];
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++)
          if (a || b)
            children.push({
              center: add(
                node.center,
                add(mul(u, BigInt(a * 2), BigInt(1)), mul(v, BigInt(b * 2), BigInt(1))),
              ),
              size,
              depth,
              u,
              v,
              n,
            });
      const top = add(node.center, mul(n, BigInt(2), BigInt(1)));
      children.push({ center: top, size, depth, u, v, n });
      for (const sign of [-1, 1]) {
        const s = BigInt(sign);
        children.push({
          center: add(add(node.center, n), mul(u, s, BigInt(1))),
          size,
          depth,
          u: mul(n, -s, BigInt(1)),
          v,
          n: mul(u, s, BigInt(1)),
        });
        children.push({
          center: add(add(node.center, n), mul(v, s, BigInt(1))),
          size,
          depth,
          u,
          v: mul(n, -s, BigInt(1)),
          n: mul(v, s, BigInt(1)),
        });
      }
      children
        .filter((n) => visible(n, 3))
        .sort((a, b) => local(b.center)[2] - local(a.center)[2])
        .forEach((n) => {
          if (output.length / 12 < maxVertices - 360) visit(n);
          else limited = true;
        });
    };
    for (let axis = 0; axis < 3; axis++)
      for (const sign of [-1, 1]) {
        const n = [BigInt(0), BigInt(0), BigInt(0)] as BigVec3,
          u = [...n] as BigVec3,
          v = [...n] as BigVec3;
        n[axis] = (one * BigInt(sign)) / BigInt(2);
        u[(axis + 1) % 3] = one / BigInt(2);
        v[(axis + 2) % 3] = (one * BigInt(sign)) / BigInt(2);
        visit({ center: n, size: one / BigInt(2), depth: 0, u, v, n });
      }
  }
  return { vertices: Float32Array.from(output), depth: deepest, visited, leaves, limited };
}

/** A full frame always contains every surviving branch; a cap raises screen tolerance uniformly. */
function completeSpatialFrame(request: SpatialRequest): SpatialGeometry {
  let pixelSize = request.pixelSize ?? 1.5;
  for (let attempt = 0; attempt < 14; attempt++) {
    const result = buildSpatialGeometry({ ...request, pixelSize });
    if (!result.limited) return { ...result, pixelSize };
    pixelSize *= 2;
  }
  throw new Error("Spatial refinement could not fit its geometry budget");
}

/** Render only visible detail; keep a separate, bounded shell for movement in any direction. */
export function buildSpatialFrame(request: SpatialRequest): SpatialGeometry {
  const result = completeSpatialFrame({ ...request, flight: false });
  if (request.flight && request.spec.kind !== "hilbert3d") {
    result.collision = completeSpatialFrame({
      ...request,
      flight: true,
      pixelSize: 24,
      maxVertices: 36000,
    }).vertices;
  }
  return result;
}
