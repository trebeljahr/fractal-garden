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
  cameraDistance: number
) {
  const perspective = cameraDistance / Math.max(cameraDistance - point.z, 0.2);

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
    Math.round(g * factor)
  )}, ${Math.min(255, Math.round(b * factor))}, ${alpha})`;
}

export function generateVoxelFractal(
  iterations: number,
  keepCube: (x: number, y: number, z: number) => boolean
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

  const size = 2 / Math.pow(3, iterations);

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

export function generateMoselySnowflake(
  iterations: number,
  variant: "lighter" | "heavier"
) {
  return generateVoxelFractal(iterations, (x, y, z) => {
    const isCorner = Math.abs(x) === 1 && Math.abs(y) === 1 && Math.abs(z) === 1;
    const isCenter = x === 0 && y === 0 && z === 0;

    if (variant === "lighter") {
      return !isCorner && !isCenter;
    }

    return !isCorner;
  });
}

export function drawVoxelScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cubes: Cube[],
  options: VoxelDrawOptions
) {
  const rotationX = radians(options.rotationX);
  const rotationY = radians(options.rotationY);
  const scale = Math.min(width, height) * 0.3;
  const faces: Face[] = [];
  const occupied = new Set(
    cubes.map((cube) => `${cube.gridX},${cube.gridY},${cube.gridZ}`)
  );

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
      projectPoint(vertex, width, height, scale, options.cameraDistance)
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

      const points = faceDef.indices.map((index) => [
        projected[index].x,
        projected[index].y,
      ]) as [number, number][];

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
