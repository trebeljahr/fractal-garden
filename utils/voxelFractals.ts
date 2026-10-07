import { radians } from "./ctxHelpers";

export type Cube = {
  x: number;
  y: number;
  z: number;
  size: number;
  depth: number;
  gridX: number;
  gridY: number;
  gridZ: number;
};

type WorkingCube = {
  gridX: number;
  gridY: number;
  gridZ: number;
  depth: number;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type Face = {
  points: [number, number][];
  depth: number;
  shade: number;
};

export type VoxelDrawOptions = {
  rotationX: number;
  rotationY: number;
  cameraDistance: number;
  background: string;
  fillColor: string;
  strokeColor: string;
  lineWidth: number;
  showFaces: boolean;
  showWireframe: boolean;
};

const PROJECTION_FOCAL_LENGTH = 6;

const FACE_DEFS = [
  {
    direction: [0, 0, 1] as const,
    normal: { x: 0, y: 0, z: 1 },
    indices: [4, 5, 7, 6],
  },
  {
    direction: [0, 0, -1] as const,
    normal: { x: 0, y: 0, z: -1 },
    indices: [0, 1, 3, 2],
  },
  {
    direction: [1, 0, 0] as const,
    normal: { x: 1, y: 0, z: 0 },
    indices: [1, 5, 7, 3],
  },
  {
    direction: [-1, 0, 0] as const,
    normal: { x: -1, y: 0, z: 0 },
    indices: [0, 4, 6, 2],
  },
  {
    direction: [0, 1, 0] as const,
    normal: { x: 0, y: 1, z: 0 },
    indices: [2, 3, 7, 6],
  },
  {
    direction: [0, -1, 0] as const,
    normal: { x: 0, y: -1, z: 0 },
    indices: [0, 1, 5, 4],
  },
] as const;

const LIGHT = normalize({ x: -0.5, y: 0.75, z: 1 });

function normalize(vec: Vec3) {
  const len = Math.hypot(vec.x, vec.y, vec.z) || 1;
  return {
    x: vec.x / len,
    y: vec.y / len,
    z: vec.z / len,
  };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function rotatePoint(point: Vec3, rotationX: number, rotationY: number) {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);

  const y1 = point.y * cosX - point.z * sinX;
  const z1 = point.y * sinX + point.z * cosX;
  const x2 = point.x * cosY + z1 * sinY;
  const z2 = -point.x * sinY + z1 * cosY;

  return {
    x: x2,
    y: y1,
    z: z2,
  };
}

function projectPoint(
  point: Vec3,
  width: number,
  height: number,
  scale: number,
  cameraDistance: number,
) {
  const perspective = PROJECTION_FOCAL_LENGTH / Math.max(cameraDistance - point.z, 0.2);

  return {
    x: width / 2 + point.x * scale * perspective,
    y: height / 2 - point.y * scale * perspective,
    z: point.z,
  };
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned;

  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function shadeColor(hex: string, shade: number, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 0.35 + shade * 0.75;

  return `rgba(${Math.min(255, Math.round(r * factor))}, ${Math.min(
    255,
    Math.round(g * factor),
  )}, ${Math.min(255, Math.round(b * factor))}, ${alpha})`;
}

export function generateVoxelFractal(
  iterations: number,
  keepCube: (x: number, y: number, z: number) => boolean,
) {
  let cubes: WorkingCube[] = [
    {
      gridX: 0,
      gridY: 0,
      gridZ: 0,
      depth: 0,
    },
  ];

  for (let depth = 0; depth < iterations; depth++) {
    const next: WorkingCube[] = [];

    for (let i = 0; i < cubes.length; i++) {
      const cube = cubes[i];
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            if (!keepCube(x, y, z)) {
              continue;
            }

            next.push({
              gridX: cube.gridX * 3 + x,
              gridY: cube.gridY * 3 + y,
              gridZ: cube.gridZ * 3 + z,
              depth: cube.depth + 1,
            });
          }
        }
      }
    }

    cubes = next;
  }

  const size = 2 / 3 ** iterations;

  return cubes.map((cube) => ({
    x: cube.gridX * size,
    y: cube.gridY * size,
    z: cube.gridZ * size,
    size: iterations === 0 ? 2 : size,
    depth: cube.depth,
    gridX: cube.gridX,
    gridY: cube.gridY,
    gridZ: cube.gridZ,
  }));
}

