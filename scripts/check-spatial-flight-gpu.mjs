import { readFileSync, writeFileSync } from "node:fs";
import {
  finiteTriangles,
  intersectTriangles,
  oracleRays,
  require,
  specs,
  style,
} from "../tests/helpers/spatial-gpu-fixtures.mjs";

const {
  buildGpuShape,
  buildGpuFrame,
  packTransforms,
  packOrderedChildren,
} = require("../../utils/spatialGpu/model.ts");
const { INITIAL_SPATIAL_CAMERA, inverseRotate } = require("../../utils/spatial/camera.ts");
const { viewRotation } = require("../../utils/orientation.ts");
const { fixedFromNumber } = require("../../utils/deepZoom/math.ts");
const { traceGpuFrame } = require("../../utils/spatialGpu/query.ts");
const { spatialProjection } = require("../../utils/spatial/projection.ts");
const { specializeSpatialShader } = require("../../utils/spatialGpu/shader.ts");
const meshes = require("../../utils/polyhedronFractals.ts");
const vertex = readFileSync(
  new URL("../utils/shaders/spatial-flight.vert", import.meta.url),
  "utf8",
);
const source = readFileSync(
  new URL("../utils/shaders/spatial-flight.frag", import.meta.url),
  "utf8",
);
const colorOutput = /outColor = vec4\(color, [^;]+\);/;
if (!colorOutput.test(source)) throw Error("Shader diagnostic output changed");
const fragment = source.replace(colorOutput, "outColor = encodeDistance(hit, found);");
const quadraticFragment = specializeSpatialShader(fragment, { kind: "quadraticKoch3d" });
const rotation = viewRotation(style.rotationX, style.rotationY);
const basis = {
  right: inverseRotate([1, 0, 0], rotation),
  up: inverseRotate([0, 1, 0], rotation),
  forward: inverseRotate([0, 0, -1], rotation),
};
const rays = oracleRays();
const fixtures = [];
for (const spec of specs) {
  const shape = buildGpuShape(spec),
    frame = buildGpuFrame(shape, INITIAL_SPATIAL_CAMERA, style);
  for (const rank of [0, 1, 2, ...(spec.kind === "jerusalem" ? [3] : [])]) {
    const triangles = finiteTriangles(spec, rank);
    fixtures.push({
      name: `${spec.kind}/${spec.mesh ?? spec.start ?? "default"}/${rank}`,
      rank,
      kind: shape.kind,
      radius: shape.radius,
      featureSize: shape.featureSize,
      hull: shape.hull,
      edges: shape.edges,
      roots: Array.from(packTransforms(frame.roots)),
      children: Array.from(packOrderedChildren(shape)),
      childCount: shape.children.length,
      expected: rays.map(({ x, y, origin, ray }) => ({
        x,
        y,
        expected: intersectTriangles(triangles, origin, ray)?.distance ?? -1,
      })),
    });
    if (rank === 2) {
      const view = spatialProjection(65, 65, { top: 7, bottom: 12 });
      const projection = [(2 * view.focal) / 65, (2 * view.focal) / 65];
      const origin = [0, 1 - (2 * view.centerY) / 65];
      fixtures.push({
        ...fixtures[fixtures.length - 1],
        name: `${spec.kind}/${spec.mesh ?? spec.start ?? "default"}/framed`,
        projection,
        origin,
        expected: rays.map(({ x, y, origin: eye }) => {
          const v = [
            ((2 * x + 1) / 65 - 1 - origin[0]) / projection[0],
            ((2 * y + 1) / 65 - 1 - origin[1]) / projection[1],
            -1,
          ];
          const length = Math.hypot(...v);
          const ray = inverseRotate(
            v.map((value) => value / length),
            rotation,
          );
          return { x, y, expected: intersectTriangles(triangles, eye, ray)?.distance ?? -1 };
        }),
      });
    }
  }
}

