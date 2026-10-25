import { createShaderProgram } from "../shaders/compileShader";
import vertex from "../shaders/mandelbrot.vert";
import fragment from "../shaders/voxel-flight.frag";
import { flightAtmosphere } from "./atmosphere";
import {
  buildGridFrame,
  type FlightCamera,
  flightBasis,
  flightRootBounds,
  MAX_VOXEL_DEPTH,
  PATTERNS,
  type VoxelPattern,
} from "./camera";
import { MAX_STILL_FLIGHT_PIXELS } from "./frameBudget";
import { flightDetailDepth, flightRenderSize, flightResolution } from "./resolution";
import { flightScreenBounds } from "./view";

export type FlightStyle = {
  background: string;
  fillColor: string;
  strokeColor: string;
  showFaces: boolean;
  showWireframe: boolean;
  lineWidth: number;
  lighting?: "classic" | "depth";
  occlusion?: "off" | "soft" | "minecraft";
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
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, MAX_VOXEL_DEPTH, 2, 0, gl.RGBA, gl.FLOAT, null);
  const names = [
    "resolution",
    "pixelAngle",
    "nearFootprint",
    "detailScale",
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
    "lighting",
    "aoMode",
  ];
  const u = Object.fromEntries(
    names.map((name) => [name, gl.getUniformLocation(shader.program, `u_${name}`)]),
  );
  let previous: FlightCamera | undefined, previousPattern: VoxelPattern | undefined;
  let frame: ReturnType<typeof buildGridFrame> | undefined;
  return {
    draw(
      camera: FlightCamera,
      pattern: VoxelPattern,
      style: FlightStyle,
      width: number,
      height: number,
      ratio: number,
      pixelBudget = MAX_STILL_FLIGHT_PIXELS,
    ) {
      // Frame cadence adjusts the pixel budget without changing camera units.
      const { width: w, height: h } = flightRenderSize(width, height, ratio, pixelBudget);
      if (gl.canvas.width !== w || gl.canvas.height !== h) {
        gl.canvas.width = w;
        gl.canvas.height = h;
      }
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
      gl.useProgram(shader.program);
      gl.viewport(0, 0, w, h);
      const navigationLevel = camera.navigationLevel ?? camera.viewLevel ?? camera.level;
      const nextAtmosphere = flightAtmosphere(
        camera.level,
        camera.atmosphereLevel ?? navigationLevel,
      );
      const basis = flightBasis(camera);
      const visible = flightScreenBounds(
        flightRootBounds(camera),
        basis,
        w,
        h,
        nextAtmosphere.farDistance,
      );
      const background = rgb(style.background);
      // Clear the full canvas before clipping the expensive ray traversal.
      // Looking away from the root needs neither a render grid nor a draw.
      gl.disable(gl.SCISSOR_TEST);
      if (!visible || visible.width !== w || visible.height !== h) {
        gl.clearColor(...background, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      if (!visible) return;
      if (
        !frame ||
        previous?.position !== camera.position ||
        previous?.level !== camera.level ||
        previous?.viewLevel !== camera.viewLevel ||
        previous?.navigationLevel !== camera.navigationLevel ||
        previous?.atmosphereLevel !== camera.atmosphereLevel ||
        previous?.bits !== camera.bits ||
        previousPattern !== pattern
      ) {
        frame = buildGridFrame(
          camera,
          pattern,
          flightDetailDepth(navigationLevel, camera.level),
          nextAtmosphere.farDistance,
        );
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          MAX_VOXEL_DEPTH,
          2,
          gl.RGBA,
          gl.FLOAT,
          frame.texture,
        );
        previous = camera;
        previousPattern = pattern;
      }
      gl.uniform2f(u.resolution, w, h);
      const detail = flightResolution(
        frame.clearance,
        w,
        h,
        camera.level,
        navigationLevel,
        width,
        height,
      );
      gl.uniform1f(u.pixelAngle, detail.pixelAngle);
      gl.uniform1f(u.nearFootprint, detail.nearFootprint);
      gl.uniform1f(u.detailScale, detail.detailScale);
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
      gl.uniform3f(u.background, ...background);
      gl.uniform3f(u.fill, ...rgb(style.fillColor));
      gl.uniform3f(u.stroke, ...rgb(style.strokeColor));
      gl.uniform1i(u.faces, style.showFaces ? 1 : 0);
      gl.uniform1i(u.wire, style.showWireframe ? 1 : 0);
      gl.uniform1f(u.lineWidth, style.lineWidth);
      gl.uniform1i(u.lighting, style.lighting === "classic" ? 0 : 1);
      gl.uniform1i(
        u.aoMode,
        style.occlusion === "off" ? 0 : style.occlusion === "minecraft" ? 2 : 1,
      );
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(visible.x, visible.y, visible.width, visible.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
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
