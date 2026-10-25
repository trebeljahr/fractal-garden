import type { FractalFrame } from "../fractalFrame";
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
import {
  applyPoint,
  buildGpuFrame,
  buildGpuShape,
  type GpuFrame,
  type GpuSpatialSpec,
  MAX_GPU_ROOTS,
  normalize,
  packOrderedChildren,
} from "./model";
import { specializeSpatialShader } from "./shader";

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
export type GpuDiagnosticOptions = {
  maxRank?: number;
  pixelAngle?: number;
  nearFootprint?: number;
  detailScale?: number;
};

/** One ray-traversal pass produces color and surface data; contact shading is a cheap screen pass. */
export function createSpatialGpuRenderer(
  gl: WebGL2RenderingContext,
  spec?: Pick<GpuSpatialSpec, "kind">,
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
    const shader = program(specializeSpatialShader(fragment, spec)),
      screen = program(screenFragment);
    const vao = allocate(gl.createVertexArray(), (r) => gl.deleteVertexArray(r)),
      buffer = allocate(gl.createBuffer(), (r) => gl.deleteBuffer(r));
    const newTexture = () => allocate(gl.createTexture(), (r) => gl.deleteTexture(r));
    const roots = newTexture(),
      children = newTexture(),
      queryTexture = newTexture(),
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, queryFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, queryTexture, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error("Could not prepare GPU navigation queries.");
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const names = [
      "roots",
      "children",
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
    ];
    const u = Object.fromEntries(
      names.map((name) => [name, gl.getUniformLocation(shader.program, `u_${name}`)]),
    );
    const screenNames = ["color", "surface", "resolution", "projection", "origin", "far", "ao"];
    const su = Object.fromEntries(
      screenNames.map((name) => [name, gl.getUniformLocation(screen.program, `u_${name}`)]),
    );
    let cachedKey = "",
      frame: GpuFrame | undefined,
      uploadedFrame: GpuFrame | undefined,
      uploadedShape: GpuFrame["shape"] | undefined;
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
            projection: ReturnType<typeof spatialProjection>;
          }
        | undefined;
    let clearanceKey = "",
      lastClearance = 0;
    const prepare = (camera: SpatialCamera, spec: GpuSpatialSpec, style: SpatialStyle) => {
      const rotation = rotationOf(style),
        key = `${JSON.stringify(spec)}|${camera.bits}|${camera.zoom}|${camera.target.join(",")}|${rotation.join(",")}`;
      if (!frame || key !== cachedKey) {
        frame = buildGpuFrame(buildGpuShape(spec), camera, style, { previous: frame });
        cachedKey = key;
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
          packOrderedChildren(frame.shape),
        );
        const planes = new Float32Array(80),
          edges = new Float32Array(16);
        frame.shape.hull.forEach((p, i) => {
          planes.set(p, i * 4);
        });
        frame.shape.edges.forEach((p, i) => {
          edges.set(p, i * 4);
        });
        gl.uniform4fv(u.hull, planes);
        gl.uniform4fv(u.edges, edges);
        uploadedShape = frame.shape;
      }
      gl.uniform1i(u.roots, 0);
      gl.uniform1i(u.children, 1);
      gl.uniform1i(u.orderedChildren, 1);
      gl.uniform1i(u.rootCount, frame.roots.length);
      gl.uniform1i(u.childCount, frame.shape.children.length);
      gl.uniform1i(u.hullCount, frame.shape.hull.length);
      gl.uniform1i(u.edgeCount, frame.shape.edges.length);
      gl.uniform1i(u.kind, frame.shape.kind);
      gl.uniform1f(u.radius, frame.shape.radius);
      gl.uniform1f(u.featureSize, frame.shape.featureSize);
      gl.uniform3fv(u.right, inverseRotate([1, 0, 0], rotation));
      gl.uniform3fv(u.up, inverseRotate([0, 1, 0], rotation));
      gl.uniform3fv(u.forward, inverseRotate([0, 0, -1], rotation));
      gl.uniform1f(u.focal, 2 * FOCAL_SCALE);
      gl.uniform2f(u.projection, 0, 0);
      gl.uniform2f(u.origin, 0, 0);
      gl.uniform1f(u.far, frame.horizon);
      gl.uniform1f(u.maxRank, 1000);
      gl.uniform1f(u.pixelAngle, 1 / (FOCAL_SCALE * 720));
      gl.uniform1f(u.nearFootprint, 0.00002);
      gl.uniform1f(u.detailScale, 2);
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
      prepare(camera, spec, style);
      gl.uniform1i(u.query, mode);
      gl.uniform3fv(u.queryRay, ray);
      gl.uniform2f(u.resolution, 1, 1);
      gl.uniform1f(u.maxRank, options.maxRank ?? 1000);
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
      ) {
        const data = prepare(camera, spec, style),
          scale = Math.min(ratio, 2, Math.sqrt(pixelBudget / Math.max(1, width * height)));
        const w = Math.max(1, Math.round(width * scale)),
          h = Math.max(1, Math.round(height * scale));
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
        const projection = spatialProjection(width, height, viewFrame);
        const renderScale = Math.min(w / width, h / height);
        const pixelAngle = 1 / (projection.focal * renderScale),
          nearFootprint = pixelAngle * 0.02;
        const detailScale = 2 * Math.max(1, renderScale);
        const origin = [0, 1 - (2 * projection.centerY) / height];
        gl.uniform1i(u.query, 0);
        gl.uniform2f(u.resolution, w, h);
        gl.uniform2f(u.projection, (2 * projection.focal) / width, (2 * projection.focal) / height);
        gl.uniform2fv(u.origin, origin);
        gl.uniform1f(u.pixelAngle, pixelAngle);
        gl.uniform1f(u.nearFootprint, nearFootprint);
        gl.uniform1f(u.detailScale, detailScale);
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
        };
        return { roots: data.roots.length, visited: data.visited, pixels: w * h };
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
      clearance(camera: SpatialCamera, spec: GpuSpatialSpec, style: SpatialStyle) {
        prepare(camera, spec, style);
        if (clearanceKey !== cachedKey) {
          lastClearance = Math.max(0, decode(query(camera, spec, style, 2, [0, 0, -1])));
          clearanceKey = cachedKey;
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
