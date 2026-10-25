import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const { buildGridFrame, PATTERNS } = require("../utils/voxelZoom/camera.ts");
const {
  generateMengerSponge,
  generateVicsekFractal3D,
  generateMoselySnowflake,
} = require("../utils/voxelFractals.ts");
const generators = [
  generateMengerSponge,
  generateVicsekFractal3D,
  (depth) => generateMoselySnowflake(depth, "lighter"),
  (depth) => generateMoselySnowflake(depth, "heavier"),
];
const vertex = readFileSync(new URL("../utils/shaders/mandelbrot.vert", import.meta.url), "utf8");
const source = readFileSync(new URL("../utils/shaders/voxel-flight.frag", import.meta.url), "utf8");
const mainAt = source.indexOf("\nvoid main() {");
if (mainAt < 0) throw Error("Cannot find flight shader main");
// Real fractal cases exercise the unmodified procedural occupancy function.
// Explicit finite boxes additionally isolate the stencil's corner rule, including
// a missing diagonal between two occupied sides that these fractals seldom form.
const fragment = `${source
  .slice(0, mainAt)
  .replace(
    "precision highp float;",
    `precision highp float;
uniform vec3 u_checkPoint;
uniform vec3 u_checkNormal;
uniform vec4 u_checkSurfaceGrid;
uniform int u_checkSurfaceLevel;
uniform bool u_checkFinite;
uniform int u_checkBoxCount;
uniform vec4 u_checkBoxes[9];`,
  )
  .replace("float occupiedRule(", "float proceduralOccupiedRule(")
  .replace(
    "float cornerDarkness(",
    `float occupiedRule(vec3 p, vec4 grid, vec3 base) {
    if (!u_checkFinite) return proceduralOccupiedRule(p, grid, base);
    for (int i = 0; i < 9; i++) {
        if (i >= u_checkBoxCount) break;
        if (all(lessThan(abs(p - u_checkBoxes[i].xyz), vec3(u_checkBoxes[i].w)))) return 1.0;
    }
    return 0.0;
}
float cornerDarkness(`,
  )}
void main() {
    float value = surfaceOcclusion(u_checkPoint, u_checkNormal, u_checkSurfaceGrid, u_checkSurfaceLevel);
    float code = floor(clamp(value, 0.0, 1.0) * 65535.0 + 0.5);
    gl_FragColor = vec4(mod(code, 256.0) / 255.0, floor(code / 256.0) / 255.0, 0.0, 1.0);
}`;
const mainFragment = source
  .replace("precision highp float;", "precision highp float; uniform int u_checkMainMode;")
  .replace(
    "gl_FragColor = vec4(color, 1.0);",
    `if (u_checkMainMode == 0) gl_FragColor = vec4(color, 1.0);
    else {
        float code = surfaceDepth + float(surfaceLevel + 1) * 256.0;
        if (u_checkMainMode == 2) code = floor(surfaceT * 1000000.0 + 0.5);
        if (u_checkMainMode == 3) code = surfaceLevel < 0 ? 0.0 : floor(surfaceOcclusion(ray * surfaceT, normal, occlusionGrid, occlusionLevel) * 65535.0 + 0.5);
        if (u_checkMainMode == 4) code = floor(surfaceGrid.w * 1000000.0 + 0.5);
        gl_FragColor = vec4(mod(code, 256.0) / 255.0, mod(floor(code / 256.0), 256.0) / 255.0,
            floor(code / 65536.0) / 255.0, hit ? 1.0 : 0.0);
    }`,
  );

const offsets = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
const facePoints = [
  [0.005, 0.007],
  [0.09, 0.09],
  [0.5, 0.5],
  [0.93, 0.91],
  [0.25, 0.75],
];
const key = (position) => position.join(",");
const tangents = (axis) => [0, 1, 2].filter((value) => value !== axis);
const normalFor = (axis, sign) => [0, 1, 2].map((value) => (value === axis ? sign : 0));
const smooth = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
function expectedOcclusion(neighbors, uv) {
  // Independent finite-cell adjacency is supplied by the mesh/box oracle below.
  const weights = [uv[0], 1 - uv[0], uv[1], 1 - uv[1]].map((d) => 1 - smooth(d / 0.18));
  const soft =
    1 -
    neighbors
      .slice(0, 4)
      .reduce((visible, occupied, i) => visible * (1 - occupied * weights[i]), 1);
  const vertexDarkness = [
    [0, 2, 4],
    [1, 2, 5],
    [0, 3, 6],
    [1, 3, 7],
  ].map(([a, b, diagonal]) =>
    neighbors[a] && neighbors[b] ? 1 : (neighbors[a] + neighbors[b] + neighbors[diagonal]) / 3,
  );
  const areaWeights = [
    (1 - uv[0]) * (1 - uv[1]),
    uv[0] * (1 - uv[1]),
    (1 - uv[0]) * uv[1],
    uv[0] * uv[1],
  ];
  return [soft, vertexDarkness.reduce((sum, darkness, i) => sum + darkness * areaWeights[i], 0)];
}
function neighborCells(cell, axis, sign) {
  const [u, v] = tangents(axis);
  return offsets.map(([du, dv]) =>
    cell.map((value, i) => value + (i === axis ? sign : i === u ? du : i === v ? dv : 0)),
  );
}
function sampleFace(cell, size, axis, sign, uv) {
  const [u] = tangents(axis);
  return cell.map(
    (value, i) => (value + (i === axis ? sign / 2 : i === u ? uv[0] - 0.5 : uv[1] - 0.5)) * size,
  );
}
function serializeFrame(frame) {
  return {
    levels: frame.levels.length,
    texture: Array.from(frame.texture),
    low: frame.low,
    high: frame.high,
  };
}
function selectedGrid(frame, absoluteDepth) {
  const index = frame.levels.findIndex(
    (_, i) => frame.texture[(256 + i) * 4 + 3] === absoluteDepth,
  );
  if (index < 0) throw Error(`Missing surface grid at depth ${absoluteDepth}`);
  return {
    surfaceLevel: index,
    surfaceGrid: Array.from(frame.texture.slice(index * 4, index * 4 + 4)),
  };
}
const fixtures = [];
const mainFixtures = [];

function insideBox(point, box) {
  return point.every((value, axis) => value > box.low[axis] && value < box.high[axis]);
}
function intersectBox(ray, box) {
  const entries = ray.map((value, axis) =>
    value === 0 ? -Infinity : Math.min(box.low[axis] / value, box.high[axis] / value),
  );
  const exits = ray.map((value, axis) =>
    value === 0 ? Infinity : Math.max(box.low[axis] / value, box.high[axis] / value),
  );
  if (ray.some((value, axis) => value === 0 && (box.low[axis] > 0 || box.high[axis] < 0)))
    return null;
  const distance = Math.max(0, ...entries);
  if (Math.min(...exits) <= distance) return null;
  const axes = entries
    .map((value, axis) => (Math.abs(value - distance) < 1e-9 ? axis : -1))
    .filter((axis) => axis >= 0);
  return { distance, axis: axes.length === 1 ? axes[0] : null };
}
for (let pattern = 0; pattern < PATTERNS.length; pattern++) {
  const one = 1n << 600n;
  const camera = {
    position: [0n, 0n, (one * 16n) / 5n],
    bits: 600,
    level: 0,
    viewLevel: 0,
    yaw: 0,
    pitch: 0,
  };
  const frame = buildGridFrame(camera, PATTERNS[pattern], 2, 32);
  const meshes = [0, 1, 2].map((depth) =>
    generators[pattern](depth).map((cube) => {
      const center = [cube.x / 2, cube.y / 2, cube.z / 2 - 1.6];
      const size = cube.size / 2;
      return {
        center,
        size,
        low: center.map((v) => v - size / 2),
        high: center.map((v) => v + size / 2),
      };
    }),
  );
  const selected = new Map();
  for (const target of meshes[2]) {
    const length = Math.hypot(...target.center);
    const ray = target.center.map((v) => v / length);
    let hit = null;
    for (const box of meshes[2]) {
      const intersection = intersectBox(ray, box);
      if (intersection && (!hit || intersection.distance < hit.distance)) hit = intersection;
    }
    if (!hit || hit.axis === null) continue;
    const point = ray.map((v) => v * hit.distance);
    const before = ray.map((v) => v * (hit.distance - 1e-6));
    const depth = meshes.findIndex((mesh) => !mesh.some((box) => insideBox(before, box)));
    if (depth < 0) continue;
    const sign = -Math.sign(ray[hit.axis]);
    const normal = normalFor(hit.axis, sign);
    let expected = [0, 0];
    let parentExpected = expected;
    if (depth > 0) {
      const within = point.map((v, axis) => v - normal[axis] * 1e-6);
      // The finite mesh includes the smaller holes in a retained parent.
      // AO must use that visible geometry, even when the hit plane was first
      // exposed by a larger cavity several subdivisions earlier.
      const faceBox = meshes[2].find((box) => insideBox(within, box));
      if (!faceBox) continue;
      const [u, v] = tangents(hit.axis);
      const mask = offsets.map(([du, dv]) => {
        const p = faceBox.center.map(
          (value, axis) =>
            value + faceBox.size * (normal[axis] + (axis === u ? du : axis === v ? dv : 0)),
        );
        return Number(meshes[2].some((box) => insideBox(p, box)));
      });
      const uv = [u, v].map((axis) => (point[axis] - faceBox.low[axis]) / faceBox.size);
      expected = expectedOcclusion(mask, uv);
      const parent = meshes[depth].find((box) => insideBox(within, box));
      const parentMask = offsets.map(([du, dv]) => {
        const p = parent.center.map(
          (value, axis) =>
            value + parent.size * (normal[axis] + (axis === u ? du : axis === v ? dv : 0)),
        );
        return Number(meshes[depth].some((box) => insideBox(p, box)));
      });
      parentExpected = expectedOcclusion(
        parentMask,
        [u, v].map((axis) => (point[axis] - parent.low[axis]) / parent.size),
      );
    }
    const refined = expected.some((value, i) => Math.abs(value - parentExpected[i]) > 0.01);
    const selection = `${depth}/${refined}`;
    if (selected.has(selection)) continue;
    selected.set(selection, {
      name: `surface depth ${depth}${refined ? "; perforated parent" : ""}`,
      ray,
      distance: hit.distance,
      depth,
      normal,
      expected,
    });
  }
  if (selected.size < 2)
    throw Error(`Insufficient real-hit capture fixtures for ${PATTERNS[pattern]}`);
  mainFixtures.push({
    name: PATTERNS[pattern],
    pattern,
    frame: serializeFrame(frame),
    rays: [...selected.values()],
  });
}
if (
  !mainFixtures.some((fixture) =>
    fixture.rays.some((ray) => ray.name.includes("perforated parent")),
  )
)
  throw Error("Missing mixed-scale AO regression fixtures");

for (let pattern = 0; pattern < PATTERNS.length; pattern++) {
  const cubes = generators[pattern](2);
  const occupied = new Set(cubes.map((cube) => key([cube.gridX, cube.gridY, cube.gridZ])));
  const tile = new Set(
    generators[pattern](1).map((cube) => key([cube.gridX, cube.gridY, cube.gridZ])),
  );
  const candidates = [];
  for (const cube of cubes) {
    const cell = [cube.gridX, cube.gridY, cube.gridZ];
    for (let axis = 0; axis < 3; axis++)
      for (const sign of [-1, 1]) {
        const outside = cell.map((value, i) => value + (i === axis ? sign : 0));
        if (occupied.has(key(outside))) continue;
        const neighbors = neighborCells(cell, axis, sign);
        const mask = neighbors.map((position) => Number(occupied.has(key(position))));
        const localOnly = neighbors.map((position) =>
          Number(
            position.every((v) => Math.abs(v) <= 4) &&
              tile.has(key(position.map((v) => ((((v + 4) % 3) + 3) % 3) - 1))),
          ),
        );
        candidates.push({
          cell,
          axis,
          sign,
          mask,
          interior: neighbors.every((position) => position.every((v) => Math.abs(v) <= 4)),
          parentSensitive: facePoints.some((uv) =>
            expectedOcclusion(mask, uv).some(
              (v, i) => Math.abs(v - expectedOcclusion(localOnly, uv)[i]) > 0.01,
            ),
          ),
        });
      }
  }
  // Bound the payload by unique local arrangements; add orientations separately.
  const chosen = new Map();
  const add = (candidate) =>
    chosen.set(`${key(candidate.cell)}/${candidate.axis}/${candidate.sign}`, candidate);
  for (const candidate of new Map(candidates.map((c) => [c.mask.join(""), c])).values())
    add(candidate);
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) {
      const candidate = candidates.find(
        (c) => c.axis === axis && c.sign === sign && c.mask.some(Boolean),
      );
      if (!candidate) throw Error(`Missing oriented fixture for ${PATTERNS[pattern]}`);
      add(candidate);
    }
  const boundary = candidates.find((c) => c.parentSensitive);
  if (boundary) add(boundary);
  const camera = { position: [0n, 0n, 0n], bits: 600, level: 0, viewLevel: 0, yaw: 0, pitch: 0 };
  const frame = buildGridFrame(camera, PATTERNS[pattern], 2, 32);
  const samplesFor = (selection) =>
    selection.flatMap((candidate) =>
      facePoints.map((uv) => ({
        name: `${candidate.parentSensitive ? "parent boundary; " : ""}cell ${key(candidate.cell)}, normal ${candidate.axis}:${candidate.sign}, uv ${key(uv)}`,
        point: sampleFace(candidate.cell, 1 / 9, candidate.axis, candidate.sign, uv),
        normal: normalFor(candidate.axis, candidate.sign),
        expected: expectedOcclusion(candidate.mask, uv),
      })),
    );
  fixtures.push({
    name: `${PATTERNS[pattern]} finite depth-2 mesh`,
    pattern,
    frame: serializeFrame(frame),
    ...selectedGrid(frame, 2),
    samples: samplesFor([...chosen.values()]),
  });

  // An equivalent copy nested 150 times. All query boxes stay inside that copy,
  // so geometry in its siblings cannot alter the finite reference result.
  const prefix = [
    [2, 2, 2],
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
  ][pattern];
  const denominator = 3n ** 150n;
  const one = 1n << 600n;
  const position = prefix.map((digit) => {
    let address = 0n;
    for (let depth = 0; depth < 150; depth++) address = address * 3n + BigInt(digit);
    return ((2n * address + 1n - denominator) * one) / denominator;
  });
  const deepFrame = buildGridFrame(
    { ...camera, position, level: 150, viewLevel: 150 },
    PATTERNS[pattern],
    152,
    32,
  );
  const deepCandidates = [
    ...new Map(
      candidates.filter((c) => c.interior && c.mask.some(Boolean)).map((c) => [c.mask.join(""), c]),
    ).values(),
  ].slice(0, 3);
  if (!deepCandidates.length) throw Error(`Missing deep interior fixture for ${PATTERNS[pattern]}`);
  fixtures.push({
    name: `${PATTERNS[pattern]} equivalent retained copy at level 150`,
    pattern,
    frame: serializeFrame(deepFrame),
    ...selectedGrid(deepFrame, 152),
    samples: samplesFor(deepCandidates),
  });
}
if (
  !fixtures.some((fixture) =>
    fixture.samples.some((sample) => sample.name.startsWith("parent boundary;")),
  )
)
  throw Error("Missing ancestor-sensitive occlusion fixtures");

