import { radians } from "./ctxHelpers";
import { type Orientation, viewRotation } from "./orientation";
import { sortFloatDepthOrder } from "./render/floatDepthOrder";
import { SURFACE_SHADE_STEPS as SHADE_STEPS, surfaceBrightness } from "./render/surfaceLighting";
import { seamWidth, shadeColor } from "./voxelFractals";

type Vec3 = [number, number, number];

export type Mesh = {
  vertices: Vec3[];
  faces: number[][];
};

export type PolyhedronScene = {
  vertexCount: number;
  faceCount: number;
  positions: Float32Array;
  faceOffsets: Uint32Array;
  faceIndices: Uint32Array;
  normals: Float32Array;
  rotated: Float32Array;
  projected: Float32Array;
  depths: Float32Array;
  shades: Uint8Array;
  order: Uint32Array;
  highlights?: Uint8Array;
};

export type PolyhedronDrawOptions = {
  rotationX: number;
  rotationY: number;
  grab?: Orientation;
  cameraDistance: number;
  background: string;
  fillColor: string;
  strokeColor: string;
  lineWidth: number;
  showFaces: boolean;
  showWireframe: boolean;
  doubleSided?: boolean;
  highlightColor?: string;
};

export const MAX_SCENE_FACES = 60000;

const PROJECTION_FOCAL_LENGTH = 6;
const CIRCUMRADIUS = 1.3;
const EPSILON = 1e-6;
const PHI = (1 + Math.sqrt(5)) / 2;

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, factor: number): Vec3 {
  return [a[0] * factor, a[1] * factor, a[2] * factor];
}

function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(a: Vec3): Vec3 {
  const len = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
}

function centroid(points: Vec3[]): Vec3 {
  const sum = points.reduce<Vec3>((acc, point) => add(acc, point), [0, 0, 0]);
  return scale(sum, 1 / points.length);
}

/**
 * Centers the vertices on their bounding box and scales them to a shared
 * circumradius, so every solid fills the view by the same amount.
 */
function fitVertices(vertices: Vec3[], circumradius: number): Vec3[] {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const vertex of vertices) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], vertex[axis]);
      max[axis] = Math.max(max[axis], vertex[axis]);
    }
  }

  const center = scale(add(min, max), 0.5);
  const centered = vertices.map((vertex) => sub(vertex, center));
  const radius = Math.max(...centered.map((vertex) => Math.hypot(...vertex)));
  return centered.map((vertex) => scale(vertex, circumradius / radius));
}

/**
 * Finds the faces of a convex polyhedron from its vertices. Each face is
 * returned counter-clockwise when seen from outside, so normals point out.
 */
function convexHullFaces(vertices: Vec3[]) {
  const faces: number[][] = [];
  const seen = new Set<string>();

  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      for (let k = j + 1; k < vertices.length; k++) {
        let normal = cross(sub(vertices[j], vertices[i]), sub(vertices[k], vertices[i]));
        if (Math.hypot(...normal) < EPSILON) continue;
        normal = normalize(normal);

        let above = 0;
        let below = 0;
        const coplanar: number[] = [];
        for (let m = 0; m < vertices.length; m++) {
          const distance = dot(normal, sub(vertices[m], vertices[i]));
          if (distance > EPSILON) above++;
          else if (distance < -EPSILON) below++;
          else coplanar.push(m);
        }

        if (above > 0 && below > 0) continue;
        const key = coplanar.join(",");
        if (seen.has(key)) continue;
        seen.add(key);

        if (above > 0) normal = scale(normal, -1);
        const center = centroid(coplanar.map((index) => vertices[index]));
        const u = normalize(sub(vertices[coplanar[0]], center));
        const w = cross(normal, u);
        const angle = (index: number) => {
          const offset = sub(vertices[index], center);
          return Math.atan2(dot(offset, w), dot(offset, u));
        };

        faces.push([...coplanar].sort((a, b) => angle(a) - angle(b)));
      }
    }
  }

  return faces;
}

