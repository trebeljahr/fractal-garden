import { createShaderProgram } from "../shaders/compileShader";
import type { Geometry } from "./engine";
import type { ColorMode, Dimension } from "./spec";

export type Camera = {
  yaw: number;
  pitch: number;
  zoom: number;
  panX: number;
  panY: number;
};

export const DEFAULT_CAMERA: Camera = { yaw: 0.6, pitch: -0.35, zoom: 1, panX: 0, panY: 0 };
export const FLAT_CAMERA: Camera = { yaw: 0, pitch: 0, zoom: 1, panX: 0, panY: 0 };

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

// Every segment is drawn as one instance of a screen-aligned quad, so line
// widths from ! and # work everywhere (WebGL's own lines are 1px on most
// platforms). Positions and per-segment data are uploaded once per drawing;
// the camera only changes uniforms, so orbiting never touches the segments.
const vertexShader = `
precision highp float;

attribute vec2 a_corner;
attribute vec3 a_start;
attribute vec3 a_end;
attribute float a_t;
attribute float a_width;

uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform vec3 u_center;
uniform vec4 u_rotation;
uniform float u_scale;
uniform float u_distance;
uniform float u_radius;
uniform float u_depthFade;
uniform float u_lineWidth;
uniform float u_pixel;
uniform vec3 u_color;
uniform vec3 u_colorEnd;

varying vec4 v_color;
varying vec2 v_local;
varying float v_length;
varying float v_halfWidth;
varying float v_rounded;

// Yaw around world y, then pitch around the view x axis, then perspective.
// Returns screen position in CSS pixels and view depth (larger is nearer).
vec3 project(vec3 p) {
  vec3 d = p - u_center;
  float x1 = d.x * u_rotation.x + d.z * u_rotation.y;
  float z1 = -d.x * u_rotation.y + d.z * u_rotation.x;
  float y2 = d.y * u_rotation.z - z1 * u_rotation.w;
  float z2 = d.y * u_rotation.w + z1 * u_rotation.z;
  float f = u_distance > 0.0 ? u_distance / (u_distance - z2) : 1.0;
  return vec3(u_origin + vec2(x1, -y2) * f * u_scale, z2);
}

void main() {
  vec3 a = project(a_start);
  vec3 b = project(a_end);
  vec2 delta = b.xy - a.xy;
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
  vec2 position = a.xy + dir * along + normal * halfWidth * a_corner.y;

  float alpha = width / drawn;
  if (u_depthFade > 0.5) {
    // Nearer segments are brighter, which reads as depth.
    float t = clamp(((a.z + b.z) * 0.5 / u_radius + 1.0) * 0.5, 0.0, 1.0);
    float band = min(floor(t * 4.0), 3.0);
    alpha *= band < 0.5 ? 0.35 : band < 1.5 ? 0.55 : band < 2.5 ? 0.78 : 1.0;
  }
  v_color = vec4(mix(u_color, u_colorEnd, a_t), alpha);
  v_local = vec2(along, halfWidth * a_corner.y);
  v_length = len;
  v_halfWidth = halfWidth;
  v_rounded = rounded;

  vec2 clip = vec2(position.x / u_resolution.x * 2.0 - 1.0, 1.0 - position.y / u_resolution.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
}
`;