// Exact axis rays exercise parallel slabs and corner ties; an eye inside a
// descendant hull must still reach its square rather than the hull itself.
{
  const spec = { kind: "quadraticKoch3d" },
    shape = buildGpuShape(spec),
    view = { ...style, rotationX: 0, rotationY: 0 };
  const probes = [
    { name: "axis-face", eye: [0, 0, 2], ray: [0, 0, -1], rank: 0 },
    { name: "axis-corner", eye: [0.5, 0.5, 2], ray: [0, 0, -1], rank: 0 },
    { name: "parallel-outside", eye: [0.5001, 0, 2], ray: [0, 0, -1], rank: 0 },
    { name: "inside-seed", eye: [0, 0, 0], ray: [1, 0, 0], rank: 0 },
    { name: "inside-descendant-hull", eye: [0.1, 0.1, 0.7], ray: [0, 0, -1], rank: 2 },
    ...Array.from({ length: 8 }, (_, octant) => {
      const signs = [0, 1, 2].map((i) => (octant & (1 << i) ? 1 : -1));
      return {
        name: `octant-${octant}`,
        eye: signs.map((s, i) => s * [2, 2.1, 2.2][i]),
        ray: signs.map((s, i) => -s * [2, 2.1, 2.2][i]),
        rank: 2,
      };
    }),
  ];
  for (const { name, eye, ray, rank } of probes) {
    const camera = {
      ...INITIAL_SPATIAL_CAMERA,
      target: eye.map((v, i) =>
        fixedFromNumber(v - (i === 2 ? 6 : 0), INITIAL_SPATIAL_CAMERA.bits).toString(),
      ),
    };
    const frame = buildGpuFrame(shape, camera, view),
      length = Math.hypot(...ray),
      direction = ray.map((v) => v / length),
      expected = intersectTriangles(finiteTriangles(spec, rank), eye, direction)?.distance ?? -1;
    for (const ordered of [true, false]) {
      fixtures.push({
        name: `quadraticKoch3d/${name}/${ordered ? "ordered" : "unordered"}`,
        rank,
        kind: shape.kind,
        radius: shape.radius,
        featureSize: shape.featureSize,
        hull: shape.hull,
        edges: shape.edges,
        roots: Array.from(packTransforms(frame.roots)),
        children: Array.from(ordered ? packOrderedChildren(shape) : packTransforms(shape.children)),
        ordered,
        childCount: shape.children.length,
        queryRay: direction,
        expected: [{ x: 32, y: 32, expected }],
      });
    }
  }
}

// At deep scales the independent finite-generator checks above establish the
// recurrence; these cases compare GPU traversal with its double-precision oracle
// after exact fixed-point root selection. The seed-vertex tests verify that root
// selection itself retains independently defined construction boundaries.
for (const spec of specs) {
  const shape = buildGpuShape(spec);
  const point =
    spec.kind === "flake"
      ? meshes[`${spec.mesh}Mesh`]().vertices[0]
      : spec.kind === "jerusalem"
        ? [1, 1, 1]
        : spec.kind === "quadraticKoch3d"
          ? [0.5, 0.5, 0.5]
          : spec.start === "tetrahedron"
            ? meshes.tetrahedronMesh(1.3).vertices[0]
            : [1.6 * Math.cos(Math.PI / 2), -0.35, 1.6];
  // Look inward from outside the vertex's normal cone. An axis-aligned eye
  // at this exact vertex can lie on an incident face, creating numerical
  // self-intersections rather than a useful cross-precision comparison.
  const length = Math.hypot(...point);
  const outward = point.map((v, i) => v / length + [0.137, 0.073, -0.093][i]);
  const norm = Math.hypot(...outward);
  const view = {
    ...style,
    rotationX: (Math.asin(outward[1] / norm) * 180) / Math.PI,
    rotationY: (Math.atan2(-outward[0], outward[2]) * 180) / Math.PI,
  };
  const rotation = viewRotation(view.rotationX, view.rotationY);
  for (const zoom of [80, 240]) {
    const bits = zoom + 160;
    const camera = { target: point.map((v) => fixedFromNumber(v, bits).toString()), bits, zoom };
    const frame = buildGpuFrame(shape, camera, view);
    if (!frame.roots.length) throw Error(`Missing deep roots for ${JSON.stringify(spec)}`);
    const rank = Math.min(...frame.roots.map((r) => r.rank)) + 2;
    fixtures.push({
      name: `${spec.kind}/${spec.mesh ?? spec.start ?? "default"}/zoom-${zoom}`,
      rank,
      kind: shape.kind,
      radius: shape.radius,
      featureSize: shape.featureSize,
      hull: shape.hull,
      edges: shape.edges,
      roots: Array.from(packTransforms(frame.roots)),
      children: Array.from(packOrderedChildren(shape)),
      childCount: shape.children.length,
      basis: {
        right: inverseRotate([1, 0, 0], rotation),
        up: inverseRotate([0, 1, 0], rotation),
        forward: inverseRotate([0, 0, -1], rotation),
      },
      expected: oracleRays(view).map(({ x, y, ray }) => ({
        x,
        y,
        expected:
          traceGpuFrame(frame, ray, { maxRank: rank, pixelAngle: 0, nearFootprint: 0 })?.distance ??
          -1,
      })),
    });
  }
}

