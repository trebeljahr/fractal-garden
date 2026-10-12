import { type Orientation, viewRotation } from "./orientation";

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

export type VoxelDrawOptions = {
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

export function shadeColor(hex: string, shade: number, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 0.35 + shade * 0.75;

  return `rgba(${Math.min(255, Math.round(r * factor))}, ${Math.min(
    255,
    Math.round(g * factor),
  )}, ${Math.min(255, Math.round(b * factor))}, ${alpha})`;
}

/**
 * Faces are antialiased one at a time, so two that share an edge leave a
 * hairline of whatever lies behind along it. Without an outline to cover that,
 * each face is also stroked in its own colour. One device pixel is enough.
 */
export function seamWidth(ctx: CanvasRenderingContext2D) {
  return 1 / ctx.getTransform().a;
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

// The faces of a cube that no neighbouring cube covers. Hidden faces never
// show, so dropping them once here saves sorting them on every frame.
export function exposedCubeFaces(cubes: Cube[]): Quad[] {
  const occupied = new Set(cubes.map((cube) => `${cube.gridX},${cube.gridY},${cube.gridZ}`));
  const quads: Quad[] = [];

  for (let i = 0; i < cubes.length; i++) {
    const cube = cubes[i];
    const half = cube.size / 2;
    const vertices: Vec3[] = [];
    for (let v = 0; v < 8; v++) {
      vertices.push({
        x: cube.x + (v & 1 ? half : -half),
        y: cube.y + (v & 2 ? half : -half),
        z: cube.z + (v & 4 ? half : -half),
      });
    }

    for (let faceIndex = 0; faceIndex < FACE_DEFS.length; faceIndex++) {
      const faceDef = FACE_DEFS[faceIndex];
      const [dx, dy, dz] = faceDef.direction;
      if (occupied.has(`${cube.gridX + dx},${cube.gridY + dy},${cube.gridZ + dz}`)) {
        continue;
      }

      const [a, b, c, d] = faceDef.indices;
      quads.push({
        corners: [vertices[a], vertices[b], vertices[c], vertices[d]],
        normal: faceDef.normal,
      });
    }
  }

  return quads;
}

export type Quad = {
  corners: [Vec3, Vec3, Vec3, Vec3];
  normal: Vec3;
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

export const JERUSALEM_RATIO = Math.SQRT2 - 1;

const EXPOSED = 0;
// Covered by a neighbour of the same size or larger.
const HIDDEN = 1;
// A neighbour JERUSALEM_RATIO times the size covers one corner. Bit 0 and bit 1
// hold which corner: set when it lies towards the positive end of the face's
// first and second in-plane axis, (axis + 1) % 3 and (axis + 2) % 3.
const NOTCHED = 4;
// Where the notch starts, on a face that spans -1 to 1.
const NOTCH_EDGE = 1 - 2 * JERUSALEM_RATIO;

/** The Jerusalem cube as a tree of boxes, flattened with parents before children. */
export type BoxScene = {
  /** Centre x, y, z and edge length of every box. */
  boxes: Float32Array;
  /** Index of the first of a box's 20 children, or -1 for a box that is drawn. */
  firstChild: Int32Array;
  /** State of the six faces of every box, at axis * 2, plus 1 for the positive side. */
  faces: Uint8Array;
  /** Faces of drawn boxes that are not hidden. */
  faceCount: number;
};

// A box splits into the cells of an uneven 3 x 3 x 3 grid that have at most one
// middle coordinate: none is a corner cube, one is an edge cube along that axis.
const JERUSALEM_CELLS: [number, number, number][] = [];
for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      if ((x === 0 ? 1 : 0) + (y === 0 ? 1 : 0) + (z === 0 ? 1 : 0) <= 1) {
        JERUSALEM_CELLS.push([x, y, z]);
      }
    }
  }
}

// Far-to-near position of the three cells along one axis, for a camera before
// the middle cell, level with it, or past it.
const CELL_POSITIONS = [
  [2, 1, 0],
  [0, 2, 1],
  [0, 1, 2],
];