export function generateMoselySnowflake(iterations: number, variant: "lighter" | "heavier") {
  return generateVoxelFractal(iterations, (x, y, z) => {
    const isCorner = Math.abs(x) === 1 && Math.abs(y) === 1 && Math.abs(z) === 1;
    const isCenter = x === 0 && y === 0 && z === 0;

    if (variant === "lighter") {
      return !isCorner && !isCenter;
    }

    return !isCorner;
  });
}

export function generateVicsekFractal3D(iterations: number) {
  return generateVoxelFractal(
    iterations,
    (x, y, z) => Math.abs(x) + Math.abs(y) + Math.abs(z) <= 1,
  );
}

export function generateMengerSponge(iterations: number) {
  return generateVoxelFractal(iterations, (x, y, z) => {
    let zeros = 0;
    if (x === 0) zeros += 1;
    if (y === 0) zeros += 1;
    if (z === 0) zeros += 1;
    return zeros <= 1;
  });
}

export function drawVoxelScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cubes: Cube[],
  options: VoxelDrawOptions,
) {
  const rotationX = radians(options.rotationX);
  const rotationY = radians(options.rotationY);
  const scale = Math.min(width, height) * 0.3;
  const faces: Face[] = [];
  const occupied = new Set(cubes.map((cube) => `${cube.gridX},${cube.gridY},${cube.gridZ}`));

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < cubes.length; i++) {
    const cube = cubes[i];
    const half = cube.size / 2;
    const vertices = [
      { x: cube.x - half, y: cube.y - half, z: cube.z - half },
      { x: cube.x + half, y: cube.y - half, z: cube.z - half },
      { x: cube.x - half, y: cube.y + half, z: cube.z - half },
      { x: cube.x + half, y: cube.y + half, z: cube.z - half },
      { x: cube.x - half, y: cube.y - half, z: cube.z + half },
      { x: cube.x + half, y: cube.y - half, z: cube.z + half },
      { x: cube.x - half, y: cube.y + half, z: cube.z + half },
      { x: cube.x + half, y: cube.y + half, z: cube.z + half },
    ].map((vertex) => rotatePoint(vertex, rotationX, rotationY));

    const projected = vertices.map((vertex) =>
      projectPoint(vertex, width, height, scale, options.cameraDistance),
    );

    for (let faceIndex = 0; faceIndex < FACE_DEFS.length; faceIndex++) {
      const faceDef = FACE_DEFS[faceIndex];
      const [dx, dy, dz] = faceDef.direction;
      const neighborKey = `${cube.gridX + dx},${cube.gridY + dy},${cube.gridZ + dz}`;

      if (occupied.has(neighborKey)) {
        continue;
      }

      const normal = rotatePoint(faceDef.normal, rotationX, rotationY);
      if (normal.z <= 0) {
        continue;
      }

      const points = faceDef.indices.map((index) => [projected[index].x, projected[index].y]) as [
        number,
        number,
      ][];

      let depth = 0;
      for (let j = 0; j < faceDef.indices.length; j++) {
        depth += vertices[faceDef.indices[j]].z;
      }
      depth /= faceDef.indices.length;
      const shade = Math.max(0.2, dot(normalize(normal), LIGHT));

      faces.push({
        points,
        depth,
        shade,
      });
    }
  }

  faces.sort((a, b) => a.depth - b.depth);
  paintFaces(ctx, faces, options);
}

// Draws faces in the given order, back to front.
function paintFaces(ctx: CanvasRenderingContext2D, faces: Face[], options: VoxelDrawOptions) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = options.lineWidth;

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    ctx.beginPath();
    ctx.moveTo(face.points[0][0], face.points[0][1]);
    for (let j = 1; j < face.points.length; j++) {
      ctx.lineTo(face.points[j][0], face.points[j][1]);
    }
    ctx.closePath();

    if (options.showFaces) {
      ctx.fillStyle = shadeColor(options.fillColor, face.shade, 0.92);
      ctx.fill();
    }

    if (options.showWireframe) {
      ctx.strokeStyle = shadeColor(options.strokeColor, face.shade, 0.95);
      ctx.stroke();
    }
  }
}

export type Quad = {
  corners: [Vec3, Vec3, Vec3, Vec3];
  normal: Vec3;
};

export type Box = {
  x: number;
  y: number;
  z: number;
  size: number;
  rank: number;
  // Cell index (0, 1 or 2 per axis) of this box inside its parent, for every level
  // from the root down, flattened as [x0, y0, z0, x1, y1, z1, ...].
  cells: number[];
};