// Keep exact tangent coverage with an analytical answer. Near/far clipping in
// a floating-point CPU reference can reject a zero-width interval by rounding.
for (const zoom of [80, 240]) {
  const shape = buildGpuShape({ kind: "flake", mesh: "octahedron", ratio: 0.5 });
  const point = meshes.octahedronMesh().vertices[0],
    bits = zoom + 160;
  const camera = { target: point.map((v) => fixedFromNumber(v, bits).toString()), bits, zoom };
  const view = { ...style, rotationX: 0, rotationY: 0 };
  const frame = buildGpuFrame(shape, camera, view);
  fixtures.push({
    name: `octahedron/analytical-edge-tangent/zoom-${zoom}`,
    rank: Math.min(...frame.roots.map((r) => r.rank)) + 2,
    kind: shape.kind,
    radius: shape.radius,
    featureSize: shape.featureSize,
    hull: shape.hull,
    edges: shape.edges,
    roots: Array.from(packTransforms(frame.roots)),
    children: Array.from(packOrderedChildren(shape)),
    childCount: shape.children.length,
    basis: { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] },
    expected: oracleRays(view)
      .filter(({ x, y }) => x === y && x < 32)
      .map(({ x, y, ray }) => ({ x, y, expected: 6 / Math.abs(ray[2]) })),
  });
}