// Walking the grid from the far cell to the near cell on every axis gives a
// correct back-to-front order, which a per-face depth sort cannot for mixed box
// sizes. One order per camera placement, indexed by x + 3 * y + 9 * z.
const JERUSALEM_ORDERS: number[][] = [];
for (let placement = 0; placement < 27; placement++) {
  const positions = [
    CELL_POSITIONS[placement % 3],
    CELL_POSITIONS[Math.floor(placement / 3) % 3],
    CELL_POSITIONS[Math.floor(placement / 9)],
  ];
  const key = ([x, y, z]: [number, number, number]) =>
    positions[0][x + 1] * 9 + positions[1][y + 1] * 3 + positions[2][z + 1];
  JERUSALEM_ORDERS.push(
    JERUSALEM_CELLS.map((_, index) => index).sort(
      (a, b) => key(JERUSALEM_CELLS[a]) - key(JERUSALEM_CELLS[b]),
    ),
  );
}

// Every cube splits into 8 corner cubes (ratio k) and 12 edge cubes (ratio k²),
// with k = √2 − 1 so that k + k² + k fills one edge exactly. A cube of rank r has
// side k^r; cubes keep splitting until their rank reaches the iteration count.
//
// Only the surface is drawn, so every box tracks which of its faces a neighbour
// covers. Cubes of the same rank that touch share a whole face, which leaves
// three cases: an edge cube ends against the two larger corner cubes beside it,
// that leaves a notch in the corner cube's face, and the corner cube's own child
// in that notch is hidden in turn.
export function generateJerusalemCube(iterations: number): BoxScene {
  const k = JERUSALEM_RATIO;
  const boxes: number[] = [0, 0, 0, 2];
  const ranks: number[] = [0];
  const faces: number[] = [EXPOSED, EXPOSED, EXPOSED, EXPOSED, EXPOSED, EXPOSED];
  const firstChild: number[] = [];
  let faceCount = 0;

  for (let box = 0; box < ranks.length; box++) {
    if (ranks[box] >= iterations) {
      firstChild.push(-1);
      for (let face = 0; face < 6; face++) {
        if (faces[box * 6 + face] !== HIDDEN) faceCount += 1;
      }
      continue;
    }

    firstChild.push(ranks.length);
    const size = boxes[box * 4 + 3];

    for (const cell of JERUSALEM_CELLS) {
      const edgeAxis = cell.indexOf(0);
      const isCorner = edgeAxis < 0;
      const childSize = size * (isCorner ? k : k * k);
      const offset = (size - childSize) / 2;
      boxes.push(
        boxes[box * 4] + cell[0] * offset,
        boxes[box * 4 + 1] + cell[1] * offset,
        boxes[box * 4 + 2] + cell[2] * offset,
        childSize,
      );
      ranks.push(ranks[box] + (isCorner ? 1 : 2));

      for (let axis = 0; axis < 3; axis++) {
        const corner =
          NOTCHED + (cell[(axis + 1) % 3] > 0 ? 1 : 0) + (cell[(axis + 2) % 3] > 0 ? 2 : 0);

        for (let side = 0; side < 2; side++) {
          const outward = cell[axis] === side * 2 - 1;
          const parent = faces[box * 6 + axis * 2 + side];

          if (axis === edgeAxis) {
            faces.push(HIDDEN);
          } else if (!outward) {
            // Corner cubes meet an edge cube here, edge cubes face the hollow.
            faces.push(isCorner ? corner : EXPOSED);
          } else if (parent < NOTCHED) {
            faces.push(parent);
          } else {
            faces.push(isCorner && parent === corner ? HIDDEN : EXPOSED);
          }
        }
      }
    }
  }

  return {
    boxes: Float32Array.from(boxes),
    firstChild: Int32Array.from(firstChild),
    faces: Uint8Array.from(faces),
    faceCount,
  };
}

