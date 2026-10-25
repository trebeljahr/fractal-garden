import type { FractalFrame } from "../fractalFrame";
import { webglPixelRatio } from "../renderResolution";
import { createShaderProgram } from "../shaders/compileShader";
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
  packOrderedChildren,
} from "./model";
import { spatialShaderStackDepth, specializeSpatialShader } from "./shader";
import { packGpuRomanescoUniformGeometry } from "./uniformGeometry";

const screenFragment = `#version 300 es
precision highp float;
uniform sampler2D u_color, u_surface;
uniform vec2 u_resolution, u_projection, u_origin;
uniform float u_far, u_ao;
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
    // A fixed Romanesco kind lets the driver eliminate the unrelated solid and
    // Koch paths, rather than keeping their branches and temporaries live.
    const specialized = initialSpec?.kind === "romanesco";
    const sourceFor = (depth: StackDepth, beamPass = false) =>
      specialized
        ? fragment
            .replace("uniform int u_kind;", "const int u_kind = 3;")
            .replace(
              "#version 300 es",
              `#version 300 es\n#define SPATIAL_STACK_DEPTH ${depth}\n#define ROMANESCO_UNIFORM_GEOMETRY\n#define ROMANESCO_DEFER_NORMALS\n#define ${beamPass ? "ROMANESCO_BEAM_PASS" : "ROMANESCO_BEAM_USE"}`,
            )
        : specializeSpatialShader(fragment, initialSpec);
    let stackDepth: StackDepth = specialized ? 8 : 40;
    let shader = program(sourceFor(stackDepth));
    const screen = program(screenFragment);
    const vao = allocate(gl.createVertexArray(), (r) => gl.deleteVertexArray(r)),
      buffer = allocate(gl.createBuffer(), (r) => gl.deleteBuffer(r));
    const uniformBuffers = specialized
      ? Array.from({ length: 3 }, () =>
          allocate(gl.createBuffer(), (target) => gl.deleteBuffer(target)),
        )
      : [];
    const newTexture = () => allocate(gl.createTexture(), (r) => gl.deleteTexture(r));
    const roots = newTexture(),
      children = newTexture(),
      childBounds = newTexture(),
      queryTexture = newTexture(),
      surfaces = [newTexture(), newTexture()],
      beams = specialized ? Array.from({ length: 4 }, newTexture) : [];
    const framebuffer = allocate(gl.createFramebuffer(), (r) => gl.deleteFramebuffer(r)),
      queryFramebuffer = allocate(gl.createFramebuffer(), (r) => gl.deleteFramebuffer(r)),
      beamFramebuffer = specialized
        ? allocate(gl.createFramebuffer(), (r) => gl.deleteFramebuffer(r))
        : undefined;
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
    beams.forEach((target, index) => {
      texture(target, index + 5);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32UI,
        1,
        1,
        0,
        gl.RGBA_INTEGER,
        gl.UNSIGNED_INT,
        new Uint32Array(4),
      );
    });
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
      "beam0",
      "beam1",
      "beam2",
      "beam3",
      "useBeam",
    ];
    const uniforms = (target: WebGLProgram) =>
      Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(target, `u_${name}`)]));
    let u = uniforms(shader.program);
    type Variant = {
      shader: typeof shader;
      uniforms: typeof u;
      shape?: GpuFrame["shape"];
      blocksBound?: boolean;
    };
    let active: Variant = { shader, uniforms: u };
    const variants = new Map<StackDepth, Variant>([[stackDepth, active]]);
    const beamVariants = new Map<StackDepth, Variant>();
    const screenNames = ["color", "surface", "resolution", "projection", "origin", "far", "ao"];
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
      beamWidth = 0,
      beamHeight = 0,
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
      if (specialized) {
        if (!target.blocksBound) {
          ["RomanescoChildren", "RomanescoBounds0", "RomanescoBounds1"].forEach((name, binding) => {
            const index = gl.getUniformBlockIndex(target.shader.program, name);
            if (index !== gl.INVALID_INDEX)
              gl.uniformBlockBinding(target.shader.program, index, binding);
          });
          target.blocksBound = true;
        }
        uniformBuffers.forEach((target, binding) => {
          gl.bindBufferBase(gl.UNIFORM_BUFFER, binding, target);
        });
      }
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
      gl.uniform1i(at.useBeam, 0);
      beams.forEach((_, index) => {
        gl.uniform1i(at[`beam${index}`], index + 5);
      });
    };
    const prepare = (
      camera: SpatialCamera,
      spec: GpuSpatialSpec,
      style: SpatialStyle,
      stackOptions: GpuStackOptions = {},
    ) => {
      if (initialSpec && spec.kind !== initialSpec.kind)
        throw new Error("A specialized renderer cannot draw a different construction.");
      const rotation = rotationOf(style),
        key = `${JSON.stringify(spec)}|${camera.bits}|${camera.zoom}|${camera.target.join(",")}|${rotation.join(",")}`;
      if (!frame || key !== cachedKey) {
        frame = buildGpuFrame(buildGpuShape(spec), camera, style, { previous: frame });
        cachedKey = key;
      }
      const depth = specialized ? spatialShaderStackDepth(frame, stackOptions) : 40;
      if (depth !== stackDepth) {
        let variant = variants.get(depth);
        if (!variant) {
          const next = program(sourceFor(depth));
          variant = { shader: next, uniforms: uniforms(next.program) };
          variants.set(depth, variant);
        }
        active = variant;
        shader = active.shader;
        u = active.uniforms;
        stackDepth = depth;
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
        uploadedFrame = frame;
      }
      if (uploadedShape !== frame.shape) {
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
        if (specialized) {
          const geometry = packGpuRomanescoUniformGeometry(orderedChildren, bounds);
          [geometry.children, geometry.bounds0, geometry.bounds1].forEach((values, binding) => {
            gl.bindBuffer(gl.UNIFORM_BUFFER, uniformBuffers[binding]);
            gl.bufferData(gl.UNIFORM_BUFFER, values, gl.STATIC_DRAW);
          });
        }
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
        let beam = false;
        if (sw && sh) {
          if (specialized && (options.maxRank ?? 1000) > 0) {
            let variant = beamVariants.get(stackDepth);
            if (!variant) {
              const next = program(sourceFor(stackDepth, true));
              variant = { shader: next, uniforms: uniforms(next.program) };
              beamVariants.set(stackDepth, variant);
            }
            const bw = Math.ceil(w / 8),
              bh = Math.ceil(h / 8);
            gl.bindFramebuffer(gl.FRAMEBUFFER, beamFramebuffer!);
            if (bw !== beamWidth || bh !== beamHeight) {
              beams.forEach((target, index) => {
                texture(target, index + 5);
                gl.texImage2D(
                  gl.TEXTURE_2D,
                  0,
                  gl.RGBA32UI,
                  bw,
                  bh,
                  0,
                  gl.RGBA_INTEGER,
                  gl.UNSIGNED_INT,
                  null,
                );
                gl.framebufferTexture2D(
                  gl.FRAMEBUFFER,
                  gl.COLOR_ATTACHMENT0 + index,
                  gl.TEXTURE_2D,
                  target,
                  0,
                );
              });
              beamWidth = bw;
              beamHeight = bh;
              gl.drawBuffers([
                gl.COLOR_ATTACHMENT0,
                gl.COLOR_ATTACHMENT1,
                gl.COLOR_ATTACHMENT2,
                gl.COLOR_ATTACHMENT3,
              ]);
              if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
                throw new Error("Could not prepare GPU tile traversal.");
            }
            gl.drawBuffers([
              gl.COLOR_ATTACHMENT0,
              gl.COLOR_ATTACHMENT1,
              gl.COLOR_ATTACHMENT2,
              gl.COLOR_ATTACHMENT3,
            ]);
            for (let index = 0; index < 4; index++)
              gl.clearBufferuiv(gl.COLOR, index, new Uint32Array(4));
            // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
            gl.useProgram(variant.shader.program);
            enablePosition(variant.shader.program);
            configureFrame(variant, data, style);
            configureDrawing(variant.uniforms);
            gl.viewport(0, 0, bw, bh);
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(
              Math.floor(x / 8),
              Math.floor(y / 8),
              Math.ceil((x + sw) / 8) - Math.floor(x / 8),
              Math.ceil((y + sh) / 8) - Math.floor(y / 8),
            );
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.disable(gl.SCISSOR_TEST);
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
            gl.viewport(0, 0, w, h);
            // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
            gl.useProgram(shader.program);
            enablePosition(shader.program);
            gl.uniform1i(u.useBeam, 1);
            beam = true;
          }
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(x, y, sw, sh);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
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
        return { roots: data.roots.length, visited: data.visited, pixels: w * h, stackDepth, beam };
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
          // Query prepares its own frame. Reused safe balls avoid both that CPU
          // work and a synchronous readback behind the previous full draw.
          const raw = decode(query(camera, spec, style, 2, [0, 0, -1], options));
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
