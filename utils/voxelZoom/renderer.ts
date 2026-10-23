import { createShaderProgram } from "../shaders/compileShader";
import vertex from "../shaders/mandelbrot.vert";
import fragment from "../shaders/voxel-flight.frag";
import { type FlightAtmosphere, flightAtmosphere } from "./atmosphere";
import {
  buildGridFrame,
  type FlightCamera,
  flightBasis,
  MAX_VOXEL_DEPTH,
  PATTERNS,
  type VoxelPattern,
} from "./camera";
import { flightResolution } from "./resolution";

export type FlightStyle = {
  background: string;
  fillColor: string;
  strokeColor: string;
  showFaces: boolean;
  showWireframe: boolean;
  lineWidth: number;
};
const rgb = (hex: string) =>
  [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
export function createFlightRenderer(gl: WebGLRenderingContext) {
  if (!gl.getExtension("OES_texture_float"))
    throw new Error(
      "Explore needs floating-point WebGL textures. The whole-shape view is still available.",
    );
  const shader = createShaderProgram(gl, vertex, fragment);
  if (!shader) throw new Error("Could not start the Explore renderer.");
  const buffer = gl.createBuffer(),
    texture = gl.createTexture();
  if (!buffer || !texture) {
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    gl.deleteProgram(shader.program);
    gl.deleteShader(shader.vert);
    gl.deleteShader(shader.frag);
    throw new Error("Could not allocate the Explore renderer.");
  }
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
  gl.useProgram(shader.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(shader.program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  for (const name of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
    gl.texParameteri(gl.TEXTURE_2D, name, gl.NEAREST);
  for (const name of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
    gl.texParameteri(gl.TEXTURE_2D, name, gl.CLAMP_TO_EDGE);
  const names = [
    "resolution",
    "pixelAngle",
    "nearFootprint",
    "farDistance",
    "fogDistanceScale",
    "fogStart",
    "fogDensity",
    "grid",
    "levels",
    "pattern",
    "low",
    "high",
    "forward",
    "right",
    "up",
    "background",
    "fill",
    "stroke",
    "faces",
    "wire",
    "lineWidth",
  ];
  const u = Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(shader.program, `u_${name}`)]),
  );
  let previous: FlightCamera | undefined, previousPattern: VoxelPattern | undefined;
  let frame = buildGridFrame(
    { position: [BigInt(0), BigInt(0), BigInt(0)], bits: 160, level: 0, yaw: 0, pitch: 0 },
    "menger",
  );
  let atmosphere: FlightAtmosphere | undefined;
  let atmospherePattern: VoxelPattern | undefined;
  let atmosphereLevel: number | undefined;
  return {
    draw(
      camera: FlightCamera,
      pattern: VoxelPattern,
      style: FlightStyle,
      width: number,
      height: number,
      ratio: number,
      elapsed = 1 / 60,
    ) {
      // A fixed pixel budget bounds per-frame traversal on high-DPI displays.
      const scale = Math.min(ratio, 2, Math.sqrt(2_500_000 / Math.max(1, width * height)));
      const w = Math.max(1, Math.round(width * scale)),
        h = Math.max(1, Math.round(height * scale));
      if (gl.canvas.width !== w || gl.canvas.height !== h) {
        gl.canvas.width = w;
        gl.canvas.height = h;
      }
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
      gl.useProgram(shader.program);
      gl.viewport(0, 0, w, h);
      if (
        previous?.position !== camera.position ||
        previous?.level !== camera.level ||
        previous?.bits !== camera.bits ||
        previousPattern !== pattern
      ) {
        frame = buildGridFrame(camera, pattern);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          MAX_VOXEL_DEPTH,
          2,
          0,
          gl.RGBA,
          gl.FLOAT,
          frame.texture,
        );
        previous = camera;
        previousPattern = pattern;
      }
      const basis = flightBasis(camera);
      gl.uniform2f(u.resolution, w, h);
      const detail = flightResolution(frame.clearance, w, h);
      gl.uniform1f(u.pixelAngle, detail.pixelAngle);
      gl.uniform1f(u.nearFootprint, detail.nearFootprint);
      const nextAtmosphere = flightAtmosphere(
        camera.level,
        atmospherePattern === pattern &&
          Math.abs(camera.level - (atmosphereLevel ?? camera.level)) <= 8
          ? atmosphere
          : undefined,
        elapsed,
      );
      atmosphere = nextAtmosphere.state;
      atmospherePattern = pattern;
      atmosphereLevel = camera.level;
      gl.uniform1f(u.farDistance, nextAtmosphere.farDistance);
      gl.uniform1f(u.fogDistanceScale, nextAtmosphere.fogDistanceScale);
      gl.uniform1f(u.fogStart, nextAtmosphere.fogStart);
      gl.uniform1f(u.fogDensity, nextAtmosphere.fogDensity);
      gl.uniform1i(u.grid, 0);
      gl.uniform1i(u.levels, frame.levels.length);
      gl.uniform1i(u.pattern, PATTERNS.indexOf(pattern));
      gl.uniform3f(u.low, ...frame.low);
      gl.uniform3f(u.high, ...frame.high);
      gl.uniform3f(u.forward, ...basis.forward);
      gl.uniform3f(u.right, ...basis.right);
      gl.uniform3f(u.up, ...basis.up);
      gl.uniform3f(u.background, ...rgb(style.background));
      gl.uniform3f(u.fill, ...rgb(style.fillColor));
      gl.uniform3f(u.stroke, ...rgb(style.strokeColor));
      gl.uniform1i(u.faces, style.showFaces ? 1 : 0);
      gl.uniform1i(u.wire, style.showWireframe ? 1 : 0);
      gl.uniform1f(u.lineWidth, style.lineWidth);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return nextAtmosphere.settling;
    },
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(shader.program);
      gl.deleteShader(shader.vert);
      gl.deleteShader(shader.frag);
    },
  };
}
