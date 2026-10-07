import { createShaderProgram } from "../shaders/compileShader";
import { fixedToNumber, rescale } from "./bigfixed";
import type { Geometry } from "./engine";
import type { ColorMode, Dimension } from "./spec";
import type { ZoomDetail } from "./zoom";

// yaw and pitch orbit around the target, zoom moves the eye closer, and
// targetX/Y/Z shift the orbit center away from the middle of the drawing (in
// drawing units). panX/panY shift the flat 2D view in screen pixels, around
// the drawing's center moved by deepX/deepY / 2^deepBits: endless zoom
// needs more digits for that point than a float has.
export type Camera = {
  yaw: number;
  pitch: number;
  zoom: number;
  panX: number;
  panY: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  deepX: bigint;
  deepY: bigint;
  deepBits: number;
};

export const DEFAULT_CAMERA: Camera = {
  yaw: 0.6,
  pitch: -0.35,
  zoom: 1,
  panX: 0,
  panY: 0,
  targetX: 0,
  targetY: 0,
  targetZ: 0,
  deepX: BigInt(0),
  deepY: BigInt(0),
  deepBits: 64,
};
export const FLAT_CAMERA: Camera = { ...DEFAULT_CAMERA, yaw: 0, pitch: 0 };

export type Style = {
  color: string;
  colorEnd: string;
  colorMode: ColorMode;
  background: string;
  lineWidth: number;
};

// The part of the canvas the drawing is fitted into, so it can sit beside the
// editor panel instead of underneath it.
export type Viewport = { x: number; y: number; width: number; height: number };

// Geometry from the worker, with the center and radius used to fit it.
// Segments arrive in drawing order, with a 0..1 color position each.
export type Drawing = {
  geometry: Geometry;
  colors: Float32Array;
  center: [number, number, number];
  radius: number;
};

const PADDING = 0.08;

// Screen pixels per drawing unit for a flat drawing at zoom 1: the whole
// drawing fits the viewport minus padding.
export function flatFit(geometry: Geometry, viewport: Viewport) {
  const spanX = Math.max(geometry.max[0] - geometry.min[0], 1e-6);
  const spanY = Math.max(geometry.max[1] - geometry.min[1], 1e-6);
  return Math.min(
    (viewport.width * (1 - 2 * PADDING)) / spanX,
    (viewport.height * (1 - 2 * PADDING)) / spanY,
  );
}
const FIELD_OF_VIEW = (35 * Math.PI) / 180;

// The eye's axes in drawing space for a camera, and how far the eye sits from
// the target. Shared by the renderer and the pointer handling, so a drag moves
// the drawing exactly with the cursor.
export type View = {
  right: [number, number, number];
  up: [number, number, number];
  forward: [number, number, number];
  distance: number;
  // Screen pixels per drawing unit at the target's depth.
  focal: number;
};

export function viewFor(camera: Camera, radius: number, viewport: Viewport): View {
  const c = Math.cos(camera.yaw);
  const s = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  const focal = Math.min(viewport.width, viewport.height) / 2 / Math.tan(FIELD_OF_VIEW / 2);
  // At zoom 1 the drawing's bounding sphere fills the viewport minus padding.
  const fit = radius / Math.tan(FIELD_OF_VIEW / 2) / (1 - 2 * PADDING);
  return {
    right: [c, 0, s],
    up: [s * sp, cp, -c * sp],
    forward: [-s * cp, sp, c * cp],
    distance: fit / camera.zoom,
    focal,
  };
}

