import {
  buildFlakeScene,
  buildKochSurfaceScene,
  dodecahedronMesh,
  drawPolyhedronScene,
  icosahedronMesh,
  type Mesh,
  octahedronMesh,
  type PolyhedronScene,
  quadsToScene,
  squarePyramidMesh,
  tetrahedronMesh,
} from "../polyhedronFractals";
import {
  type Box,
  drawBoxScene,
  exposedCubeFaces,
  generateJerusalemCube,
  generateMengerSponge,
  generateMoselySnowflake,
  generateQuadraticKochSurface,
  generateVicsekFractal3D,
} from "../voxelFractals";
import type { Context2D, Renderer } from "./types";

const MESHES = {
  tetrahedron: tetrahedronMesh,
  squarePyramid: squarePyramidMesh,
  octahedron: octahedronMesh,
  dodecahedron: dodecahedronMesh,
  icosahedron: icosahedronMesh,
} satisfies Record<string, () => Mesh>;

/** Serializable description of a 3D fractal, so it can be built in a worker. */
export type SceneSpec =
  | { kind: "menger" }
  | { kind: "vicsek3d" }
  | { kind: "mosely"; variant: "lighter" | "heavier" }
  | { kind: "jerusalem" }
  | { kind: "quadraticKoch3d" }
  | { kind: "flake"; mesh: keyof typeof MESHES; ratio: number }
  | { kind: "kochSurface"; start: "triangle" | "tetrahedron" };

export type SceneView = {
  rotationX: number;
  rotationY: number;
  cameraDistance: number;
  background: string;
  fillColor: string;
  strokeColor: string;
  lineWidth: number;
  showFaces: boolean;
  showWireframe: boolean;
  doubleSided?: boolean;
  autoRotate: boolean;
  /** Degrees of extra yaw per frame while auto-rotating. */
  rotationSpeed: number;
};

export type Scene3DParams = {
  spec: SceneSpec;
  iterations: number;
  view: SceneView;
};

type BuiltScene =
  | { type: "faces"; scene: PolyhedronScene }
  | { type: "boxes"; boxes: Box[]; faceCount: number };

const meshCache = new Map<string, Mesh>();

function getMesh(name: keyof typeof MESHES) {
  let mesh = meshCache.get(name);
  if (!mesh) {
    mesh = MESHES[name]();
    meshCache.set(name, mesh);
  }
  return mesh;
}

export function buildScene(spec: SceneSpec, iterations: number): BuiltScene {
  switch (spec.kind) {
    case "menger":
      return {
        type: "faces",
        scene: quadsToScene(exposedCubeFaces(generateMengerSponge(iterations))),
      };
    case "vicsek3d":
      return {
        type: "faces",
        scene: quadsToScene(exposedCubeFaces(generateVicsekFractal3D(iterations))),
      };
    case "mosely":
      return {
        type: "faces",
        scene: quadsToScene(exposedCubeFaces(generateMoselySnowflake(iterations, spec.variant))),
      };
    case "quadraticKoch3d":
      return { type: "faces", scene: quadsToScene(generateQuadraticKochSurface(iterations)) };
    case "jerusalem": {
      // Boxes need their own back-to-front order, which a face sort gets wrong.
      const boxes = generateJerusalemCube(iterations);
      return { type: "boxes", boxes, faceCount: boxes.length * 6 };
    }
    case "flake":
      return { type: "faces", scene: buildFlakeScene(getMesh(spec.mesh), spec.ratio, iterations) };
    case "kochSurface":
      return { type: "faces", scene: buildKochSurfaceScene(spec.start, iterations) };
  }
}

function specKey(spec: SceneSpec, iterations: number) {
  return `${JSON.stringify(spec)}@${iterations}`;
}

export class Scene3DRenderer implements Renderer<Scene3DParams> {
  private params: Scene3DParams | null = null;
  private built: BuiltScene | null = null;
  private builtKey = "";
  // Accumulated auto-rotation, kept when rotation stops so dragging starts
  // from what is on screen.
  private yawOffset = 0;

  update(params: Scene3DParams) {
    const key = specKey(params.spec, params.iterations);
    if (key !== this.builtKey) {
      this.built = buildScene(params.spec, params.iterations);
      this.builtKey = key;
    }
    this.params = params;
  }

  draw(ctx: Context2D, width: number, height: number) {
    const { params, built } = this;
    if (!params || !built) return false;

    const { view } = params;
    const options = { ...view, rotationY: view.rotationY + this.yawOffset };
    // Both draw functions only use the drawing API OffscreenCanvas shares.
    const target = ctx as CanvasRenderingContext2D;
    if (built.type === "faces") {
      drawPolyhedronScene(target, width, height, built.scene, options);
    } else {
      drawBoxScene(target, width, height, built.boxes, options);
    }

    if (!view.autoRotate) return false;
    this.yawOffset += view.rotationSpeed;
    return true;
  }

  describe() {
    if (!this.params || !this.built) return null;
    const work = this.built.type === "faces" ? this.built.scene.faceCount : this.built.faceCount;
    return { level: this.params.iterations, work };
  }
}
