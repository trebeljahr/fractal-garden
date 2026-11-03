import type { FractalFrame } from "../fractalFrame";
import { webglPixelRatio } from "../renderResolution";
import { ROMANESCO_SURFACE_MODEL } from "../romanescoSurface";
import { createShaderProgram } from "../shaders/compileShader";
import romanescoChartFragment from "../shaders/romanesco-chart.frag";
import romanescoResidualFragment from "../shaders/romanesco-residual.frag";
import romanescoSurfaceFragment from "../shaders/romanesco-surface.frag";
import fragment from "../shaders/spatial-flight.frag";
import vertex from "../shaders/spatial-flight.vert";
import {
  CAMERA_DISTANCE,
  FOCAL_SCALE,
  inverseRotate,
  rotationOf,
  type SpatialCamera,
  type Vec3,
} from "../spatial/camera";
import type { SpatialStyle } from "../spatial/geometry";
import { spatialReliefFront } from "../spatial/lighting";
import { spatialProjection } from "../spatial/projection";
import { MAX_FLIGHT_PIXELS } from "../voxelZoom/frameBudget";
import { packGpuChildBounds } from "./childBounds";
import { createGpuClearanceCache } from "./clearance";
import { romanescoCpuClearance } from "./cpuClearance";
import {
  applyPoint,
  buildGpuFrame,
  buildGpuShape,
  type GpuFrame,
  type GpuSpatialSpec,
  type GpuStackOptions,
  MAX_GPU_ROOTS,
  normalize,
  packChildBounds,
  packChildFrames,
  packChildHulls,
  packOrderedChildren,
} from "./model";
import {
  buildRomanescoSurfaceFrame,
  type RomanescoSurfaceFrame,
  romanescoSurfaceFrameClearance,
} from "./romanescoSurfaceFrame";
import { createRomanescoTracePasses } from "./romanescoTrace";
import { specializeSpatialShader } from "./shader";

const screenFragment = `#version 300 es
precision highp float;
uniform sampler2D u_color, u_surface;
uniform vec2 u_resolution, u_projection, u_origin;
uniform float u_far, u_ao;
const bool ROMANESCO_OUTLINES = false;
uniform bool u_faces, u_wire;
uniform vec3 u_stroke, u_background;
uniform float u_lineWidth;
out vec4 outColor;
float depth(vec4 s) { return exp2((s.b + s.a / 255.0) * log2(u_far + 1.0)) - 1.0; }
vec3 point(vec2 uv, float d) { return vec3((uv * 2.0 - 1.0 - u_origin) * d / u_projection, -d); }
vec3 normal(vec4 s) {
  vec2 f = s.rg * 2.0 - 1.0;
  vec3 n = vec3(f, 1.0 - abs(f.x) - abs(f.y));
  float t = max(-n.z, 0.0); n.xy += mix(vec2(t), vec2(-t), step(vec2(0.0), n.xy));
  return normalize(n);
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 color = texture(u_color, uv), s = texture(u_surface, uv);
  if (ROMANESCO_OUTLINES && s.b <= .999) {
    float edge = 0.0;
    if (u_wire) {
      vec3 n = normal(s);
      float radius = max(.75, u_lineWidth * .5);
      for (int i = 0; i < 4; i++) {
        vec2 axis = i == 0 ? vec2(1,0) : i == 1 ? vec2(-1,0) : i == 2 ? vec2(0,1) : vec2(0,-1);
        vec4 neighbour = texture(u_surface, uv + axis * radius / u_resolution);
        edge = max(edge, neighbour.b > .999 ? 1.0 : 1.0-smoothstep(.82,.98,dot(n,normal(neighbour))));
      }
    }
    color.rgb = u_faces ? mix(color.rgb,u_stroke,edge) : mix(u_background,u_stroke,edge);
  }
  if (u_ao < 0.5 || s.b > 0.999) { outColor = vec4(color.rgb, 1.0); return; }
  float d = depth(s), occlusion = 0.0;
  vec3 p = point(uv, d), n = normal(s);
  for (int i = 0; i < 16; i++) {
    float fi = float(i), angle = fi * 2.39996323, radius = 3.0 + 27.0 * (fi + 0.5) / 16.0;
    vec2 at = uv + vec2(cos(angle), sin(angle)) * radius / u_resolution;
    if (at.x <= 0.0 || at.x >= 1.0 || at.y <= 0.0 || at.y >= 1.0) continue;
    vec4 neighbour = texture(u_surface, at);
    if (neighbour.b > 0.999) continue;
    vec3 delta = point(at, depth(neighbour)) - p;
    float distance = length(delta), reach = max(0.02, d * 0.18);
    occlusion += max(0.0, dot(n, delta / max(distance, 0.00001)) - 0.08) * (1.0 - smoothstep(reach * 0.15, reach, distance));
  }
  outColor = vec4(color.rgb * (1.0 - clamp(occlusion / 8.0, 0.0, 0.8) * color.a * (u_ao > 1.5 ? 1.0 : 0.65)), 1.0);
}`;
const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
export type GpuRenderOptions = {
  maxRank?: number;
  /** Base-anchored growth of the newest finite Romanesco rank. */
  growth?: number;
};
export type GpuDiagnosticOptions = GpuRenderOptions & {
  pixelAngle?: number;
  nearFootprint?: number;
  detailScale?: number;
};
type StackDepth = 8 | 12 | 16 | 24 | 40;