// Flat 2D drawings: every segment is one instance of a screen-aligned quad, so
// line widths from ! and # work everywhere (WebGL's own lines are 1px on most
// platforms).
const flatVertexShader = `
precision highp float;

attribute vec2 a_corner;
attribute vec3 a_start;
attribute vec3 a_end;
attribute float a_t;
attribute float a_width;

uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform vec3 u_center;
uniform float u_scale;
uniform float u_lineWidth;
uniform float u_pixel;
uniform vec3 u_color;
uniform vec3 u_colorEnd;

varying vec4 v_color;
varying vec2 v_local;
varying float v_length;
varying float v_halfWidth;
varying float v_rounded;

vec2 project(vec3 p) {
  vec3 d = p - u_center;
  return u_origin + vec2(d.x, -d.y) * u_scale;
}

void main() {
  vec2 a = project(a_start);
  vec2 b = project(a_end);
  vec2 delta = b - a;
  float len = length(delta);
  vec2 dir = len > 1e-4 ? delta / len : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);

  float width = max(u_lineWidth * a_width, 0.25);
  // Lines thinner than a device pixel get a full pixel and fade instead,
  // the way a 2D canvas antialiases them.
  float drawn = max(width, u_pixel);
  float halfWidth = drawn * 0.5;
  float rounded = width > 2.0 ? 1.0 : 0.0;
  float cap = rounded * halfWidth;
  float along = mix(-cap, len + cap, a_corner.x);
  vec2 position = a + dir * along + normal * halfWidth * a_corner.y;

  v_color = vec4(mix(u_color, u_colorEnd, a_t), width / drawn);
  v_local = vec2(along, halfWidth * a_corner.y);
  v_length = len;
  v_halfWidth = halfWidth;
  v_rounded = rounded;

  vec2 clip = vec2(position.x / u_resolution.x * 2.0 - 1.0, 1.0 - position.y / u_resolution.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
}
`;

const flatFragmentShader = `
precision highp float;

varying vec4 v_color;
varying vec2 v_local;
varying float v_length;
varying float v_halfWidth;
varying float v_rounded;

void main() {
  // Round caps for wide lines, so branches join without notches.
  if (v_rounded > 0.5) {
    float u = max(max(-v_local.x, v_local.x - v_length), 0.0);
    if (u * u + v_local.y * v_local.y > v_halfWidth * v_halfWidth) discard;
  }
  gl_FragColor = v_color;
}
`;

// 3D drawings: every segment is one instance of a lit tube, and a small ball
// at its end closes the joint to the next segment. The depth buffer sorts
// them, so near branches hide far ones instead of blending through.
const solidVertexShader = `
precision highp float;

attribute vec3 a_mesh;
attribute vec3 a_start;
attribute vec3 a_end;
attribute float a_t;
attribute float a_width;

uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform vec3 u_target;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_forward;
uniform float u_distance;
uniform float u_focal;
uniform float u_near;
uniform float u_far;
uniform float u_unit;
uniform float u_lineWidth;
uniform float u_ball;
uniform vec3 u_color;
uniform vec3 u_colorEnd;

varying vec3 v_color;
varying vec3 v_normal;
varying float v_depth;

vec3 toView(vec3 p) {
  vec3 d = p - u_target;
  return vec3(dot(d, u_right), dot(d, u_up), dot(d, u_forward) - u_distance);
}

void main() {
  vec3 axis = a_end - a_start;
  float len = length(axis);
  vec3 dir = len > 1e-9 ? axis / len : vec3(0.0, 1.0, 0.0);
  vec3 side = normalize(cross(dir, abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 other = cross(dir, side);

  // The line width is in screen pixels at the starting zoom, so tubes look
  // like the 2D lines at first and grow as you move closer. Very thin tubes
  // keep half a pixel so they never vanish.
  vec3 anchor = u_ball > 0.5 ? a_end : (a_start + a_end) * 0.5;
  float eye = max(-toView(anchor).z, u_near);
  float radius = max(0.5 * u_lineWidth * a_width * u_unit, 0.5 * eye / u_focal);

  vec3 normal;
  vec3 world;
  if (u_ball > 0.5) {
    normal = a_mesh;
    world = a_end + a_mesh * radius;
  } else {
    normal = side * a_mesh.x + other * a_mesh.y;
    world = mix(a_start, a_end, a_mesh.z) + normal * radius;
  }

  vec3 v = toView(world);
  float w = -v.z;
  v_color = mix(u_color, u_colorEnd, a_t);
  v_normal = vec3(dot(normal, u_right), dot(normal, u_up), dot(normal, u_forward));
  v_depth = w;
  gl_Position = vec4(
    (u_origin.x / u_resolution.x * 2.0 - 1.0) * w + v.x * u_focal * 2.0 / u_resolution.x,
    (1.0 - u_origin.y / u_resolution.y * 2.0) * w + v.y * u_focal * 2.0 / u_resolution.y,
    (u_far + u_near) / (u_far - u_near) * w - 2.0 * u_far * u_near / (u_far - u_near),
    w
  );
}
`;