export function drawBoxScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: BoxScene,
  options: VoxelDrawOptions,
) {
  const { boxes, firstChild, faces } = scene;
  const m = viewRotation(options.rotationX, options.rotationY, options.grab);
  const distance = options.cameraDistance;
  const viewScale = Math.min(width, height) * 0.3 * PROJECTION_FOCAL_LENGTH;
  // The camera sits on the view's z axis; this is the same spot in the model.
  // Sorting and culling against it, not against the view direction, keeps both
  // right under perspective.
  const camera = [m[6] * distance, m[7] * distance, m[8] * distance];

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, width, height);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const showOutline = options.showWireframe && options.lineWidth > 0;
  const sealSeams = options.showFaces && !showOutline;
  ctx.lineWidth = sealSeams ? seamWidth(ctx) : options.lineWidth;

  // Faces only point along the axes, so six shades cover the whole scene.
  const fillStyles: string[] = [];
  const strokeStyles: string[] = [];
  for (let face = 0; face < 6; face++) {
    const axis = face >> 1;
    const facing = m[axis] * LIGHT.x + m[3 + axis] * LIGHT.y + m[6 + axis] * LIGHT.z;
    const shade = Math.max(0.2, face & 1 ? facing : -facing);
    fillStyles.push(shadeColor(options.fillColor, shade, 1));
    strokeStyles.push(shadeColor(options.strokeColor, shade, 1));
  }

  // Centre of the face being drawn and its two half edges, in view space.
  let ox = 0;
  let oy = 0;
  let oz = 0;
  let ux = 0;
  let uy = 0;
  let uz = 0;
  let vx = 0;
  let vy = 0;
  let vz = 0;

  // Adds the point at (u, v) of that face, which spans -1 to 1 both ways.
  const lineTo = (u: number, v: number) => {
    const scale = viewScale / Math.max(distance - (oz + u * uz + v * vz), 0.2);
    ctx.lineTo(
      width / 2 + (ox + u * ux + v * vx) * scale,
      height / 2 - (oy + u * uy + v * vy) * scale,
    );
  };

  const drawBox = (box: number) => {
    const x = boxes[box * 4];
    const y = boxes[box * 4 + 1];
    const z = boxes[box * 4 + 2];
    const half = boxes[box * 4 + 3] / 2;

    for (let axis = 0; axis < 3; axis++) {
      // A face shows only when the camera is beyond it.
      const reach = camera[axis] - boxes[box * 4 + axis];
      if (reach <= half && reach >= -half) continue;

      const face = axis * 2 + (reach > 0 ? 1 : 0);
      const state = faces[box * 6 + face];
      if (state === HIDDEN) continue;

      const out = reach > 0 ? half : -half;
      const u = (axis + 1) % 3;
      const v = (axis + 2) % 3;
      ox = m[0] * x + m[1] * y + m[2] * z + out * m[axis];
      oy = m[3] * x + m[4] * y + m[5] * z + out * m[3 + axis];
      oz = m[6] * x + m[7] * y + m[8] * z + out * m[6 + axis];
      ux = half * m[u];
      uy = half * m[3 + u];
      uz = half * m[6 + u];
      vx = half * m[v];
      vy = half * m[3 + v];
      vz = half * m[6 + v];

      ctx.beginPath();
      if (state === EXPOSED) {
        lineTo(-1, -1);
        lineTo(1, -1);
        lineTo(1, 1);
        lineTo(-1, 1);
      } else {
        // An L: the square without the corner a smaller cube covers.
        const cu = state & 1 ? 1 : -1;
        const cv = state & 2 ? 1 : -1;
        lineTo(-cu, -cv);
        lineTo(cu, -cv);
        lineTo(cu, cv * NOTCH_EDGE);
        lineTo(cu * NOTCH_EDGE, cv * NOTCH_EDGE);
        lineTo(cu * NOTCH_EDGE, cv);
        lineTo(-cu, cv);
      }
      ctx.closePath();

      if (options.showFaces) {
        ctx.fillStyle = fillStyles[face];
        ctx.fill();
        if (sealSeams) {
          ctx.strokeStyle = fillStyles[face];
          ctx.stroke();
        }
      }

      // Canvas ignores a lineWidth of 0, so a zero width must skip the stroke.
      if (showOutline) {
        ctx.strokeStyle = strokeStyles[face];
        ctx.stroke();
      }
    }
  };

  const drawTree = (box: number) => {
    const first = firstChild[box];
    if (first < 0) {
      drawBox(box);
      return;
    }

    // Half the width of the middle cell.
    const middle = (boxes[box * 4 + 3] * JERUSALEM_RATIO * JERUSALEM_RATIO) / 2;
    let placement = 0;
    for (let axis = 2; axis >= 0; axis--) {
      const reach = camera[axis] - boxes[box * 4 + axis];
      placement = placement * 3 + (reach > middle ? 2 : reach < -middle ? 0 : 1);
    }

    const order = JERUSALEM_ORDERS[placement];
    for (let i = 0; i < order.length; i++) {
      drawTree(first + order[i]);
    }
  };

  drawTree(0);
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