const AXES: Vec3[] = [
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 },
];

function addScaled(a: Vec3, b: Vec3, scale: number) {
  return {
    x: a.x + b.x * scale,
    y: a.y + b.y * scale,
    z: a.z + b.z * scale,
  };
}

function negate(vec: Vec3) {
  return { x: -vec.x, y: -vec.y, z: -vec.z };
}

function squareCorners(center: Vec3, u: Vec3, v: Vec3, half: number): Quad["corners"] {
  return [
    addScaled(addScaled(center, u, -half), v, -half),
    addScaled(addScaled(center, u, half), v, -half),
    addScaled(addScaled(center, u, half), v, half),
    addScaled(addScaled(center, u, -half), v, half),
  ];
}

export function drawQuadScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  quads: Quad[],
  options: VoxelDrawOptions,
) {
  const rotationX = radians(options.rotationX);
  const rotationY = radians(options.rotationY);
  const scale = Math.min(width, height) * 0.3;
  const faces: Face[] = [];

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < quads.length; i++) {
    const quad = quads[i];
    const normal = rotatePoint(quad.normal, rotationX, rotationY);
    if (normal.z <= 0) {
      continue;
    }

    const points: [number, number][] = [];
    let depth = 0;
    for (let j = 0; j < quad.corners.length; j++) {
      const vertex = rotatePoint(quad.corners[j], rotationX, rotationY);
      const projected = projectPoint(vertex, width, height, scale, options.cameraDistance);
      points.push([projected.x, projected.y]);
      depth += vertex.z;
    }

    faces.push({
      points,
      depth: depth / quad.corners.length,
      shade: Math.max(0.2, dot(normalize(normal), LIGHT)),
    });
  }

  faces.sort((a, b) => a.depth - b.depth);
  paintFaces(ctx, faces, options);
}

// Children of every box sit in the cells of a (possibly uneven) 3 x 3 x 3 grid. Walking
// that grid from the far side to the near side on every axis, level by level, gives a
// correct back-to-front order, which a per-face depth sort cannot for mixed box sizes.
const boxOrderCache = new WeakMap<Box[], Map<number, Box[]>>();

function orderBoxes(boxes: Box[], towardViewer: [boolean, boolean, boolean]) {
  const key = (towardViewer[0] ? 1 : 0) + (towardViewer[1] ? 2 : 0) + (towardViewer[2] ? 4 : 0);
  let byOctant = boxOrderCache.get(boxes);
  if (!byOctant) {
    byOctant = new Map();
    boxOrderCache.set(boxes, byOctant);
  }

  const cached = byOctant.get(key);
  if (cached) return cached;

  const ordered = [...boxes].sort((a, b) => {
    const length = Math.min(a.cells.length, b.cells.length);
    for (let i = 0; i < length; i++) {
      if (a.cells[i] !== b.cells[i]) {
        const diff = a.cells[i] - b.cells[i];
        return towardViewer[i % 3] ? diff : -diff;
      }
    }
    return 0;
  });
  byOctant.set(key, ordered);
  return ordered;
}

export function drawBoxScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  boxes: Box[],
  options: VoxelDrawOptions,
) {
  const rotationX = radians(options.rotationX);
  const rotationY = radians(options.rotationY);
  const scale = Math.min(width, height) * 0.3;
  const faces: Face[] = [];
  const faceNormals = FACE_DEFS.map((faceDef) => rotatePoint(faceDef.normal, rotationX, rotationY));
  const towardViewer = AXES.map((axis) => rotatePoint(axis, rotationX, rotationY).z > 0) as [
    boolean,
    boolean,
    boolean,
  ];

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, width, height);

  const ordered = orderBoxes(boxes, towardViewer);
  for (let i = 0; i < ordered.length; i++) {
    const box = ordered[i];
    const half = box.size / 2;
    let projected: { x: number; y: number }[] | null = null;

    for (let faceIndex = 0; faceIndex < FACE_DEFS.length; faceIndex++) {
      const normal = faceNormals[faceIndex];
      if (normal.z <= 0) {
        continue;
      }

      if (!projected) {
        projected = [];
        for (let v = 0; v < 8; v++) {
          const vertex = rotatePoint(
            {
              x: box.x + (v & 1 ? half : -half),
              y: box.y + (v & 2 ? half : -half),
              z: box.z + (v & 4 ? half : -half),
            },
            rotationX,
            rotationY,
          );
          projected.push(projectPoint(vertex, width, height, scale, options.cameraDistance));
        }
      }

      const corners = projected;
      faces.push({
        points: FACE_DEFS[faceIndex].indices.map((index) => [corners[index].x, corners[index].y]),
        depth: 0,
        shade: Math.max(0.2, dot(normalize(normal), LIGHT)),
      });
    }
  }

  paintFaces(ctx, faces, options);
}