const solidFragmentShader = `
precision highp float;

uniform vec3 u_background;
uniform float u_distance;
uniform float u_radius;

varying vec3 v_color;
varying vec3 v_normal;
varying float v_depth;

void main() {
  vec3 n = normalize(v_normal);
  // Light from the upper left, a little in front of the viewer.
  vec3 light = normalize(vec3(-0.45, 0.65, 0.6));
  float diffuse = max(dot(n, light), 0.0);
  float rim = pow(1.0 - max(n.z, 0.0), 2.0);
  float shine = pow(max(dot(n, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), 28.0);
  vec3 color = v_color * (0.38 + 0.72 * diffuse) + vec3(0.18) * shine + v_color * 0.12 * rim;
  // Far parts sink a little into the backdrop, which reads as depth.
  float fog = clamp((v_depth - u_distance) / (u_radius * 2.0), 0.0, 1.0) * 0.5;
  gl_FragColor = vec4(mix(color, u_background, fog), 1.0);
}
`;

// Two triangles: x is 0 at the start and 1 at the end, y is the side.
const CORNERS = new Float32Array([0, -1, 1, -1, 1, 1, 0, -1, 1, 1, 0, 1]);

type Mesh = { vertices: Float32Array; indices: Uint16Array };

// An open tube of radius 1 along z from 0 to 1: x and y hold the ring
// direction, z the position along the segment.
function tubeMesh(sides: number): Mesh {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    vertices.push(Math.cos(angle), Math.sin(angle), 0, Math.cos(angle), Math.sin(angle), 1);
    const a = i * 2;
    const b = ((i + 1) % sides) * 2;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

// A unit sphere.
function ballMesh(rings: number, sides: number): Mesh {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const theta = (r / rings) * Math.PI;
    for (let s = 0; s <= sides; s++) {
      const phi = (s / sides) * Math.PI * 2;
      vertices.push(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi),
      );
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sides; s++) {
      const a = r * (sides + 1) + s;
      const b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

// Fewer faces for huge drawings, so they stay interactive.
const DETAIL = [
  { upTo: 60_000, tube: tubeMesh(10), ball: ballMesh(5, 10) },
  { upTo: 400_000, tube: tubeMesh(6), ball: ballMesh(3, 6) },
  { upTo: Number.POSITIVE_INFINITY, tube: tubeMesh(4), ball: null },
];

function parseHex(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export type Renderer = {
  draw: (
    drawing: Drawing | null,
    style: Style,
    dimension: Dimension,
    camera: Camera,
    viewport: Viewport,
    detail?: ZoomDetail | null,
  ) => void;
  dispose: () => void;
};

export function createRenderer(gl: WebGLRenderingContext): Renderer | null {
  const instancing = gl.getExtension("ANGLE_instanced_arrays");
  if (!instancing) return null;
  const flat = createShaderProgram(gl, flatVertexShader, flatFragmentShader);
  const solid = createShaderProgram(gl, solidVertexShader, solidFragmentShader);
  if (!flat || !solid) return null;

  const cornerBuffer = gl.createBuffer();
  const positionBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  const widthBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, CORNERS, gl.STATIC_DRAW);

  const meshes = DETAIL.map((detail) =>
    [detail.tube, detail.ball].map((mesh) => {
      if (!mesh) return null;
      const vertices = gl.createBuffer();
      const indices = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
      return { vertices, indices, count: mesh.indices.length };
    }),
  );

  const uniforms = (program: WebGLProgram, names: string[]) =>
    Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, `u_${name}`)]));
  const flatU = uniforms(flat.program, [
    "resolution",
    "origin",
    "center",
    "scale",
    "lineWidth",
    "pixel",
    "color",
    "colorEnd",
  ]);
  const solidU = uniforms(solid.program, [
    "resolution",
    "origin",
    "target",
    "right",
    "up",
    "forward",
    "distance",
    "focal",
    "near",
    "far",
    "unit",
    "lineWidth",
    "ball",
    "color",
    "colorEnd",
    "background",
    "radius",
  ]);

  // Attribute state is global in WebGL 1, so each draw binds what it needs
  // and the instanced attributes are reset afterwards.
  const enabled: number[] = [];
  const bind = (
    program: WebGLProgram,
    name: string,
    buffer: WebGLBuffer | null,
    size: number,
    stride = 0,
    offset = 0,
    divisor = 1,
  ) => {
    const location = gl.getAttribLocation(program, name);
    if (location < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
    instancing.vertexAttribDivisorANGLE(location, divisor);
    enabled.push(location);
  };
  const unbind = () => {
    for (const location of enabled) {
      instancing.vertexAttribDivisorANGLE(location, 0);
      gl.disableVertexAttribArray(location);
    }
    enabled.length = 0;
  };
  const bindSegments = (program: WebGLProgram) => {
    bind(program, "a_start", positionBuffer, 3, 24, 0);
    bind(program, "a_end", positionBuffer, 3, 24, 12);
    bind(program, "a_t", colorBuffer, 1);
    bind(program, "a_width", widthBuffer, 1);
  };

  // The lines the buffers hold, so they are uploaded once and every other
  // frame only sets uniforms.
  let uploaded: unknown = null;

  const upload = (
    key: unknown,
    positions: Float32Array,
    widths: Float32Array,
    colors: Float32Array,
    count: number,
  ) => {
    if (key === uploaded) return;
    uploaded = key;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions.subarray(0, count * 6), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, widthBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, widths.subarray(0, count), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors.subarray(0, count), gl.STATIC_DRAW);
  };

  const drawFlat = (
    drawing: Drawing,
    style: Style,
    camera: Camera,
    viewport: Viewport,
    detail: ZoomDetail | null,
  ) => {
    const { geometry, center } = drawing;
    const { width, height } = viewport;
    const ratio = window.devicePixelRatio || 1;
    const scale = camera.zoom * flatFit(geometry, viewport);
    const focusX = center[0] + fixedToNumber(camera.deepX, camera.deepBits);
    const focusY = center[1] + fixedToNumber(camera.deepY, camera.deepBits);
    const color = parseHex(style.color);
    const colorEnd = style.colorMode === "solid" ? color : parseHex(style.colorEnd);
    const originX = viewport.x + width / 2 + camera.panX;
    const originY = viewport.y + height / 2 + camera.panY;

    gl.useProgram(flat.program);
    gl.uniform2f(flatU.resolution, gl.drawingBufferWidth / ratio, gl.drawingBufferHeight / ratio);
    let count = geometry.count;
    if (detail) {
      // The detail is in pixels around the drawing point that was in the
      // middle when it was made. Place that point and rescale; the distance
      // between the two points is taken in fixed point, so only small
      // numbers reach the GPU.
      const { view } = detail;
      const bits = Math.max(view.bits, camera.deepBits);
      const shiftX =
        fixedToNumber(
          rescale(view.offsetX, view.bits, bits) - rescale(camera.deepX, camera.deepBits, bits),
          bits,
        ) +
        (view.originX - center[0]);
      const shiftY =
        fixedToNumber(
          rescale(view.offsetY, view.bits, bits) - rescale(camera.deepY, camera.deepBits, bits),
          bits,
        ) +
        (view.originY - center[1]);
      upload(detail, detail.positions, detail.widths, detail.colors, detail.count);
      count = detail.count;
      gl.uniform2f(flatU.origin, originX + shiftX * scale, originY - shiftY * scale);
      gl.uniform3f(flatU.center, 0, 0, 0);
      gl.uniform1f(flatU.scale, scale / view.scale);
    } else {
      upload(drawing, geometry.positions, geometry.widths, drawing.colors, geometry.count);
      gl.uniform2f(flatU.origin, originX, originY);
      gl.uniform3f(flatU.center, focusX, focusY, center[2]);
      gl.uniform1f(flatU.scale, scale);
    }
    gl.uniform1f(flatU.lineWidth, style.lineWidth);
    gl.uniform1f(flatU.pixel, 1 / ratio);
    gl.uniform3f(flatU.color, color[0], color[1], color[2]);
    gl.uniform3f(flatU.colorEnd, colorEnd[0], colorEnd[1], colorEnd[2]);

    // Sub-pixel segments blend over whatever is behind them, so dense regions
    // build up brightness. The destination alpha stays 1.
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    bind(flat.program, "a_corner", cornerBuffer, 2, 0, 0, 0);
    bindSegments(flat.program);
    instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, count);
    unbind();
  };

  const drawSolid = (
    drawing: Drawing,
    style: Style,
    background: [number, number, number],
    camera: Camera,
    viewport: Viewport,
  ) => {
    const { center, radius, geometry } = drawing;
    const count = geometry.count;
    const ratio = window.devicePixelRatio || 1;
    const view = viewFor(camera, radius, viewport);
    const fitDistance = view.distance * camera.zoom;
    const color = parseHex(style.color);
    const colorEnd = style.colorMode === "solid" ? color : parseHex(style.colorEnd);
    const level = DETAIL.findIndex((detail) => count <= detail.upTo);
    const [tube, ball] = meshes[level];

    gl.useProgram(solid.program);
    gl.uniform2f(solidU.resolution, gl.drawingBufferWidth / ratio, gl.drawingBufferHeight / ratio);
    gl.uniform2f(solidU.origin, viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
    gl.uniform3f(
      solidU.target,
      center[0] + camera.targetX,
      center[1] + camera.targetY,
      center[2] + camera.targetZ,
    );
    gl.uniform3fv(solidU.right, view.right);
    gl.uniform3fv(solidU.up, view.up);
    gl.uniform3fv(solidU.forward, view.forward);
    gl.uniform1f(solidU.distance, view.distance);
    gl.uniform1f(solidU.focal, view.focal);
    gl.uniform1f(solidU.near, view.distance * 0.005);
    gl.uniform1f(solidU.far, view.distance + radius * 4);
    gl.uniform1f(solidU.unit, fitDistance / view.focal);
    gl.uniform1f(solidU.lineWidth, style.lineWidth);
    gl.uniform3f(solidU.color, color[0], color[1], color[2]);
    gl.uniform3f(solidU.colorEnd, colorEnd[0], colorEnd[1], colorEnd[2]);
    gl.uniform3f(solidU.background, background[0], background[1], background[2]);
    gl.uniform1f(solidU.radius, radius);

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    bindSegments(solid.program);
    for (const [mesh, isBall] of [
      [tube, 0],
      [ball, 1],
    ] as const) {
      if (!mesh) continue;
      gl.uniform1f(solidU.ball, isBall);
      bind(solid.program, "a_mesh", mesh.vertices, 3, 0, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
      instancing.drawElementsInstancedANGLE(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0, count);
    }
    unbind();
  };

  return {
    draw(drawing, style, dimension, camera, viewport, detail = null) {
      const background = parseHex(style.background);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(background[0], background[1], background[2], 1);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!drawing || drawing.geometry.count === 0) return;
      if (dimension === "3d") {
        const { geometry } = drawing;
        upload(drawing, geometry.positions, geometry.widths, drawing.colors, geometry.count);
        drawSolid(drawing, style, background, camera, viewport);
      } else {
        drawFlat(drawing, style, camera, viewport, detail);
      }
    },

    dispose() {
      for (const buffer of [cornerBuffer, positionBuffer, colorBuffer, widthBuffer]) {
        gl.deleteBuffer(buffer);
      }
      for (const pair of meshes) {
        for (const mesh of pair) {
          if (!mesh) continue;
          gl.deleteBuffer(mesh.vertices);
          gl.deleteBuffer(mesh.indices);
        }
      }
      for (const { program, vert, frag } of [flat, solid]) {
        gl.deleteProgram(program);
        gl.deleteShader(vert);
        gl.deleteShader(frag);
      }
    },
  };
}