const syntheticCases = [
  { name: "isolated convex cube", adjacent: [] },
  { name: "flat wall", flat: true, adjacent: [] },
  { name: "single concave side", adjacent: [0] },
  { name: "diagonal only", adjacent: [4] },
  { name: "two concave sides without diagonal", adjacent: [0, 2] },
  { name: "two concave sides with diagonal", adjacent: [0, 2, 4] },
  { name: "root clips all external neighbors", adjacent: [0, 1, 2, 3, 4, 5, 6, 7], clipped: true },
  { name: "outer root face fallback", adjacent: [0, 2], rootFace: true },
];
for (const geometry of syntheticCases)
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) {
      const [u, v] = tangents(axis);
      const neighbors = neighborCells([0, 0, 0], axis, sign);
      const centers = [[0, 0, 0], ...geometry.adjacent.map((i) => neighbors[i])];
      if (geometry.flat)
        for (const [du, dv] of offsets)
          centers.push([0, 1, 2].map((i) => (i === u ? du : i === v ? dv : 0)));
      const low = Array(3).fill(geometry.clipped ? -0.5 : -4);
      const high = Array(3).fill(geometry.clipped ? 0.5 : 4);
      // Direct finite AABB membership; no ternary digits, shader recurrence, or grid traversal.
      const mask = neighbors.map((p) =>
        Number(
          p.every((value, i) => value > low[i] && value < high[i]) &&
            centers.some((center) => center.every((value, i) => Math.abs(value - p[i]) < 0.5)),
        ),
      );
      fixtures.push({
        name: `${geometry.name}; normal ${axis}:${sign}`,
        pattern: 0,
        frame: { levels: 1, texture: new Array(2048).fill(0), low, high },
        surfaceLevel: geometry.rootFace ? -1 : 0,
        surfaceGrid: [-0.5, -0.5, -0.5, 1],
        finiteBoxes: centers.map((center) => [...center, 0.5]),
        samples: facePoints.map((uv) => ({
          name: `uv ${key(uv)}`,
          point: sampleFace([0, 0, 0], 1, axis, sign, uv),
          normal: normalFor(axis, sign),
          expected: geometry.rootFace ? [0, 0] : expectedOcclusion(mask, uv),
        })),
      });
    }