export const JERUSALEM_RATIO = Math.SQRT2 - 1;

// Every cube splits into 8 corner cubes (ratio k) and 12 edge cubes (ratio k²),
// with k = √2 − 1 so that k + k² + k fills one edge exactly. A cube of rank r has
// side k^r; cubes keep splitting until their rank reaches the iteration count.
export function generateJerusalemCube(iterations: number): Box[] {
  const k = JERUSALEM_RATIO;
  const result: Box[] = [];
  const stack: Box[] = [{ x: 0, y: 0, z: 0, size: 2, rank: 0, cells: [] }];

  while (stack.length > 0) {
    const box = stack.pop() as Box;
    if (box.rank >= iterations) {
      result.push(box);
      continue;
    }

    const cornerSize = box.size * k;
    const edgeSize = box.size * k * k;
    const cornerOffset = (box.size - cornerSize) / 2;
    const edgeOffset = (box.size - edgeSize) / 2;

    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          stack.push({
            x: box.x + sx * cornerOffset,
            y: box.y + sy * cornerOffset,
            z: box.z + sz * cornerOffset,
            size: cornerSize,
            rank: box.rank + 1,
            cells: [...box.cells, sx + 1, sy + 1, sz + 1],
          });
        }
      }
    }

    for (let axis = 0; axis < 3; axis++) {
      for (const sa of [-1, 1]) {
        for (const sb of [-1, 1]) {
          const offset = [0, 0, 0];
          const cell = [1, 1, 1];
          offset[(axis + 1) % 3] = sa * edgeOffset;
          offset[(axis + 2) % 3] = sb * edgeOffset;
          cell[(axis + 1) % 3] = sa + 1;
          cell[(axis + 2) % 3] = sb + 1;
          stack.push({
            x: box.x + offset[0],
            y: box.y + offset[1],
            z: box.z + offset[2],
            size: edgeSize,
            rank: box.rank + 2,
            cells: [...box.cells, ...cell],
          });
        }
      }
    }
  }

  return result;
}

type SurfaceSquare = {
  center: Vec3;
  normal: Vec3;
  u: Vec3;
  v: Vec3;
  half: number;
};

// Type 1 3D quadratic Koch surface: every square face splits into a 3 x 3 grid,
// the middle cell grows a cube of a third the size, and the 8 flat cells plus the
// 5 exposed faces of the new cube become the 13 squares of the next iteration.
export function generateQuadraticKochSurface(iterations: number): Quad[] {
  let squares: SurfaceSquare[] = [];
  const half = 0.5;

  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [1, -1]) {
      const normal = sign === 1 ? AXES[axis] : negate(AXES[axis]);
      squares.push({
        center: addScaled({ x: 0, y: 0, z: 0 }, normal, half),
        normal,
        u: AXES[(axis + 1) % 3],
        v: AXES[(axis + 2) % 3],
        half,
      });
    }
  }

  for (let depth = 0; depth < iterations; depth++) {
    const next: SurfaceSquare[] = [];

    for (let i = 0; i < squares.length; i++) {
      const square = squares[i];
      const third = square.half / 3;

      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) {
          if (a !== 0 || b !== 0) {
            next.push({
              ...square,
              center: addScaled(
                addScaled(square.center, square.u, a * 2 * third),
                square.v,
                b * 2 * third,
              ),
              half: third,
            });
          }
        }
      }

      const cubeCenter = addScaled(square.center, square.normal, third);
      next.push({
        ...square,
        center: addScaled(cubeCenter, square.normal, third),
        half: third,
      });

      for (const [side, other] of [
        [square.u, square.v],
        [square.v, square.u],
      ]) {
        for (const sign of [1, -1]) {
          const normal = sign === 1 ? side : negate(side);
          next.push({
            center: addScaled(cubeCenter, normal, third),
            normal,
            u: other,
            v: square.normal,
            half: third,
          });
        }
      }
    }

    squares = next;
  }

  return squares.map((square) => ({
    corners: squareCorners(square.center, square.u, square.v, square.half),
    normal: square.normal,
  }));
}