function convexMesh(vertices: Vec3[], circumradius = CIRCUMRADIUS): Mesh {
  const fitted = fitVertices(vertices, circumradius);
  return { vertices: fitted, faces: convexHullFaces(fitted) };
}

function signCombinations(count: number) {
  const result: number[][] = [];
  for (let mask = 0; mask < 1 << count; mask++) {
    result.push(Array.from({ length: count }, (_, bit) => ((mask >> bit) & 1 ? 1 : -1)));
  }
  return result;
}

// Pointy solids look small at the shared radius, so they get a larger one.
export function tetrahedronMesh(circumradius = 1.6) {
  const baseRadius = Math.sqrt(8) / 3;
  const base = [90, 210, 330].map(
    (angle): Vec3 => [
      baseRadius * Math.cos(radians(angle)),
      -1 / 3,
      baseRadius * Math.sin(radians(angle)),
    ],
  );
  return convexMesh([[0, 1, 0], ...base], circumradius);
}

export function squarePyramidMesh() {
  // Equilateral triangle sides: the Johnson solid J1.
  return convexMesh(
    [
      [0, Math.SQRT2, 0],
      [1, 0, 1],
      [1, 0, -1],
      [-1, 0, -1],
      [-1, 0, 1],
    ],
    1.5,
  );
}

export function octahedronMesh() {
  return convexMesh([
    [0, 1, 0],
    [0, -1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]);
}

export function dodecahedronMesh() {
  const vertices: Vec3[] = signCombinations(3).map(([x, y, z]): Vec3 => [x, y, z]);
  for (const [a, b] of signCombinations(2)) {
    vertices.push([0, a / PHI, b * PHI], [a / PHI, b * PHI, 0], [a * PHI, 0, b / PHI]);
  }
  return convexMesh(vertices);
}

export function icosahedronMesh() {
  const vertices: Vec3[] = [];
  for (const [a, b] of signCombinations(2)) {
    vertices.push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]);
  }
  return convexMesh(vertices);
}

/**
 * Largest iteration count whose scene stays under MAX_SCENE_FACES.
 */
export function getMaxIterations(baseFaces: number, copiesPerStep: number, ceiling = 8) {
  let iterations = 0;
  while (iterations < ceiling && baseFaces * copiesPerStep ** (iterations + 1) <= MAX_SCENE_FACES) {
    iterations += 1;
  }
  return iterations;
}

function createScene(vertexCount: number, faceCount: number, cornerCount: number): PolyhedronScene {
  return {
    vertexCount,
    faceCount,
    positions: new Float32Array(vertexCount * 3),
    faceOffsets: new Uint32Array(faceCount + 1),
    faceIndices: new Uint32Array(cornerCount),
    normals: new Float32Array(faceCount * 3),
    rotated: new Float32Array(vertexCount * 3),
    projected: new Float32Array(vertexCount * 2),
    depths: new Float32Array(faceCount),
    shades: new Uint8Array(faceCount),
    order: new Uint32Array(faceCount),
  } satisfies PolyhedronScene;
}

