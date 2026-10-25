import {
  CONSTRUCTION_MOTION_MS,
  createSceneMotion,
  type SceneMotion,
  setSceneProgress,
} from "../constructionMotion";
import { finite } from "../explorerShare";
import type { Orientation } from "../orientation";
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
import { buildRomanescoScene } from "../romanesco";
import {
  type BoxScene,
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
  | { kind: "romanesco" }
  | { kind: "quadraticKoch3d" }
  | { kind: "flake"; mesh: keyof typeof MESHES; ratio: number }
  | { kind: "kochSurface"; start: "triangle" | "tetrahedron" };

export type SceneView = {
  rotationX: number;
  rotationY: number;
  /** Rotation added by dragging, in view space. */
  grab?: Orientation;
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
  /** Only explanation players animate geometry; explorer cameras stay independent. */
  constructionMotion?: boolean;
};

type BuiltScene = { type: "faces"; scene: PolyhedronScene } | { type: "boxes"; scene: BoxScene };

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
    case "romanesco":
      return { type: "faces", scene: buildRomanescoScene(iterations) };
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
    case "jerusalem":
      // Boxes need their own back-to-front order, which a face sort gets wrong.
      return { type: "boxes", scene: generateJerusalemCube(iterations) };
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
  private drawnYaw = 0;
  private motion: SceneMotion | null = null;
  private motionStarted = 0;

  snapshotView() {
    return this.drawnYaw;
  }
  restoreView(value: unknown) {
    if (finite(value, -1e12, 1e12)) this.yawOffset = value;
  }

  update(params: Scene3DParams) {
    const key = specKey(params.spec, params.iterations);
    if (key !== this.builtKey) {
      const previous = this.params;
      this.motion =
        params.constructionMotion !== undefined &&
        previous &&
        params.iterations === previous.iterations + 1 &&
        JSON.stringify(params.spec) === JSON.stringify(previous.spec)
          ? createSceneMotion(params.spec, params.iterations)
          : null;
      this.motionStarted = 0;
      this.built = buildScene(params.spec, params.iterations);
      this.builtKey = key;
    }
    if (params.constructionMotion === undefined) this.motion = null;
    this.params = params;
  }

  draw(ctx: Context2D, width: number, height: number) {
    const { params, built } = this;
    if (!params || !built) return false;

    const { view } = params;
    this.drawnYaw = this.yawOffset;
    const options = {
      ...view,
      rotationY: view.rotationY + this.yawOffset,
      highlightColor: "#f5c56d",
    };
    const motion = this.motion;
    if (motion && params.constructionMotion && !this.motionStarted)
      this.motionStarted = performance.now();
    const progress =
      motion && params.constructionMotion
        ? Math.min(1, (performance.now() - this.motionStarted) / CONSTRUCTION_MOTION_MS)
        : 1;
    if (motion) setSceneProgress(motion, progress);
    const drawing = motion ?? built;
    // Both draw functions only use the drawing API OffscreenCanvas shares.
    const target = ctx as CanvasRenderingContext2D;
    if (drawing.type === "faces") {
      drawPolyhedronScene(target, width, height, drawing.scene, {
        ...options,
        showWireframe: progress < 1 ? false : options.showWireframe,
      });
    } else {
      drawBoxScene(target, width, height, drawing.scene, options);
    }

    if (!view.autoRotate) return progress < 1;
    this.yawOffset += view.rotationSpeed;
    return true;
  }

  describe() {
    if (!this.params || !this.built) return null;
    return { level: this.params.iterations, work: this.built.scene.faceCount };
  }
}