/** One ray-traversal pass produces color and surface data; contact shading is a cheap screen pass. */
export function createSpatialGpuRenderer(
  gl: WebGL2RenderingContext,
  initialSpec?: Pick<GpuSpatialSpec, "kind">,
) {
  const owned: Array<() => void> = [];
  const release = () => {
    for (const dispose of owned.splice(0).reverse()) dispose();
  };
  const allocate = <T>(value: T | null | undefined, dispose: (resource: T) => void): T => {
    if (!value) throw new Error("Could not allocate GPU fractal resources.");
    owned.push(() => dispose(value));
    return value;
  };
  const program = (source: string) =>
    allocate(createShaderProgram(gl, vertex, source), (p) => {
      gl.deleteProgram(p.program);
      gl.deleteShader(p.vert);
      gl.deleteShader(p.frag);
    });
  try {
    // Compile coordinate models separately so inactive paths need no registers.
    const surface = initialSpec?.kind === "romanesco";
    const tracePasses = surface ? createRomanescoTracePasses(gl) : undefined;
    if (tracePasses) owned.push(() => tracePasses.destroy());
    const sourceFor = (chartMode = 0) =>
      surface
        ? romanescoSurfaceFragment
            .replace(
              "// ROMANESCO_CHART",
              `${romanescoResidualFragment}\n${romanescoChartFragment}`,
            )
            .replace(
              "uniform int u_chartMode, u_chartLevels, u_chartFirstRank;",
              `const int u_chartMode = ${chartMode};\nuniform int u_chartLevels, u_chartFirstRank;`,
            )
        : specializeSpatialShader(fragment, initialSpec);
    const stackDepth: StackDepth = 40;
    let surfaceMode = 0;
    let shader = program(sourceFor());
    const screen = program(
      screenFragment.replace(
        "const bool ROMANESCO_OUTLINES = false;",
        `const bool ROMANESCO_OUTLINES = ${surface};`,
      ),
    );
    const vao = allocate(gl.createVertexArray(), (r) => gl.deleteVertexArray(r)),
      buffer = allocate(gl.createBuffer(), (r) => gl.deleteBuffer(r));
    const newTexture = () => allocate(gl.createTexture(), (r) => gl.deleteTexture(r));
    const roots = newTexture(),
      children = newTexture(),
      childBounds = newTexture(),
      queryTexture = newTexture(),
      residualTable = surface ? newTexture() : undefined,
      surfaces = [newTexture(), newTexture()];
    const framebuffer = allocate(gl.createFramebuffer(), (r) => gl.deleteFramebuffer(r)),
      queryFramebuffer = allocate(gl.createFramebuffer(), (r) => gl.deleteFramebuffer(r));
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const enablePosition = (program: WebGLProgram) => {
      const at = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    };
    const texture = (target: WebGLTexture, unit: number) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, target);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    texture(roots, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, MAX_GPU_ROOTS, 0, gl.RGBA, gl.FLOAT, null);
    texture(queryTexture, 2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    if (residualTable) {
      texture(residualTable, 7);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        20,
        3 * ROMANESCO_SURFACE_MODEL.defaultLevels + 1,
        0,
        gl.RGBA,
        gl.FLOAT,
        null,
      );
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, queryFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, queryTexture, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error("Could not prepare GPU navigation queries.");
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const names = [
      "roots",
      "children",
      "childBounds",
      "childBoundsCount",
      "orderedChildren",
      "rootCount",
      "childCount",
      "hullCount",
      "edgeCount",
      "hull",
      "edges",
      "childHulls",
      "childCenters",
      "childAxes",
      "kind",
      "radius",
      "featureSize",
      "coneSlope",
      "boundConeSlope",
      "boundConeBase",
      "boundCylinderRadius",
      "resolution",
      "right",
      "up",
      "forward",
      "focal",
      "projection",
      "origin",
      "pixelAngle",
      "detailScale",
      "nearFootprint",
      "far",
      "maxRank",
      "growth",
      "fill",
      "stroke",
      "background",
      "faces",
      "wire",
      "lineWidth",
      "lighting",
      "occlusion",
      "fogScale",
      "reliefFront",
      "query",
      "queryRay",
      "seed",
      "useSeed",
      "chartMode",
      "chartPlane",
      "chartError",
      "chartOrigin",
      "chartPhase",
      "chartCarrier",
      "chartWeight",
      "chartQOffset",
      "chartQX",
      "chartQY",
      "chartLevels",
      "chartFirstRank",
      "chartBaseGrowth",
      "chartShear",
      "residualTable",
      "residualOffsets",
      "residualCounts",
      "residualInverseSigma",
      "residualScale",
      "residualHeight",
      "residualRing",
      "residualRadialRatio",
      "residualPrimaryRatio",
      "residualSideLogTransport",
      "residualDelta",
      "residualShearCoefficient",
      "residualBottomUpperWork",
      "residualRootUnit",
      "residualDiskPoint",
      "residualAmplitudeOffsets",
      "residualShearOffsets",
      "residualAnchorField",
      "residualDeltaOffsets",
      "residualAngleTransports",
    ];
    const uniforms = (target: WebGLProgram) =>
      Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(target, `u_${name}`)]));
    let u = uniforms(shader.program);
    type Variant = {
      shader: typeof shader;
      uniforms: typeof u;
      shape?: GpuFrame["shape"];
    };
    let active: Variant = { shader, uniforms: u };
    const variantKey = (depth: StackDepth, mode: number) =>
      surface ? `surface:${mode}` : `stack:${depth}`;
    const variants = new Map<string, Variant>([[variantKey(stackDepth, surfaceMode), active]]);
    const screenNames = [
      "color",
      "surface",
      "resolution",
      "projection",
      "origin",
      "far",
      "ao",
      "faces",
      "wire",
      "stroke",
      "background",
      "lineWidth",
    ];
    const su = Object.fromEntries(
      screenNames.map((name) => [name, gl.getUniformLocation(screen.program, `u_${name}`)]),
    );
    let cachedKey = "",
      frame: GpuFrame | undefined,
      uploadedFrame: GpuFrame | undefined,
      uploadedShape: GpuFrame["shape"] | undefined;
    let childBoundsCount = 0;
    let frameWidth = 0,
      frameHeight = 0,
      lastDraw:
        | {
            camera: SpatialCamera;
            spec: GpuSpatialSpec;
            style: SpatialStyle;
            width: number;
            height: number;
            pixelAngle: number;
            nearFootprint: number;
            detailScale: number;
            maxRank?: number;
            growth?: number;
            projection: ReturnType<typeof spatialProjection>;
          }
        | undefined;
    let clearanceKey = "",
      lastClearance = 0;
    const clearanceCache = createGpuClearanceCache();
    const configureFrame = (target: Variant, data: GpuFrame, style: SpatialStyle) => {
      const at = target.uniforms,
        rotation = rotationOf(style);
      if (target.shape !== data.shape) {
        const planes = new Float32Array(80),
          edges = new Float32Array(16);
        data.shape.hull.forEach((plane, index) => {
          planes.set(plane, index * 4);
        });
        data.shape.edges.forEach((edge, index) => {
          edges.set(edge, index * 4);
        });
        gl.uniform4fv(at.hull, planes);
        gl.uniform4fv(at.edges, edges);
        if (at.childHulls) {
          const frames = packChildFrames(data.shape);
          gl.uniform4fv(at.childHulls, packChildHulls(data.shape));
          gl.uniform3fv(at.childCenters, frames.centers);
          gl.uniformMatrix3fv(at.childAxes, false, frames.axes);
        }
        target.shape = data.shape;
      }
      gl.uniform1i(at.roots, 0);
      gl.uniform1i(at.children, 1);
      gl.uniform1i(at.childBounds, 4);
      gl.uniform1i(at.childBoundsCount, childBoundsCount);
      gl.uniform1i(at.orderedChildren, 1);
      gl.uniform1i(at.rootCount, data.roots.length);
      gl.uniform1i(at.childCount, data.shape.children.length);
      gl.uniform1i(at.hullCount, data.shape.hull.length);
      gl.uniform1i(at.edgeCount, data.shape.edges.length);
      gl.uniform1i(at.kind, data.shape.kind);
      gl.uniform1f(at.radius, data.shape.radius);
      gl.uniform1f(at.featureSize, data.shape.featureSize);
      gl.uniform1f(at.coneSlope, data.shape.coneSlope ?? 0);
      gl.uniform1f(at.boundConeSlope, data.shape.boundConeSlope ?? 0);
      gl.uniform1f(at.boundConeBase, data.shape.boundConeBase ?? -1);
      gl.uniform1f(at.boundCylinderRadius, data.shape.boundCylinderRadius ?? 0);
      gl.uniform3fv(at.right, inverseRotate([1, 0, 0], rotation));
      gl.uniform3fv(at.up, inverseRotate([0, 1, 0], rotation));
      gl.uniform3fv(at.forward, inverseRotate([0, 0, -1], rotation));
      gl.uniform1f(at.focal, 2 * FOCAL_SCALE);
      gl.uniform2f(at.projection, 0, 0);
      gl.uniform2f(at.origin, 0, 0);
      gl.uniform1f(at.far, data.horizon);
      gl.uniform1f(at.maxRank, 1000);
      gl.uniform1f(at.growth, 1);
      gl.uniform1f(at.pixelAngle, 1 / (FOCAL_SCALE * 720));
      gl.uniform1f(at.nearFootprint, 0.00002);
      gl.uniform1f(at.detailScale, 2);
      gl.uniform1i(at.useSeed, 0);
      gl.uniform1i(at.seed, 5);
      if (surface) {
        const chart = (data as RomanescoSurfaceFrame).chart;
        const activeChart = chart?.active;
        const residual = chart?.residual;
        gl.uniform1i(
          at.chartMode,
          activeChart?.mode ?? (chart?.kind === "plane" ? 1 : residual ? 5 : 0),
        );
        gl.uniform4fv(
          at.chartPlane,
          chart ? [Math.max(-1e6, Math.min(1e6, chart.offset)), ...chart.gradient] : [0, 0, 0, 0],
        );
        gl.uniform1f(at.chartError, chart?.error ?? 0);
        gl.uniform1f(at.chartShear, 0.63);
        if (activeChart) {
          gl.uniform3fv(at.chartOrigin, activeChart.origin);
          gl.uniform2fv(at.chartPhase, activeChart.phase);
          gl.uniform4fv(at.chartCarrier, activeChart.carrier);
          gl.uniform4fv(at.chartWeight, activeChart.weight);
          gl.uniform2fv(at.chartQOffset, activeChart.qOffset);
          gl.uniform3fv(at.chartQX, activeChart.qJacobian[0]);
          gl.uniform3fv(at.chartQY, activeChart.qJacobian[1]);
          gl.uniform1i(at.chartLevels, activeChart.levels);
          gl.uniform1i(at.chartFirstRank, activeChart.firstRank);
          gl.uniform1f(at.chartBaseGrowth, activeChart.baseGrowth);
        }
        if (residual) {
          const { side, ring, bottom } = residual.orbits;
          gl.uniform1i(at.residualTable, 7);
          gl.uniform3i(at.residualOffsets, side.row, ring.row, bottom.row);
          gl.uniform3i(at.residualCounts, side.count, ring.count, bottom.count);
          gl.uniform3f(
            at.residualInverseSigma,
            side.inverseSigma,
            ring.inverseSigma,
            bottom.inverseSigma,
          );
          gl.uniform1f(at.residualScale, residual.viewScale);
          gl.uniform1f(at.residualHeight, residual.heightAtAnchor);
          gl.uniform1f(at.residualRing, residual.ringRadius);
          gl.uniform1f(at.residualRadialRatio, residual.radialRatio);
          gl.uniform1f(at.residualPrimaryRatio, residual.primaryRatio);
          gl.uniform1f(at.residualSideLogTransport, residual.sideLogTransport);
          gl.uniform1f(at.residualDelta, residual.delta);
          gl.uniform1f(at.residualShearCoefficient, residual.shearCoefficient);
          gl.uniform1f(at.residualBottomUpperWork, residual.bottomUpperWork);
          gl.uniform2fv(at.residualRootUnit, residual.rootUnit);
          gl.uniform2fv(at.residualDiskPoint, residual.diskPoint);
          gl.uniform2fv(at.residualAmplitudeOffsets, residual.amplitudeOffsets);
          gl.uniform2fv(at.residualShearOffsets, residual.shearOffsets);
          gl.uniform3f(
            at.residualAnchorField,
            residual.rawSideWork,
            residual.rawBottomWork,
            residual.yMinusOneWork,
          );
          gl.uniform3fv(at.residualDeltaOffsets, residual.deltaOffsets);
          gl.uniform3fv(at.residualAngleTransports, residual.angleTransports);
        }
      }
    };
    const frameFor = (
      camera: SpatialCamera,
      spec: GpuSpatialSpec,
      style: SpatialStyle,
      options: GpuRenderOptions = {},
    ) => {
      if (initialSpec && spec.kind !== initialSpec.kind)
        throw new Error("A specialized renderer cannot draw a different construction.");
      const rotation = rotationOf(style),
        key = `${JSON.stringify(spec)}|${camera.bits}|${camera.zoom}|${camera.target.join(",")}|${rotation.join(",")}|${options.maxRank ?? 1000}|${options.growth ?? 1}`;
      if (!frame || key !== cachedKey) {
        frame = surface
          ? buildRomanescoSurfaceFrame(camera, style, options)
          : buildGpuFrame(buildGpuShape(spec), camera, style, { previous: frame });
        cachedKey = key;
      }
      return frame;
    };
    const prepare = (
      camera: SpatialCamera,
      spec: GpuSpatialSpec,
      style: SpatialStyle,
      stackOptions: GpuStackOptions & GpuRenderOptions = {},
    ) => {
      frame = frameFor(camera, spec, style, stackOptions);
      const depth: StackDepth = 40;
      const chart = surface ? (frame as RomanescoSurfaceFrame).chart : undefined;
      const mode = chart?.active?.mode ?? (chart?.kind === "plane" ? 1 : chart?.residual ? 5 : 0);
      if (mode !== surfaceMode) {
        const key = variantKey(depth, mode);
        let variant = variants.get(key);
        if (!variant) {
          const next = program(sourceFor(mode));
          variant = { shader: next, uniforms: uniforms(next.program) };
          variants.set(key, variant);
        }
        active = variant;
        shader = active.shader;
        u = active.uniforms;
        surfaceMode = mode;
      }
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
      gl.useProgram(shader.program);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      enablePosition(shader!.program);
      gl.disable(gl.BLEND);
      gl.disable(gl.DITHER);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.SCISSOR_TEST);
      texture(roots!, 0);
      texture(children!, 1);
      if (uploadedFrame !== frame) {
        texture(roots!, 0);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          4,
          MAX_GPU_ROOTS,
          gl.RGBA,
          gl.FLOAT,
          frame.rootData,
        );
        const residual = surface ? (frame as RomanescoSurfaceFrame).chart?.residual : undefined;
        if (residual && residualTable) {
          texture(residualTable, 7);
          gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            residual.width,
            residual.height,
            gl.RGBA,
            gl.FLOAT,
            residual.data,
          );
        }
        uploadedFrame = frame;
      }
      if (!surface && uploadedShape !== frame.shape) {
        const orderedChildren = packOrderedChildren(frame.shape);
        texture(children!, 1);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA32F,
          4,
          frame.shape.children.length * 8,
          0,
          gl.RGBA,
          gl.FLOAT,
          orderedChildren,
        );
        const bounds = packGpuChildBounds(packChildBounds(frame.shape));
        childBoundsCount = bounds.nodeCount;
        texture(childBounds, 4);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA32UI,
          1,
          Math.max(1, childBoundsCount * 8),
          0,
          gl.RGBA_INTEGER,
          gl.UNSIGNED_INT,
          bounds.data,
        );
        uploadedShape = frame.shape;
      }
      configureFrame(active, frame, style);
      return frame;
    };
    const query = (
      camera: SpatialCamera,
      spec: GpuSpatialSpec,
      style: SpatialStyle,
      mode: number,
      ray: Vec3,
      options: GpuDiagnosticOptions = {},
    ) => {
      prepare(camera, spec, style, {
        minimumFootprint: (options.nearFootprint ?? 0.00002) * (options.detailScale ?? 2),
        pixelFootprint: (options.pixelAngle ?? 0.0001) * (options.detailScale ?? 2),
        maxRank: options.maxRank ?? 1000,
        growth: options.growth ?? 1,
        clearance: mode === 2,
      });
      gl.uniform1i(u.query, mode);
      gl.uniform3fv(u.queryRay, ray);
      gl.uniform2f(u.resolution, 1, 1);
      gl.uniform1f(u.maxRank, options.maxRank ?? 1000);
      gl.uniform1f(u.growth, Math.max(0, Math.min(1, options.growth ?? 1)));
      gl.uniform1f(u.pixelAngle, options.pixelAngle ?? 0.0001);
      gl.uniform1f(u.nearFootprint, options.nearFootprint ?? 0.00002);
      gl.uniform1f(u.detailScale, options.detailScale ?? 2);
      gl.bindFramebuffer(gl.FRAMEBUFFER, queryFramebuffer);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.viewport(0, 0, 1, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const bytes = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.drawBuffers([gl.BACK]);
      return bytes;
    };
    const decode = (bytes: Uint8Array) => new DataView(bytes.buffer).getFloat32(0, true);
    return {
      draw(
        camera: SpatialCamera,
        spec: GpuSpatialSpec,
        style: SpatialStyle,
        width: number,
        height: number,
        ratio = 1,
        pixelBudget = MAX_FLIGHT_PIXELS,
        viewFrame?: FractalFrame | null,
        options: GpuRenderOptions = {},
      ) {
        const scale = webglPixelRatio(gl, width, height, ratio, pixelBudget);
        const w = Math.max(1, Math.round(width * scale)),
          h = Math.max(1, Math.round(height * scale));
        const projection = spatialProjection(width, height, viewFrame);
        const renderScale = Math.min(w / width, h / height);
        const pixelAngle = 1 / (projection.focal * renderScale),
          nearFootprint = pixelAngle * 0.02;
        const detailScale = 2 * Math.max(1, renderScale);
        const data = prepare(camera, spec, style, {
          minimumFootprint: nearFootprint * detailScale,
          pixelFootprint: pixelAngle * detailScale,
          maxRank: options.maxRank ?? 1000,
          growth: options.growth ?? 1,
        });
        if (gl.canvas.width !== w || gl.canvas.height !== h) {
          gl.canvas.width = w;
          gl.canvas.height = h;
        }
        if (w !== frameWidth || h !== frameHeight) {
          frameWidth = w;
          frameHeight = h;
          surfaces.forEach((surface, i) => {
            texture(surface!, i + 2);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          });
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        surfaces.forEach((surface, i) => {
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            gl.TEXTURE_2D,
            surface,
            0,
          );
        });
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
          throw new Error("Could not prepare the GPU fractal frame.");
        gl.viewport(0, 0, w, h);
        gl.clearBufferfv(gl.COLOR, 0, new Float32Array([...rgb(style.background), 1]));
        gl.clearBufferfv(gl.COLOR, 1, new Float32Array([0.5, 0.5, 1, 1]));
        const origin = [0, 1 - (2 * projection.centerY) / height];
        const configureDrawing = (at: typeof u) => {
          gl.uniform1i(at.query, 0);
          gl.uniform1f(at.maxRank, options.maxRank ?? 1000);
          gl.uniform1f(at.growth, Math.max(0, Math.min(1, options.growth ?? 1)));
          gl.uniform2f(at.resolution, w, h);
          gl.uniform2f(
            at.projection,
            (2 * projection.focal) / width,
            (2 * projection.focal) / height,
          );
          gl.uniform2fv(at.origin, origin);
          gl.uniform1f(at.pixelAngle, pixelAngle);
          gl.uniform1f(at.nearFootprint, nearFootprint);
          gl.uniform1f(at.detailScale, detailScale);
        };
        configureDrawing(u);
        gl.uniform3fv(u.fill, rgb(style.fillColor));
        gl.uniform3fv(u.stroke, rgb(style.strokeColor));
        gl.uniform3fv(u.background, rgb(style.background));
        gl.uniform1i(u.faces, style.showFaces ? 1 : 0);
        gl.uniform1i(u.wire, style.showWireframe && style.lineWidth > 0 ? 1 : 0);
        gl.uniform1f(u.lineWidth, style.lineWidth);
        gl.uniform1i(u.lighting, style.lighting === "classic" ? 0 : 1);
        gl.uniform1i(
          u.occlusion,
          style.occlusion === "off" ? 0 : style.occlusion === "minecraft" ? 2 : 1,
        );
        gl.uniform1f(u.fogScale, 2 ** ((camera.atmosphereZoom ?? camera.zoom) - camera.zoom) / 96);
        gl.uniform1f(u.reliefFront, spatialReliefFront(camera, rotationOf(style)));
        // Project root bounds to avoid tracing the empty margins of exterior views.
        let left = w,
          bottom = h,
          right = 0,
          top = 0;
        const rotation = rotationOf(style);
        const chart = surface ? (data as RomanescoSurfaceFrame).chart : undefined;
        if (chart?.active || chart?.kind === "plane" || chart?.residual) {
          left = bottom = 0;
          right = w;
          top = h;
        }
        for (const root of data.roots) {
          if (root.cone) {
            // A locally clipped ancestor core can cross any part of the view.
            left = bottom = 0;
            right = w;
            top = h;
            break;
          }
          let nearEye = false,
            front = false;
          const projected: number[][] = [];
          for (let mask = 0; mask < 8; mask++) {
            const p = applyPoint(
              root,
              [0, 1, 2].map((i) =>
                mask & (1 << i) ? data.shape.high[i] : data.shape.low[i],
              ) as Vec3,
            );
            const v = [0, 1, 2].map(
              (i) =>
                rotation[i * 3] * p[0] + rotation[i * 3 + 1] * p[1] + rotation[i * 3 + 2] * p[2],
            );
            if (v[2] >= -0.001) nearEye = true;
            else {
              front = true;
              projected.push([
                ((projection.centerX - (v[0] / v[2]) * projection.focal) * w) / width,
                ((height - projection.centerY - (v[1] / v[2]) * projection.focal) * h) / height,
              ]);
            }
          }
          if (!front) continue;
          if (nearEye) {
            left = bottom = 0;
            right = w;
            top = h;
            break;
          }
          for (const p of projected) {
            left = Math.min(left, p[0]);
            right = Math.max(right, p[0]);
            bottom = Math.min(bottom, p[1]);
            top = Math.max(top, p[1]);
          }
        }
        const x = Math.max(0, Math.floor(left) - 1),
          y = Math.max(0, Math.floor(bottom) - 1);
        const sw = Math.max(0, Math.min(w, Math.ceil(right) + 1) - x),
          sh = Math.max(0, Math.min(h, Math.ceil(top) + 1) - y);
        if (sw && sh) {
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(x, y, sw, sh);
          if (tracePasses) tracePasses.draw(shader.program);
          else gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.disable(gl.SCISSOR_TEST);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawBuffers([gl.BACK]);
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
        gl.useProgram(screen.program);
        enablePosition(screen!.program);
        surfaces.forEach((surface, i) => {
          texture(surface, i + 2);
        });
        gl.uniform1i(su.color, 2);
        gl.uniform1i(su.surface, 3);
        gl.uniform2f(su.resolution, w, h);
        gl.uniform2f(
          su.projection,
          (2 * projection.focal) / width,
          (2 * projection.focal) / height,
        );
        gl.uniform2fv(su.origin, origin);
        gl.uniform1f(su.far, data.horizon);
        gl.uniform1i(su.faces, style.showFaces ? 1 : 0);
        gl.uniform1i(su.wire, style.showWireframe && style.lineWidth > 0 ? 1 : 0);
        gl.uniform3fv(su.stroke, rgb(style.strokeColor));
        gl.uniform3fv(su.background, rgb(style.background));
        gl.uniform1f(su.lineWidth, style.lineWidth * renderScale);
        gl.uniform1f(
          su.ao,
          !style.showFaces || style.occlusion === "off"
            ? 0
            : style.occlusion === "minecraft"
              ? 2
              : 1,
        );
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        lastDraw = {
          camera,
          spec,
          style,
          width,
          height,
          pixelAngle,
          nearFootprint,
          detailScale,
          projection,
          maxRank: options.maxRank,
          growth: options.growth,
        };
        return {
          roots: data.roots.length,
          visited: data.visited,
          pixels: w * h,
          stackDepth: surface ? 0 : stackDepth,
          seed: false,
        };
      },
      pick(x: number, y: number): Vec3 | null {
        if (!lastDraw) return null;
        const {
          camera,
          spec,
          style,
          projection,
          width: _width,
          height: _height,
          ...detail
        } = lastDraw;
        const viewRay = normalize([
          (x - projection.centerX) / projection.focal,
          (projection.centerY - y) / projection.focal,
          -1,
        ]);
        const ray = inverseRotate(viewRay, rotationOf(style)),
          distance = decode(query(camera, spec, style, 1, ray, detail));
        return distance >= 0
          ? [viewRay[0] * distance, viewRay[1] * distance, CAMERA_DISTANCE + viewRay[2] * distance]
          : null;
      },
      clearance(
        camera: SpatialCamera,
        spec: GpuSpatialSpec,
        style: SpatialStyle,
        options: GpuRenderOptions = {},
      ) {
        if (spec.kind === "romanesco") {
          const key = `${JSON.stringify(spec)}|${options.maxRank ?? 1000}|${Math.max(0, Math.min(1, options.growth ?? 1))}`;
          const cached = clearanceCache.read(camera, style, key);
          if (cached !== null) return cached;
          // Collision checks must not wait behind a full-resolution GPU draw.
          // Unfinished CPU branches retain their enclosing hull in the bound.
          const raw = surface
            ? romanescoSurfaceFrameClearance(
                frameFor(camera, spec, style, options) as RomanescoSurfaceFrame,
                options,
              )
            : romanescoCpuClearance(frameFor(camera, spec, style), options).distance;
          const distance = Number.isFinite(raw) ? Math.max(0, raw) : 0;
          clearanceCache.write(camera, style, key, distance);
          return distance;
        }
        prepare(camera, spec, style, { clearance: true, maxRank: options.maxRank ?? 1000 });
        const key = `${cachedKey}|${options.maxRank ?? 1000}|${options.growth ?? 1}`;
        if (clearanceKey !== key) {
          lastClearance = Math.max(0, decode(query(camera, spec, style, 2, [0, 0, -1], options)));
          clearanceKey = key;
        }
        return lastClearance;
      },
      queryRay(
        camera: SpatialCamera,
        spec: GpuSpatialSpec,
        style: SpatialStyle,
        ray: Vec3,
        options: GpuDiagnosticOptions = {},
      ) {
        const distance = decode(query(camera, spec, style, 1, ray, options)),
          normalBytes = query(camera, spec, style, 3, ray, options);
        return {
          distance: distance >= 0 ? distance : null,
          normal: Array.from(normalBytes.slice(0, 3), (v) => (v / 255) * 2 - 1) as Vec3,
          complete: normalBytes[3] === 0 || normalBytes[3] > 250,
          hit: normalBytes[3] > 0,
        };
      },
      destroy() {
        release();
      },
    };
  } catch (error) {
    release();
    throw error;
  }
}