async function check(payload) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
  if (!gl?.getExtension("OES_texture_float")) throw Error("Float WebGL unavailable");
  const shaders = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const results = [];
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, payload.vertex],
      [gl.FRAGMENT_SHADER, payload.fragment],
    ]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program));
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const name of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_2D, name, gl.NEAREST);
    for (const name of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
      gl.texParameteri(gl.TEXTURE_2D, name, gl.CLAMP_TO_EDGE);
    gl.viewport(0, 0, 1, 1);
    gl.disable(gl.DITHER);
    const u = (name) => gl.getUniformLocation(program, `u_${name}`);
    const pixel = new Uint8Array(4);
    for (const fixture of payload.fixtures) {
      gl.uniform1i(u("grid"), 0);
      gl.uniform1i(u("levels"), fixture.frame.levels);
      gl.uniform1i(u("pattern"), fixture.pattern);
      gl.uniform3fv(u("low"), fixture.frame.low);
      gl.uniform3fv(u("high"), fixture.frame.high);
      gl.uniform4fv(u("checkSurfaceGrid"), fixture.surfaceGrid);
      gl.uniform1i(u("checkSurfaceLevel"), fixture.surfaceLevel);
      gl.uniform1i(u("checkFinite"), fixture.finiteBoxes ? 1 : 0);
      gl.uniform1i(u("checkBoxCount"), fixture.finiteBoxes?.length ?? 0);
      if (fixture.finiteBoxes) gl.uniform4fv(u("checkBoxes[0]"), fixture.finiteBoxes.flat());
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        256,
        2,
        0,
        gl.RGBA,
        gl.FLOAT,
        new Float32Array(fixture.frame.texture),
      );
      const failures = [];
      let maxError = 0;
      for (const sample of fixture.samples) {
        gl.uniform3fv(u("checkPoint"), sample.point);
        gl.uniform3fv(u("checkNormal"), sample.normal);
        for (const mode of [1, 2]) {
          gl.uniform1i(u("aoMode"), mode);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          const actual = (pixel[0] + pixel[1] * 256) / 65535;
          const expected = sample.expected[mode - 1];
          const error = Math.abs(actual - expected);
          maxError = Math.max(maxError, error);
          if (error > 0.0001)
            failures.push({
              sample: sample.name,
              mode: mode === 1 ? "soft" : "minecraft",
              expected,
              actual,
            });
        }
      }
      const error = gl.getError();
      if (error !== gl.NO_ERROR) throw Error(`WebGL error ${error} in ${fixture.name}`);
      results.push({ name: fixture.name, checks: fixture.samples.length * 2, maxError, failures });
    }
    return {
      passed: results.every((result) => result.failures.length === 0),
      checks: results.reduce((sum, result) => sum + result.checks, 0),
      fixtures: results.length,
      maxError: Math.max(...results.map((result) => result.maxError)),
      results,
    };
  } finally {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

async function checkMain(payload) {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
  if (!gl?.getExtension("OES_texture_float")) throw Error("Float WebGL unavailable");
  const program = gl.createProgram();
  const shaders = [];
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const results = [];
  const background = [0.12, 0.23, 0.34];
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, payload.vertex],
      [gl.FRAGMENT_SHADER, payload.fragment],
    ]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program));
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const name of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_2D, name, gl.NEAREST);
    for (const name of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
      gl.texParameteri(gl.TEXTURE_2D, name, gl.CLAMP_TO_EDGE);
    gl.disable(gl.DITHER);
    const u = (name) => gl.getUniformLocation(program, `u_${name}`);
    gl.uniform1i(u("grid"), 0);
    gl.uniform1f(u("farDistance"), 32);
    gl.uniform1f(u("fogDistanceScale"), 1 / 32);
    gl.uniform1f(u("fogStart"), 0.1 / 32);
    gl.uniform1f(u("fogDensity"), 4);
    gl.uniform1f(u("lineWidth"), 1.1);
    gl.uniform3fv(u("right"), [1, 0, 0]);
    gl.uniform3fv(u("up"), [0, 1, 0]);
    gl.uniform3fv(u("fill"), [0.8, 0.6, 0.4]);
    gl.uniform3fv(u("stroke"), [0.01, 0.02, 0.03]);
    gl.uniform3fv(u("background"), background);
    const resize = (size) => {
      canvas.width = canvas.height = size;
      gl.viewport(0, 0, size, size);
      gl.uniform2f(u("resolution"), size, size);
    };
    const draw = () => {
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels;
    };
    const diagnostic = (mode) => {
      gl.uniform1i(u("checkMainMode"), mode);
      const pixels = draw();
      return { hit: pixels[3] === 255, value: pixels[0] + pixels[1] * 256 + pixels[2] * 65536 };
    };
    for (const fixture of payload.fixtures) {
      gl.uniform1i(u("levels"), fixture.frame.levels);
      gl.uniform1i(u("pattern"), fixture.pattern);
      gl.uniform3fv(u("low"), fixture.frame.low);
      gl.uniform3fv(u("high"), fixture.frame.high);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        256,
        2,
        0,
        gl.RGBA,
        gl.FLOAT,
        new Float32Array(fixture.frame.texture),
      );
      const failures = [];
      let checks = 0;
      const compare = (name, actual, expected, tolerance) => {
        checks++;
        if (Math.abs(actual - expected) > tolerance)
          failures.push({ name, actual, expected, tolerance });
      };
      resize(65);
      gl.uniform3fv(u("forward"), [0, 0, -1]);
      gl.uniform1f(u("pixelAngle"), 1.16 / 65);
      gl.uniform1f(u("nearFootprint"), (0.02 * 1.16) / 65);
      gl.uniform1i(u("checkMainMode"), 0);
      gl.uniform1i(u("faces"), 0);
      gl.uniform1i(u("wire"), 0);
      gl.uniform1i(u("lighting"), 1);
      gl.uniform1i(u("aoMode"), 2);
      const hidden = draw();
      let hiddenError = 0;
      for (let at = 0; at < hidden.length; at += 4)
        for (let channel = 0; channel < 3; channel++)
          hiddenError = Math.max(
            hiddenError,
            Math.abs(hidden[at + channel] - Math.round(background[channel] * 255)),
          );
      compare("faces and wires hidden: background only", hiddenError, 0, 1);
      gl.uniform1i(u("wire"), 1);
      const depthWire = draw();
      gl.uniform1i(u("lighting"), 0);
      gl.uniform1i(u("aoMode"), 0);
      const classicWire = draw();
      let wireDifference = 0;
      for (let at = 0; at < depthWire.length; at++)
        wireDifference = Math.max(wireDifference, Math.abs(depthWire[at] - classicWire[at]));
      compare("wire-only depth matches classic", wireDifference, 0, 1);

      resize(1);
      gl.uniform1f(u("pixelAngle"), 1e-5);
      gl.uniform1f(u("nearFootprint"), 1e-6);
      gl.uniform1i(u("faces"), 1);
      gl.uniform1i(u("wire"), 0);
      gl.uniform1f(u("fogDistanceScale"), 0);
      for (const ray of fixture.rays) {
        gl.uniform3fv(u("forward"), ray.ray);
        const metadata = diagnostic(1);
        compare(`${ray.name}: hit`, Number(metadata.hit), 1, 0);
        compare(`${ray.name}: captured global depth`, metadata.value % 256, ray.depth, 0);
        compare(`${ray.name}: captured grid level`, Math.floor(metadata.value / 256), ray.depth, 0);
        compare(
          `${ray.name}: exact crossed plane`,
          diagnostic(2).value / 1000000,
          ray.distance,
          0.000005,
        );
        if (ray.depth > 0)
          compare(
            `${ray.name}: captured cell size`,
            diagnostic(4).value / 1000000,
            3 ** -ray.depth,
            0.000002,
          );
        for (const mode of [1, 2]) {
          gl.uniform1i(u("aoMode"), mode);
          compare(
            `${ray.name}: ${mode === 1 ? "soft" : "minecraft"} from actual hit`,
            diagnostic(3).value / 65535,
            ray.expected[mode - 1],
            0.0002,
          );
          gl.uniform1i(u("checkMainMode"), 0);
          const diffuse = Math.max(
            0,
            ray.normal.reduce((sum, n, axis) => sum + n * [-0.5, 0.8, 0.6][axis], 0) /
              Math.hypot(-0.5, 0.8, 0.6),
          );
          const facing =
            0.15 * Math.max(0, -ray.normal.reduce((sum, n, axis) => sum + n * ray.ray[axis], 0));
          const visibility = 1 - (mode === 2 ? 0.7 : 0.55) * ray.expected[mode - 1];
          // This one-pixel fixture keeps right/up fixed while assigning forward to the ray.
          // Compute the view-relative key independently from that declared basis.
          const key = ray.ray.map((forward, axis) => [-0.65, 0.85, 0][axis] - 0.65 * forward);
          const sideLight = Math.max(
            0,
            ray.normal.reduce((sum, n, axis) => sum + n * key[axis], 0) / Math.hypot(...key),
          );
          const faceTint = fixture.pattern >= 2 ? 1 - 0.22 * Math.abs(ray.normal[0]) : 1;
          for (const lighting of [0, 1]) {
            gl.uniform1i(u("lighting"), lighting);
            const pixels = draw();
            for (let channel = 0; channel < 3; channel++) {
              const ambient =
                [0.27, 0.3, 0.36][channel] +
                ([0.36, 0.36, 0.33][channel] - [0.27, 0.3, 0.36][channel]) *
                  (0.5 + 0.5 * ray.normal[1]);
              const illumination =
                lighting === 0
                  ? 0.38 * visibility + 0.62 * diffuse + facing
                  : Math.min(1, ambient * visibility + 0.82 * sideLight * [1.04, 1, 0.94][channel]);
              compare(
                `${ray.name}: rendered AO mode ${mode}, lighting ${lighting}, channel ${channel}`,
                pixels[channel] / 255,
                [0.8, 0.6, 0.4][channel] * faceTint * illumination,
                1.5 / 255,
              );
            }
          }
        }
      }
      gl.uniform1f(u("fogDistanceScale"), 1 / 32);
      // Metadata records the global subdivision address, not a material.
      // Changing only that address must not recolour otherwise identical walls.
      gl.uniform1i(u("checkMainMode"), 0);
      gl.uniform1i(u("lighting"), 1);
      gl.uniform1i(u("aoMode"), 0);
      gl.uniform1f(u("detailScale"), 4);
      const original = draw();
      const recollected = new Float32Array(fixture.frame.texture);
      for (let level = 0; level < fixture.frame.levels; level++)
        recollected[256 * 4 + level * 4 + 3] += 37;
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 2, gl.RGBA, gl.FLOAT, recollected);
      const deeper = draw();
      compare(
        "material is independent of subdivision address",
        Math.max(...original.map((v, i) => Math.abs(v - deeper[i]))),
        0,
        0,
      );
      // Double framebuffer density, retaining the same centre ray and CSS cone.
      gl.uniform1f(u("pixelAngle"), 0.5e-5);
      gl.uniform1f(u("nearFootprint"), 0.5e-6);
      gl.uniform1f(u("detailScale"), 8);
      const retina = draw();
      compare(
        "CSS detail is independent of framebuffer density",
        Math.max(...deeper.map((v, i) => Math.abs(v - retina[i]))),
        0,
        1,
      );
      gl.uniform1f(u("detailScale"), 1);
      const error = gl.getError();
      if (error !== gl.NO_ERROR)
        throw Error(`WebGL error ${error} in main integration ${fixture.name}`);
      results.push({ name: fixture.name, checks, failures });
    }
    return {
      passed: results.every((result) => result.failures.length === 0),
      checks: results.reduce((sum, result) => sum + result.checks, 0),
      results,
    };
  } finally {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

writeFileSync(
  process.argv[2] ?? "/private/tmp/check-voxel-flight-occlusion.js",
  `async(page)=>{
    const helper = await page.evaluate(${check.toString()},${JSON.stringify({ vertex, fragment, fixtures })});
    const integration = await page.evaluate(${checkMain.toString()},${JSON.stringify({ vertex, fragment: mainFragment, fixtures: mainFixtures })});
    return {...helper, passed: helper.passed && integration.passed, checks: helper.checks + integration.checks,
      sourceSha256: ${JSON.stringify(createHash("sha256").update(source).digest("hex"))}, integration};
  }`,
);