function computeNormals(scene: PolyhedronScene) {
  const { positions, faceOffsets, faceIndices, normals } = scene;
  for (let face = 0; face < scene.faceCount; face++) {
    // Newell's method: robust for any planar polygon.
    let nx = 0;
    let ny = 0;
    let nz = 0;
    const start = faceOffsets[face];
    const end = faceOffsets[face + 1];
    for (let corner = start; corner < end; corner++) {
      const a = faceIndices[corner] * 3;
      const b = faceIndices[corner + 1 < end ? corner + 1 : start] * 3;
      nx += (positions[a + 1] - positions[b + 1]) * (positions[a + 2] + positions[b + 2]);
      ny += (positions[a + 2] - positions[b + 2]) * (positions[a] + positions[b]);
      nz += (positions[a] - positions[b]) * (positions[a + 1] + positions[b + 1]);
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[face * 3] = nx / len;
    normals[face * 3 + 1] = ny / len;
    normals[face * 3 + 2] = nz / len;
  }
}

/**
 * Builds an n-flake style IFS: every step replaces the solid with one copy per
 * vertex, shrunk by `ratio` towards that vertex.
 */
export function buildFlakeScene(mesh: Mesh, ratio: number, iterations: number, lastProgress = 1) {
  let instances: { size: number; offset: Vec3 }[] = [{ size: 1, offset: [0, 0, 0] }];

  for (let step = 0; step < iterations; step++) {
    const next: typeof instances = [];
    const childRatio = step === iterations - 1 ? 1 - (1 - ratio) * lastProgress : ratio;
    for (const instance of instances) {
      for (const vertex of mesh.vertices) {
        next.push({
          size: instance.size * childRatio,
          offset: add(instance.offset, scale(vertex, instance.size * (1 - childRatio))),
        });
      }
    }
    instances = next;
  }

  const cornersPerMesh = mesh.faces.reduce((sum, face) => sum + face.length, 0);
  const scene = createScene(
    instances.length * mesh.vertices.length,
    instances.length * mesh.faces.length,
    instances.length * cornersPerMesh,
  );

  let vertex = 0;
  let face = 0;
  let corner = 0;
  for (const { size, offset } of instances) {
    const firstVertex = vertex;
    for (const point of mesh.vertices) {
      scene.positions[vertex * 3] = offset[0] + point[0] * size;
      scene.positions[vertex * 3 + 1] = offset[1] + point[1] * size;
      scene.positions[vertex * 3 + 2] = offset[2] + point[2] * size;
      vertex++;
    }
    for (const indices of mesh.faces) {
      scene.faceOffsets[face] = corner;
      for (const index of indices) {
        scene.faceIndices[corner++] = firstVertex + index;
      }
      face++;
    }
  }
  scene.faceOffsets[face] = corner;

  computeNormals(scene);
  return scene;
}

type Triangle = [Vec3, Vec3, Vec3];

// The tip of the tetrahedron raised on the middle of a triangle. It sits above the triangle's
// center, at the height of a regular tetrahedron with half the triangle's edge.
function kochApex([a, b, c]: Triangle, progress = 1): Vec3 {
  const ab = scale(add(a, b), 0.5);
  const bc = scale(add(b, c), 0.5);
  const ca = scale(add(c, a), 0.5);
  const edge = Math.hypot(...sub(ab, bc));
  const normal = normalize(cross(sub(bc, ab), sub(ca, ab)));
  return add(centroid([ab, bc, ca]), scale(normal, edge * Math.sqrt(2 / 3) * progress));
}

function kochSurfaceTriangles(
  start: "triangle" | "tetrahedron",
  iterations: number,
  lastProgress = 1,
) {
  let triangles: Triangle[];

  if (start === "tetrahedron") {
    const { vertices, faces } = tetrahedronMesh(CIRCUMRADIUS);
    triangles = faces.map((face) => [vertices[face[0]], vertices[face[1]], vertices[face[2]]]);
  } else {
    const corners = [90, 330, 210].map(
      (angle): Vec3 => [1.6 * Math.cos(radians(angle)), -0.35, 1.6 * Math.sin(radians(angle))],
    );
    triangles = [[corners[0], corners[1], corners[2]]];
  }

  for (let step = 0; step < iterations; step++) {
    const next: Triangle[] = [];
    for (const triangle of triangles) {
      const [a, b, c] = triangle;
      const ab = scale(add(a, b), 0.5);
      const bc = scale(add(b, c), 0.5);
      const ca = scale(add(c, a), 0.5);
      const apex = kochApex(triangle, step === iterations - 1 ? lastProgress : 1);
      next.push(
        [a, ab, ca],
        [ab, b, bc],
        [ca, bc, c],
        [ab, bc, apex],
        [bc, ca, apex],
        [ca, ab, apex],
      );
    }
    triangles = next;
  }
  return triangles;
}

/** Packs loose polygons, counter-clockwise from outside, into the arrays the renderer draws. */
export function polygonsToScene(polygons: Vec3[][]) {
  const corners = polygons.reduce((sum, polygon) => sum + polygon.length, 0);
  const scene = createScene(corners, polygons.length, corners);
  let index = 0;
  polygons.forEach((polygon, face) => {
    scene.faceOffsets[face] = index;
    for (const point of polygon) {
      scene.faceIndices[index] = index;
      scene.positions.set(point, index * 3);
      index++;
    }
  });
  scene.faceOffsets[polygons.length] = index;

  computeNormals(scene);
  return scene;
}

/**
 * Von Koch surface: each triangle splits into four, and the middle one is
 * replaced by the three side walls of a regular tetrahedron.
 */
export function buildKochSurfaceScene(
  start: "triangle" | "tetrahedron",
  iterations: number,
  lastProgress = 1,
) {
  return polygonsToScene(kochSurfaceTriangles(start, iterations, lastProgress));
}

function kochFaceTriangles(face: number, iterations: number) {
  const count = 6 ** iterations;
  return kochSurfaceTriangles("tetrahedron", iterations).slice(face * count, (face + 1) * count);
}

/** Only what has grown from one face of the tetrahedron. It is open, so draw it from both sides. */
export function buildKochFaceScene(face: number, iterations: number) {
  return polygonsToScene(kochFaceTriangles(face, iterations));
}

/**
 * The empty part of the cube above one face of the tetrahedron: a pyramid on each triangle, with
 * its tip where the next bump on that triangle will reach.
 */
export function kochFacePyramids(face: number, iterations: number) {
  return kochFaceTriangles(face, iterations).map((triangle) => ({
    base: triangle,
    tip: kochApex(triangle),
  }));
}

type QuadFace = {
  corners: { x: number; y: number; z: number }[];
  normal: { x: number; y: number; z: number };
};

/** Packs loose quads with known normals into the typed arrays the renderer draws. */
export function quadsToScene(quads: QuadFace[]) {
  const scene = createScene(quads.length * 4, quads.length, quads.length * 4);
  for (let face = 0; face < quads.length; face++) {
    const { corners, normal } = quads[face];
    scene.faceOffsets[face] = face * 4;
    for (let corner = 0; corner < 4; corner++) {
      const index = face * 4 + corner;
      scene.faceIndices[index] = index;
      scene.positions[index * 3] = corners[corner].x;
      scene.positions[index * 3 + 1] = corners[corner].y;
      scene.positions[index * 3 + 2] = corners[corner].z;
    }
    scene.normals[face * 3] = normal.x;
    scene.normals[face * 3 + 1] = normal.y;
    scene.normals[face * 3 + 2] = normal.z;
  }
  scene.faceOffsets[quads.length] = quads.length * 4;
  return scene;
}

/** Where a model point lands on the canvas under the same camera as drawPolyhedronScene. */
export function projectScenePoint(
  [x, y, z]: Vec3,
  options: Pick<PolyhedronDrawOptions, "rotationX" | "rotationY" | "grab" | "cameraDistance">,
  width: number,
  height: number,
) {
  const m = viewRotation(options.rotationX, options.rotationY, options.grab);
  const rx = m[0] * x + m[1] * y + m[2] * z;
  const ry = m[3] * x + m[4] * y + m[5] * z;
  const rz = m[6] * x + m[7] * y + m[8] * z;
  const perspective =
    (PROJECTION_FOCAL_LENGTH / Math.max(options.cameraDistance - rz, 0.2)) *
    (Math.min(width, height) * 0.3);
  return { x: width / 2 + rx * perspective, y: height / 2 - ry * perspective };
}

export function drawPolyhedronScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: PolyhedronScene,
  options: PolyhedronDrawOptions,
) {
  const {
    positions,
    rotated,
    projected,
    normals,
    faceOffsets,
    faceIndices,
    depths,
    shades,
    order,
  } = scene;
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = viewRotation(
    options.rotationX,
    options.rotationY,
    options.grab,
  );
  const viewScale = Math.min(width, height) * 0.3;

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, width, height);

  let back = Infinity;
  let front = -Infinity;
  for (let i = 0; i < scene.vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const rx = m0 * x + m1 * y + m2 * z;
    const ry = m3 * x + m4 * y + m5 * z;
    const rz = m6 * x + m7 * y + m8 * z;
    rotated[i * 3] = rx;
    rotated[i * 3 + 1] = ry;
    rotated[i * 3 + 2] = rz;
    back = Math.min(back, rz);
    front = Math.max(front, rz);

    const perspective =
      (PROJECTION_FOCAL_LENGTH / Math.max(options.cameraDistance - rz, 0.2)) * viewScale;
    projected[i * 2] = width / 2 + rx * perspective;
    projected[i * 2 + 1] = height / 2 - ry * perspective;
  }

  let visible = 0;
  for (let face = 0; face < scene.faceCount; face++) {
    const nx = normals[face * 3];
    const ny = normals[face * 3 + 1];
    const nz = normals[face * 3 + 2];
    let nx2 = m0 * nx + m1 * ny + m2 * nz;
    let ny2 = m3 * nx + m4 * ny + m5 * nz;
    let nz2 = m6 * nx + m7 * ny + m8 * nz;

    const start = faceOffsets[face];
    const end = faceOffsets[face + 1];

    // The camera sits at (0, 0, cameraDistance) and sees a face's front only
    // from the side its normal points to. Under perspective that depends on
    // where the face is, not just on which way it points.
    const first = faceIndices[start] * 3;
    const facing =
      nz2 * options.cameraDistance -
      (nx2 * rotated[first] + ny2 * rotated[first + 1] + nz2 * rotated[first + 2]);
    if (facing <= 0) {
      if (!options.doubleSided) continue;
      nx2 = -nx2;
      ny2 = -ny2;
      nz2 = -nz2;
    }

    let depth = 0;
    for (let corner = start; corner < end; corner++) {
      depth += rotated[faceIndices[corner] * 3 + 2];
    }

    depths[face] = depth / (end - start);
    const shade = surfaceBrightness(nx2, ny2, nz2, depths[face], back, front);
    shades[face] = Math.round(shade * SHADE_STEPS);
    order[visible++] = face;
  }

  const drawOrder = sortFloatDepthOrder(depths, order, visible);
  const fillStyles = new Map<number, string>();
  const strokeStyles = new Map<number, string>();
  const highlightStyles = new Map<number, string>();
  const styleFor = (cache: Map<number, string>, color: string, step: number) => {
    let style = cache.get(step);
    if (!style) {
      style = shadeColor(
        color,
        step / SHADE_STEPS,
        cache === strokeStyles && options.showFaces ? 0.45 : 1,
      );
      cache.set(step, style);
    }
    return style;
  };

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const showOutline = options.showWireframe && options.lineWidth > 0;
  const sealSeams = options.showFaces && !showOutline;
  ctx.lineWidth = sealSeams ? seamWidth(ctx) : options.lineWidth;

  for (let i = 0; i < drawOrder.length; i++) {
    const face = drawOrder[i];
    const start = faceOffsets[face];
    const end = faceOffsets[face + 1];

    ctx.beginPath();
    let index = faceIndices[start] * 2;
    ctx.moveTo(projected[index], projected[index + 1]);
    for (let corner = start + 1; corner < end; corner++) {
      index = faceIndices[corner] * 2;
      ctx.lineTo(projected[index], projected[index + 1]);
    }
    ctx.closePath();

    if (options.showFaces) {
      const highlighted = scene.highlights?.[face] && options.highlightColor;
      const fill = styleFor(
        highlighted ? highlightStyles : fillStyles,
        highlighted ? options.highlightColor! : options.fillColor,
        shades[face],
      );
      ctx.fillStyle = fill;
      ctx.fill();
      if (sealSeams) {
        ctx.strokeStyle = fill;
        ctx.stroke();
      }
    }

    // Canvas ignores a lineWidth of 0, so a zero width must skip the stroke.
    if (showOutline) {
      ctx.strokeStyle = styleFor(strokeStyles, options.strokeColor, shades[face]);
      ctx.stroke();
    }
  }
}