async function check(page, payload) {
  return page.evaluate(({ vertex, fragment, quadraticFragment, fixtures, basis }) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 65;
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw Error("WebGL 2 unavailable");
    const compile = (kind, text) => {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const vert = compile(gl.VERTEX_SHADER, vertex);
    const programs = [fragment, quadraticFragment].map((text) => {
      const frag = compile(gl.FRAGMENT_SHADER, text),
        program = gl.createProgram();
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(program));
      return { program, frag };
    });
    let program = programs[0].program;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const uniform = (name) => gl.getUniformLocation(program, "u_" + name);
    const textures = [gl.createTexture(), gl.createTexture()];
    function upload(unit, values) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        4,
        values.length / 16,
        0,
        gl.RGBA,
        gl.FLOAT,
        new Float32Array(values),
      );
    }
    gl.disable(gl.DITHER);
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, 65, 65);
    const hardware = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = hardware
      ? gl.getParameter(hardware.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const errors = [],
      results = [];
    try {
      for (const fixture of fixtures) {
        // Use the same specialization as the production quadratic renderer.
        program = programs[fixture.kind === 2 ? 1 : 0].program;
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
        gl.useProgram(program);
        const location = gl.getAttribLocation(program, "aPosition");
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1i(uniform("roots"), 0);
        gl.uniform1i(uniform("children"), 1);
        gl.uniform1i(uniform("orderedChildren"), fixture.ordered === false ? 0 : 1);
        gl.uniform2f(uniform("resolution"), 65, 65);
        gl.uniform1f(uniform("focal"), 3.6);
        gl.uniform1f(uniform("far"), 128);
        gl.uniform1f(uniform("detailScale"), 1);
        gl.uniform1f(uniform("pixelAngle"), 0);
        gl.uniform1f(uniform("nearFootprint"), 0);
        gl.uniform1i(uniform("query"), fixture.queryRay ? 1 : 0);
        if (fixture.queryRay) gl.uniform3fv(uniform("queryRay"), fixture.queryRay);
        gl.uniform2fv(uniform("projection"), fixture.projection ?? [0, 0]);
        gl.uniform2fv(uniform("origin"), fixture.origin ?? [0, 0]);
        const direction = fixture.basis ?? basis;
        gl.uniform3fv(uniform("right"), direction.right);
        gl.uniform3fv(uniform("up"), direction.up);
        gl.uniform3fv(uniform("forward"), direction.forward);
        upload(0, fixture.roots);
        upload(1, fixture.children);
        gl.uniform1i(uniform("rootCount"), fixture.roots.length / 16);
        gl.uniform1i(uniform("childCount"), fixture.childCount);
        gl.uniform1i(uniform("hullCount"), fixture.hull.length);
        gl.uniform1i(uniform("edgeCount"), fixture.edges.length);
        const hull = new Float32Array(80),
          edges = new Float32Array(16);
        hull.set(fixture.hull.flat());
        edges.set(fixture.edges.flat());
        gl.uniform4fv(uniform("hull[0]"), hull);
        gl.uniform4fv(uniform("edges[0]"), edges);
        gl.uniform1i(uniform("kind"), fixture.kind);
        gl.uniform1f(uniform("radius"), fixture.radius);
        gl.uniform1f(uniform("featureSize"), fixture.featureSize);
        gl.uniform1f(uniform("maxRank"), fixture.rank);
        const start = performance.now();
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const pixels = new Uint8Array(65 * 65 * 4);
        gl.readPixels(0, 0, 65, 65, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const elapsed = performance.now() - start;
        const view = new DataView(pixels.buffer);
        let failures = 0;
        for (const { x, y, expected } of fixture.expected) {
          const actual = view.getFloat32((y * 65 + x) * 4, true);
          // Float32 ray/plane division loses relative accuracy at grazing
          // incidence. Allow 8 ppm at distant hits; keep near hits tight and
          // require exact agreement about whether a surface is present.
          const tolerance = 0.0002 + 0.000008 * Math.abs(expected);
          if (
            !Number.isFinite(actual) ||
            actual >= 0 !== expected >= 0 ||
            (expected >= 0 && Math.abs(actual - expected) > tolerance)
          ) {
            errors.push({ fixture: fixture.name, x, y, expected, actual });
            failures++;
          }
        }
        results.push({
          name: fixture.name,
          shader: fixture.kind === 2 ? "quadratic" : "generic",
          samples: fixture.expected.length,
          failures,
          ms: elapsed,
        });
      }
      const error = gl.getError();
      if (error) errors.push({ webglError: error });
      return {
        passed: errors.length === 0,
        renderer,
        cases: results.reduce((n, r) => n + r.samples, 0),
        results,
        errors,
      };
    } finally {
      textures.forEach((t) => {
        gl.deleteTexture(t);
      });
      gl.deleteBuffer(buffer);
      programs.forEach(({ program, frag }) => {
        gl.deleteProgram(program);
        gl.deleteShader(frag);
      });
      gl.deleteShader(vert);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }, payload);
}
writeFileSync(
  process.argv[2] ?? "/private/tmp/check-spatial-flight-gpu.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify({ vertex, fragment, quadraticFragment, fixtures, basis })})`,
);
