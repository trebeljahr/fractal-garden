import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

export const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { buildScene } = require("../../utils/render/scene3d.ts");
const { inverseRotate } = require("../../utils/spatial/camera.ts");
const { viewRotation } = require("../../utils/orientation.ts");
const phi = (1 + Math.sqrt(5)) / 2;
export const specs = [
  { kind: "jerusalem" },
  { kind: "flake", mesh: "tetrahedron", ratio: 0.5 },
  { kind: "flake", mesh: "squarePyramid", ratio: 0.5 },
  { kind: "flake", mesh: "octahedron", ratio: 0.5 },
  { kind: "flake", mesh: "dodecahedron", ratio: 1 / (2 + phi) },
  { kind: "flake", mesh: "icosahedron", ratio: 1 / (1 + phi) },
  { kind: "kochSurface", start: "triangle" },
  { kind: "kochSurface", start: "tetrahedron" },
  { kind: "quadraticKoch3d" },
];
export const style = {
  rotationX: 24,
  rotationY: 28,
  background: "#252424",
  fillColor: "#b994f2",
  strokeColor: "#efe4ff",
  showFaces: true,
  showWireframe: true,
  lineWidth: 0.7,
  autoRotate: false,
  cameraDistance: 6,
  lighting: "depth",
  occlusion: "soft",
};
const sub = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);

/** Independent finite production generators, without GPU catalogue or traversal code. */
export function finiteTriangles(spec, rank) {
  const { type, scene } = buildScene(spec, rank);
  const triangles = [];
  if (type === "boxes") {
    for (let i = 0; i < scene.firstChild.length; i++) {
      if (scene.firstChild[i] >= 0) continue;
      const center = Array.from(scene.boxes.slice(i * 4, i * 4 + 3));
      const h = scene.boxes[i * 4 + 3] / 2;
      for (let axis = 0; axis < 3; axis++) {
        for (const sign of [-1, 1]) {
          const points = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ].map(([u, v]) => {
            const point = center.slice();
            point[axis] += sign * h;
            point[(axis + 1) % 3] += u * h;
            point[(axis + 2) % 3] += v * h;
            return point;
          });
          if (sign < 0) points.reverse();
          triangles.push([points[0], points[1], points[2]], [points[0], points[2], points[3]]);
        }
      }
    }
  } else {
    for (let face = 0; face < scene.faceCount; face++) {
      const indices = Array.from(
        scene.faceIndices.slice(scene.faceOffsets[face], scene.faceOffsets[face + 1]),
      );
      for (let i = 1; i < indices.length - 1; i++) {
        triangles.push(
          [indices[0], indices[i], indices[i + 1]].map((index) =>
            Array.from(scene.positions.slice(index * 3, index * 3 + 3)),
          ),
        );
      }
    }
  }
  return triangles;
}

export function intersectTriangles(triangles, origin, ray) {
  let nearest = null;
  for (const [a, b, c] of triangles) {
    const ab = sub(b, a),
      ac = sub(c, a),
      p = cross(ray, ac);
    const determinant = dot(ab, p);
    if (Math.abs(determinant) < 1e-12) continue;
    const delta = sub(origin, a);
    const u = dot(delta, p) / determinant;
    if (u < -1e-9 || u > 1 + 1e-9) continue;
    const q = cross(delta, ab),
      v = dot(ray, q) / determinant;
    if (v < -1e-9 || u + v > 1 + 1e-9) continue;
    const distance = dot(ac, q) / determinant;
    if (distance < 1e-8 || (nearest && distance >= nearest.distance - 1e-8)) continue;
    const normal = cross(ab, ac),
      length = Math.hypot(...normal);
    nearest = {
      distance,
      normal: normal.map((n) => n / length),
      interior: Math.min(u, v, 1 - u - v) > 1e-4,
    };
  }
  return nearest;
}

/** Pixel coordinates use bottom-left origin, matching gl_FragCoord. */
export function oracleRays(view = style, width = 65, height = 65) {
  const rotation = viewRotation(view.rotationX, view.rotationY);
  const origin = inverseRotate([0, 0, 6], rotation);
  const rays = [];
  for (const y of [9, 16, 23, 30, 37, 44, 51, 58]) {
    for (const x of [9, 16, 23, 30, 37, 44, 51, 58]) {
      const viewRay = [
        (x + 0.5 - width / 2) / (Math.min(width, height) * 1.8),
        (y + 0.5 - height / 2) / (Math.min(width, height) * 1.8),
        -1,
      ];
      const world = inverseRotate(viewRay, rotation),
        length = Math.hypot(...world);
      rays.push({ x, y, origin, ray: world.map((v) => v / length) });
    }
  }
  return rays;
}