const fragmentShader = `
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

// Two triangles: x is 0 at the start and 1 at the end, y is the side.
const CORNERS = new Float32Array([0, -1, 1, -1, 1, 1, 0, -1, 1, 1, 0, 1]);

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
  ) => void;
  dispose: () => void;
};

export function createRenderer(gl: WebGLRenderingContext): Renderer | null {
  const instancing = gl.getExtension("ANGLE_instanced_arrays");
  if (!instancing) return null;
  const shaders = createShaderProgram(gl, vertexShader, fragmentShader);
  if (!shaders) return null;
  const { program, vert, frag } = shaders;

  const cornerBuffer = gl.createBuffer();
  const positionBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  const widthBuffer = gl.createBuffer();

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, CORNERS, gl.STATIC_DRAW);

  const attribute = (name: string) => gl.getAttribLocation(program, name);
  const corner = attribute("a_corner");
  const start = attribute("a_start");
  const end = attribute("a_end");
  const t = attribute("a_t");
  const widthAttribute = attribute("a_width");

  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  for (const [location, offset] of [
    [start, 0],
    [end, 12],
  ]) {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, offset);
    instancing.vertexAttribDivisorANGLE(location, 1);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.enableVertexAttribArray(t);
  gl.vertexAttribPointer(t, 1, gl.FLOAT, false, 0, 0);
  instancing.vertexAttribDivisorANGLE(t, 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, widthBuffer);
  gl.enableVertexAttribArray(widthAttribute);
  gl.vertexAttribPointer(widthAttribute, 1, gl.FLOAT, false, 0, 0);
  instancing.vertexAttribDivisorANGLE(widthAttribute, 1);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    resolution: uniform("u_resolution"),
    origin: uniform("u_origin"),
    center: uniform("u_center"),
    rotation: uniform("u_rotation"),
    scale: uniform("u_scale"),
    distance: uniform("u_distance"),
    radius: uniform("u_radius"),
    depthFade: uniform("u_depthFade"),
    lineWidth: uniform("u_lineWidth"),
    pixel: uniform("u_pixel"),
    color: uniform("u_color"),
    colorEnd: uniform("u_colorEnd"),
  };

  // The drawing the buffers hold, so it is uploaded once and every other
  // frame only sets uniforms.
  let uploaded: Drawing | null = null;

  const upload = (drawing: Drawing) => {
    if (drawing === uploaded) return;
    uploaded = drawing;
    const { positions, widths, count } = drawing.geometry;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions.subarray(0, count * 6), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, widthBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, widths.subarray(0, count), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawing.colors.subarray(0, count), gl.STATIC_DRAW);
  };

  return {
    draw(drawing, style, dimension, camera, viewport) {
      const ratio = window.devicePixelRatio || 1;
      const background = parseHex(style.background);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(background[0], background[1], background[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!drawing || drawing.geometry.count === 0) return;
      upload(drawing);

      const { geometry, center, radius } = drawing;
      const { min, max, count } = geometry;
      const { width, height } = viewport;
      const is3d = dimension === "3d";

      let scale: number;
      if (is3d) {
        // Perspective enlarges the near side a little; most shapes are not a
        // full sphere, so fitting the radius without compensation still
        // leaves margin.
        scale = (Math.min(width, height) * (0.5 - PADDING) * camera.zoom) / radius;
      } else {
        const spanX = Math.max(max[0] - min[0], 1e-6);
        const spanY = Math.max(max[1] - min[1], 1e-6);
        scale =
          camera.zoom *
          Math.min((width * (1 - 2 * PADDING)) / spanX, (height * (1 - 2 * PADDING)) / spanY);
      }
      const yaw = is3d ? camera.yaw : 0;
      const pitch = is3d ? camera.pitch : 0;

      gl.useProgram(program);
      gl.uniform2f(u.resolution, gl.drawingBufferWidth / ratio, gl.drawingBufferHeight / ratio);
      gl.uniform2f(
        u.origin,
        viewport.x + width / 2 + camera.panX,
        viewport.y + height / 2 + camera.panY,
      );
      gl.uniform3f(u.center, center[0], center[1], center[2]);
      gl.uniform4f(u.rotation, Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch));
      gl.uniform1f(u.scale, scale);
      gl.uniform1f(u.distance, is3d ? radius * 4 : 0);
      gl.uniform1f(u.radius, radius);
      gl.uniform1f(u.depthFade, is3d ? 1 : 0);
      gl.uniform1f(u.lineWidth, style.lineWidth);
      gl.uniform1f(u.pixel, 1 / ratio);
      const color = parseHex(style.color);
      const colorEnd = style.colorMode === "solid" ? color : parseHex(style.colorEnd);
      gl.uniform3f(u.color, color[0], color[1], color[2]);
      gl.uniform3f(u.colorEnd, colorEnd[0], colorEnd[1], colorEnd[2]);

      // Faded and sub-pixel segments blend over whatever is behind them, so
      // dense regions build up brightness. The destination alpha stays 1.
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, count);
    },

    dispose() {
      gl.deleteBuffer(cornerBuffer);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(colorBuffer);
      gl.deleteBuffer(widthBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    },
  };
}
