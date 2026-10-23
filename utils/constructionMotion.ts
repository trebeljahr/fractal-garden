import {
  buildFlakeScene,
  buildKochSurfaceScene,
  dodecahedronMesh,
  icosahedronMesh,
  octahedronMesh,
  type PolyhedronScene,
  quadsToScene,
  squarePyramidMesh,
  tetrahedronMesh,
} from "./polyhedronFractals";
import type { SceneSpec } from "./render/scene3d";
import {
  type BoxScene,
  type Cube,
  exposedCubeFaces,
  generateJerusalemCube,
  generateMengerSponge,
  generateMoselySnowflake,
  generateQuadraticKochSurface,
  generateVicsekFractal3D,
} from "./voxelFractals";

export const CONSTRUCTION_MOTION_MS = 850;

export type SceneMotion = (
  | { type: "faces"; scene: PolyhedronScene }
  | { type: "boxes"; scene: BoxScene }
) & {
  start: Float32Array;
  end: Float32Array;
};

// Packed meshes retain their topology throughout a transition. Only their
// positions change; the worker never rebuilds recursive geometry per frame.
export function setSceneProgress(motion: SceneMotion, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const eased = t * t * (3 - 2 * t);
  const positions = motion.type === "faces" ? motion.scene.positions : motion.scene.boxes;
  if (t === 0 || t === 1) {
    positions.set(t === 0 ? motion.start : motion.end);
    return;
  }
  for (let i = 0; i < motion.end.length; i++) {
    positions[i] = motion.start[i] + (motion.end[i] - motion.start[i]) * eased;
  }
}

function voxelMotion(spec: SceneSpec, level: number): SceneMotion {
  const cubes = (depth: number) => {
    if (spec.kind === "menger") return generateMengerSponge(depth);
    if (spec.kind === "vicsek3d") return generateVicsekFractal3D(depth);
    if (spec.kind === "mosely") return generateMoselySnowflake(depth, spec.variant);
    return [];
  };
  const parents = cubes(level - 1);
  const kept = cubes(level);
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const occupied = new Set(kept.map((c) => key(c.gridX, c.gridY, c.gridZ)));
  const removed: Cube[] = [];
  for (const parent of parents) {
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const gridX = parent.gridX * 3 + x;
          const gridY = parent.gridY * 3 + y;
          const gridZ = parent.gridZ * 3 + z;
          if (!occupied.has(key(gridX, gridY, gridZ))) {
            const size = parent.size / 3;
            removed.push({
              x: gridX * size,
              y: gridY * size,
              z: gridZ * size,
              size,
              gridX,
              gridY,
              gridZ,
              depth: level,
            });
          }
        }
  }
  const quads = exposedCubeFaces(kept);
  const fixedFaces = quads.length;
  const cuts = new Set(removed.map((c) => key(c.gridX, c.gridY, c.gridZ)));
  const highlights = quads.map((q) => {
    const center = q.corners.reduce(
      (p, c) => ({ x: p.x + c.x / 4, y: p.y + c.y / 4, z: p.z + c.z / 4 }),
      { x: 0, y: 0, z: 0 },
    );
    const size = kept[0].size;
    return Number(
      cuts.has(
        key(
          Math.round(center.x / size + q.normal.x / 2),
          Math.round(center.y / size + q.normal.y / 2),
          Math.round(center.z / size + q.normal.z / 2),
        ),
      ),
    );
  });
  for (const cube of removed) quads.push(...exposedCubeFaces([cube]));
  const scene = quadsToScene(quads);
  const start = scene.positions.slice();
  const end = start.slice();
  for (let i = 0; i < removed.length; i++) {
    for (let v = 0; v < 24; v++) {
      const offset = (fixedFaces * 4 + i * 24 + v) * 3;
      end.set([removed[i].x, removed[i].y, removed[i].z], offset);
    }
  }
  scene.highlights = Uint8Array.from([...highlights, ...Array(removed.length * 6).fill(1)]);
  return { type: "faces", scene, start, end };
}

function jerusalemMotion(level: number): SceneMotion {
  const scene = generateJerusalemCube(level);
  const start = scene.boxes.slice();
  for (let parent = 0; parent < scene.firstChild.length; parent++) {
    const first = scene.firstChild[parent];
    if (first < 0 || scene.firstChild[first] >= 0) continue;
    for (let child = first; child < first + 20; child++) {
      start.set(scene.boxes.subarray(parent * 4, parent * 4 + 4), child * 4);
    }
  }
  return { type: "boxes", scene, start, end: scene.boxes.slice() };
}

export function createSceneMotion(spec: SceneSpec, level: number): SceneMotion | null {
  if (level < 1) return null;
  if (spec.kind === "menger" || spec.kind === "mosely" || spec.kind === "vicsek3d")
    return voxelMotion(spec, level);
  if (spec.kind === "jerusalem") return jerusalemMotion(level);
  if (spec.kind === "flake") {
    const meshes = {
      tetrahedron: tetrahedronMesh,
      squarePyramid: squarePyramidMesh,
      octahedron: octahedronMesh,
      dodecahedron: dodecahedronMesh,
      icosahedron: icosahedronMesh,
    };
    const mesh = meshes[spec.mesh]();
    const scene = buildFlakeScene(mesh, spec.ratio, level);
    const start = buildFlakeScene(mesh, spec.ratio, level, 0).positions;
    return { type: "faces", scene, start, end: scene.positions.slice() };
  }
  if (spec.kind === "kochSurface") {
    const scene = buildKochSurfaceScene(spec.start, level);
    const start = buildKochSurfaceScene(spec.start, level, 0).positions;
    scene.highlights = Uint8Array.from({ length: scene.faceCount }, (_, face) =>
      Number(face % 6 >= 3),
    );
    return { type: "faces", scene, start, end: scene.positions.slice() };
  }
  const scene = quadsToScene(generateQuadraticKochSurface(level));
  const start = quadsToScene(generateQuadraticKochSurface(level, 0)).positions;
  scene.highlights = Uint8Array.from({ length: scene.faceCount }, (_, face) =>
    Number(face % 13 >= 8),
  );
  return { type: "faces", scene, start, end: scene.positions.slice() };
}
