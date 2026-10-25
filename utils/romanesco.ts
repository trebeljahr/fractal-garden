import type { Mesh, PolyhedronScene } from "./polyhedronFractals";

type Vec3 = [number, number, number];

export const ROMANESCO_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const ROMANESCO_ROOT = { center: [0, 0.18, 0] as Vec3, scale: 0.82 };
const SIDES = 12;
const RADIUS = 1.15;
const PROFILE = [0];
// Keep bud positions independent of the coarse cone used for rendering.
const PLACEMENT_PROFILE = [0, 0.38, 0.73];
const radiusAt = (height: number) => RADIUS * (1 - height) ** 0.85;
const placementRadiusAt = (height: number) => {
  const rings = [...PLACEMENT_PROFILE, 1];
  const band = Math.min(PLACEMENT_PROFILE.length - 1, rings.findIndex((top) => top > height) - 1);
  const low = rings[Math.max(0, band)];
  const high = rings[Math.max(0, band) + 1];
  const t = (height - low) / (high - low);
  return radiusAt(low) * (1 - t) + radiusAt(high) * t;
};

/** A closed cone with a light mesh, leaving the render budget for nested buds. */
export const ROMANESCO_MESH: Mesh = (() => {
  const vertices: Vec3[] = PROFILE.flatMap((height) =>
    Array.from({ length: SIDES }, (_, side): Vec3 => {
      const angle = (side * 2 * Math.PI) / SIDES;
      const radius = radiusAt(height);
      return [radius * Math.cos(angle), height * 2 - 1, radius * Math.sin(angle)];
    }),
  );
  const tip = vertices.length;
  vertices.push([0, 1, 0]);
  const faces: number[][] = [Array.from({ length: SIDES }, (_, i) => i)];
  for (let ring = 0; ring < PROFILE.length - 1; ring++) {
    for (let side = 0; side < SIDES; side++) {
      const next = (side + 1) % SIDES;
      faces.push([
        ring * SIDES + side,
        (ring + 1) * SIDES + side,
        (ring + 1) * SIDES + next,
        ring * SIDES + next,
      ]);
    }
  }
  for (let side = 0; side < SIDES; side++) {
    faces.push([
      (PROFILE.length - 1) * SIDES + side,
      tip,
      (PROFILE.length - 1) * SIDES + ((side + 1) % SIDES),
    ]);
  }
  return { vertices, faces };
})();

/**
 * Each copy stays upright. Its base climbs the parent and its size shrinks by
 * the same amount as the remaining height. Each broad base overlaps the parent
 * surface. Adjacent buds meet and hide most of the retained core.
 */
export const ROMANESCO_CHILDREN: { center: Vec3; scale: number }[] = Array.from(
  { length: 55 },
  (_, index) => {
    const remaining = Math.exp(-index * 0.065);
    const scale = 0.44 * remaining;
    const angle = index * ROMANESCO_GOLDEN_ANGLE;
    const radial = placementRadiusAt(1 - remaining);
    return {
      center: [radial * Math.cos(angle), 1 - 2 * remaining + scale, radial * Math.sin(angle)],
      scale,
    };
  },
);

/**
 * For every child, |centre| + scale * bound <= bound. Together with the seed
 * bound, this contains every descendant by induction, including unseen detail.
 */
export const ROMANESCO_BOUND =
  Math.max(
    ...ROMANESCO_MESH.vertices.map((point) => Math.hypot(...point)),
    ...ROMANESCO_CHILDREN.map(({ center, scale }) => Math.hypot(...center) / (1 - scale)),
  ) + 1e-6;

const meshNormals = ROMANESCO_MESH.faces.map((indices): Vec3 => {
  const [a, b, c] = indices.map((index) => ROMANESCO_MESH.vertices[index]);
  const u = b.map((value, axis) => value - a[axis]);
  const v = c.map((value, axis) => value - a[axis]);
  const normal: Vec3 = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const length = Math.hypot(...normal);
  return normal.map((value) => value / length) as Vec3;
});

/**
 * Level zero is the seed; each next level adds buds while retaining the core.
 * Two levels contain 40,053 faces; the finite player stops there. Exploration
 * uses the same transforms with a separate, screen-sized refinement budget.
 * During playback only the newest buds grow, anchored at their base centres.
 */
export function buildRomanescoScene(iterations: number, newestScale = 1): PolyhedronScene {
  const level = Number.isFinite(iterations) ? Math.max(0, Math.min(2, Math.floor(iterations))) : 0;
  const progress = Number.isFinite(newestScale) ? Math.max(0, Math.min(1, newestScale)) : 1;
  type Instance = { center: Vec3; scale: number; depth: number };
  const instances: Instance[] = [{ ...ROMANESCO_ROOT, depth: 0 }];
  for (let index = 0; index < instances.length; index++) {
    const parent = instances[index];
    if (parent.depth >= level) continue;
    for (const child of ROMANESCO_CHILDREN) {
      instances.push({
        center: child.center.map(
          (value, axis) => parent.center[axis] + parent.scale * value,
        ) as Vec3,
        scale: parent.scale * child.scale,
        depth: parent.depth + 1,
      });
    }
  }
  const mesh = ROMANESCO_MESH;
  const vertexCount = instances.length * mesh.vertices.length;
  const faceCount = instances.length * mesh.faces.length;
  const cornerCount =
    instances.length * mesh.faces.reduce((total, indices) => total + indices.length, 0);
  const scene: PolyhedronScene = {
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
  };
  let vertex = 0;
  let face = 0;
  let corner = 0;
  for (const instance of instances) {
    const firstVertex = vertex;
    const growth = instance.depth === level && level > 0 ? progress : 1;
    for (const point of mesh.vertices) {
      scene.positions[vertex * 3] = instance.center[0] + point[0] * instance.scale * growth;
      scene.positions[vertex * 3 + 1] =
        instance.center[1] - instance.scale + (point[1] + 1) * instance.scale * growth;
      scene.positions[vertex * 3 + 2] = instance.center[2] + point[2] * instance.scale * growth;
      vertex++;
    }
    mesh.faces.forEach((indices, index) => {
      scene.faceOffsets[face] = corner;
      for (const id of indices) scene.faceIndices[corner++] = firstVertex + id;
      scene.normals.set(meshNormals[index], face * 3);
      face++;
    });
  }
  scene.faceOffsets[faceCount] = corner;
  return scene;
}
