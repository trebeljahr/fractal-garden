import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { style as fixtureStyle, require } from "../tests/helpers/spatial-gpu-fixtures.mjs";

// node scripts/check-quadratic-koch-performance.mjs BASELINE.frag CALLBACK.js [CAPTURES] [--candidate FILE]
// node scripts/check-quadratic-koch-performance.mjs --extract-captures CAPTURES/captures.json
// QK_WIDTH, QK_HEIGHT, QK_SAMPLES, QK_WARMUP and QK_FILTER bound individual runs.
// SPATIAL_SPECS=jerusalem,tetrahedron,squarePyramid,octahedron,dodecahedron,
// icosahedron,koch-triangle,koch-tetrahedron,quadratic,romanesco (or all).
// Without SPATIAL_SPECS the original quadratic fixtures and raw baseline remain.
// With it, baseline uses the original production specialization: quadratic fixed
// kind/counts, Romanesco fixed kind and safe stack, other shapes generic/40.
// SPATIAL_BASELINE_RAW=1 leaves baseline bytes unchanged in either mode.
// QK_STACK=8|12|16|24|40 overrides only generated candidates for stack experiments.
// Romanesco comparisons use the texture traversal path; the production beam and
// uniform-buffer paths have their own paired renderer checks.
// QK_GROWTH (0..1), QK_MAX_RANK and QK_VISIT_LIMIT exercise finite growth and
// exhausted traversal. A visit override changes the nearest-hit 4096 budget in
// both sources, including child pretests; other budgets stay unchanged.
// --candidate keeps supplied bytes, except for an explicit QK_VISIT_LIMIT.
// Run the generated callback with Playwright CLI's run-code --filename option.
const args = process.argv.slice(2);
const extractIndex = args.indexOf("--extract-captures");
if (extractIndex >= 0) {
  const path = args[extractIndex + 1];
  if (!path) throw Error("--extract-captures requires a bundle path");
  const images = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(images)) throw Error("Capture bundle must contain an image array");
  mkdirSync(dirname(path), { recursive: true });
  for (const { name, data } of images) {
    if (
      typeof name !== "string" ||
      basename(name) !== name ||
      !name.endsWith(".png") ||
      typeof data !== "string" ||
      !data.startsWith("data:image/png;base64,")
    )
      throw Error("Invalid PNG capture entry");
    writeFileSync(
      join(dirname(path), name),
      Buffer.from(data.slice("data:image/png;base64,".length), "base64"),
    );
  }
  console.log(JSON.stringify({ extracted: images.length, directory: dirname(path) }));
  process.exit(0);
}
const candidateIndex = args.indexOf("--candidate");
let candidatePath;
if (candidateIndex >= 0) {
  candidatePath = args[candidateIndex + 1];
  if (!candidatePath) throw Error("--candidate requires a shader path");
  args.splice(candidateIndex, 2);
}
const baselinePath = args[0];
if (!baselinePath) throw Error("Supply the unmodified spatial-flight.frag as the first argument.");
const width = Number(process.env.QK_WIDTH ?? 640);
const height = Number(process.env.QK_HEIGHT ?? 480);
const samples = Number(process.env.QK_SAMPLES ?? 8);
const warmup = Number(process.env.QK_WARMUP ?? 3);
const growth = Number(process.env.QK_GROWTH ?? 1);
const maxRank = Number(process.env.QK_MAX_RANK ?? 1000);
const visitLimit = process.env.QK_VISIT_LIMIT ? Number(process.env.QK_VISIT_LIMIT) : null;
if (!Number.isFinite(growth) || growth < 0 || growth > 1)
  throw Error("QK_GROWTH must be between 0 and 1");
if (!Number.isInteger(maxRank) || maxRank < 0)
  throw Error("QK_MAX_RANK must be a nonnegative integer");
if (visitLimit !== null && (!Number.isInteger(visitLimit) || visitLimit < 1 || visitLimit > 65536))
  throw Error("QK_VISIT_LIMIT must be an integer between 1 and 65536");
const settings = { growth, maxRank, visitLimit };
const diagnosticSource = (source) => {
  if (visitLimit === null) return source;
  const start = source.indexOf("bool traceNearest(");
  const end = source.indexOf("bool traceUnionExit(", start);
  if (start < 0 || end < 0)
    throw Error("QK_VISIT_LIMIT requires the traceNearest/traceUnionExit shader layout");
  const nearest = source.slice(start, end);
  if (!/\b4096\b/.test(nearest)) throw Error("Nearest traversal's 4096 visit budget was not found");
  return (
    source.slice(0, start) + nearest.replace(/\b4096\b/g, String(visitLimit)) + source.slice(end)
  );
};
for (const [name, value] of Object.entries({ width, height, samples, warmup })) {
  if (!Number.isInteger(value) || value < 1) throw Error(`${name} must be a positive integer`);
}
const {
  applyPoint,
  buildGpuShape,
  buildGpuFrame,
  packTransforms,
  packOrderedChildren,
  packChildBounds,
  selectGpuStackDepth,
} = require("../../utils/spatialGpu/model.ts");
const { packGpuChildBounds } = require("../../utils/spatialGpu/childBounds.ts");
const { INITIAL_SPATIAL_CAMERA, inverseRotate } = require("../../utils/spatial/camera.ts");
const { viewRotation } = require("../../utils/orientation.ts");
const { fixedFromNumber } = require("../../utils/deepZoom/math.ts");
const { spatialProjection } = require("../../utils/spatial/projection.ts");
const { spatialReliefFront } = require("../../utils/spatial/lighting.ts");
const {
  spatialShaderStackDepth,
  specializeSpatialShader,
} = require("../../utils/spatialGpu/shader.ts");
const shaderPath = new URL("../utils/shaders/spatial-flight.frag", import.meta.url);
const vertex = readFileSync(
  new URL("../utils/shaders/spatial-flight.vert", import.meta.url),
  "utf8",
);
const screenSource = readFileSync(
  new URL("../utils/spatialGpu/renderer.ts", import.meta.url),
  "utf8",
);
const screen = screenSource.match(/const screenFragment = `([\s\S]*?)`;/)?.[1];
if (!screen) throw Error("Production screen shader was not found.");
const baselineSource = diagnosticSource(readFileSync(baselinePath, "utf8"));
const candidateSource = diagnosticSource(readFileSync(candidatePath ?? shaderPath, "utf8"));
const expanded = Boolean(process.env.SPATIAL_SPECS);
const baselineRaw = !expanded || process.env.SPATIAL_BASELINE_RAW === "1";
const forcedStack = process.env.QK_STACK ? Number(process.env.QK_STACK) : null;
if (forcedStack !== null && ![8, 12, 16, 24, 40].includes(forcedStack))
  throw Error("QK_STACK must be 8, 12, 16, 24 or 40");
const phi = (1 + Math.sqrt(5)) / 2;
const specCatalogue = {
  jerusalem: { kind: "jerusalem" },
  tetrahedron: { kind: "flake", mesh: "tetrahedron", ratio: 0.5 },
  squarePyramid: { kind: "flake", mesh: "squarePyramid", ratio: 0.5 },
  octahedron: { kind: "flake", mesh: "octahedron", ratio: 0.5 },
  dodecahedron: { kind: "flake", mesh: "dodecahedron", ratio: 1 / (2 + phi) },
  icosahedron: { kind: "flake", mesh: "icosahedron", ratio: 1 / (1 + phi) },
  "koch-triangle": { kind: "kochSurface", start: "triangle" },
  "koch-tetrahedron": { kind: "kochSurface", start: "tetrahedron" },
  quadratic: { kind: "quadraticKoch3d" },
  romanesco: { kind: "romanesco" },
};
const selected =
  process.env.SPATIAL_SPECS === "all"
    ? Object.keys(specCatalogue)
    : (process.env.SPATIAL_SPECS ?? "quadratic").split(",").map((name) => name.trim());
for (const name of selected)
  if (!Object.hasOwn(specCatalogue, name)) throw Error(`Unknown SPATIAL_SPECS entry ${name}`);
const variants = [],
  variantIndices = new Map(),
  shapes = {};
const withStack = (source, depth) =>
  source.replace("#version 300 es", `#version 300 es\n#define SPATIAL_STACK_DEPTH ${depth}`);
// Keep the baseline's production decisions independent of the candidate helper.
const originalSource = (source, spec, depth) => {
  if (baselineRaw) return source;
  if (spec.kind === "quadraticKoch3d")
    return source
      .replace("#version 300 es", "#version 300 es\n#define QUADRATIC_KOCH")
      .replace("uniform int u_kind;", "const int u_kind = 2;")
      .replace("uniform int u_childCount;", "const int u_childCount = 13;")
      .replace("uniform int u_hullCount;", "const int u_hullCount = 6;")
      .replace("uniform int u_edgeCount;", "const int u_edgeCount = 4;");
  if (spec.kind === "romanesco")
    return withStack(source.replace("uniform int u_kind;", "const int u_kind = 3;"), depth);
  return source;
};
const registerVariant = (name, source, stackDepth) => {
  const key = `${name}\0${source}`;
  if (!variantIndices.has(key)) {
    variantIndices.set(key, variants.length);
    variants.push({ name, source, stackDepth });
  }
  return variantIndices.get(key);
};
const sourcesFor = (frame, options) => {
  const depth = selectGpuStackDepth(frame, options);
  const candidateDepth = forcedStack ?? spatialShaderStackDepth(frame, options);
  const baselineDepth = !baselineRaw && frame.shape.kind === 3 ? depth : 40;
  return [
    registerVariant(
      "baseline",
      originalSource(baselineSource, frame.shape.spec, baselineDepth),
      baselineDepth,
    ),
    registerVariant(
      "current",
      candidatePath
        ? candidateSource
        : specializeSpatialShader(candidateSource, frame.shape.spec, candidateDepth),
      candidatePath ? null : candidateDepth,
    ),
  ];
};
const cameraAt = (zoom, target = [0, 0, 0]) => {
  const bits = 160 + Math.ceil(zoom);
  return { bits, zoom, target: target.map((v) => fixedFromNumber(v, bits).toString()) };
};
const fixtures = [];
for (const specName of [...new Set(selected)]) {
  const spec = specCatalogue[specName],
    shape = buildGpuShape(spec),
    bounds = packChildBounds(shape);
  shapes[specName] = {
    kind: shape.kind,
    hull: shape.hull,
    edges: shape.edges,
    radius: shape.radius,
    featureSize: shape.featureSize,
    childCount: shape.children.length,
    coneSlope: shape.coneSlope ?? 0,
    boundConeSlope: shape.boundConeSlope ?? 0,
    boundConeBase: shape.boundConeBase ?? -1,
    boundCylinderRadius: shape.boundCylinderRadius ?? 0,
    children: Array.from(packOrderedChildren(shape)),
    childBounds: Array.from(bounds.data),
    packedChildBounds: Array.from(packGpuChildBounds(bounds).data),
    childBoundsCount: bounds.nodeCount,
  };
  const baseStyle =
    spec.kind === "quadraticKoch3d"
      ? { ...fixtureStyle, fillColor: "#ff8f7e", strokeColor: "#ffe4de" }
      : spec.kind === "romanesco"
        ? {
            ...fixtureStyle,
            fillColor: "#c4e87c",
            strokeColor: "#d8e99c",
            rotationX: 65,
            showWireframe: false,
          }
        : { ...fixtureStyle };
  const anchor =
    spec.kind === "flake"
      ? shape.seedVertices[0]
      : spec.kind === "jerusalem"
        ? [1, 1, 1]
        : spec.kind === "quadraticKoch3d"
          ? [0.5, 0.5, 0.5]
          : spec.kind === "romanesco"
            ? applyPoint(shape.roots[0], [0, 1, 0])
            : shape.rootTriangles[0][0];
  const direction = anchor.map((v, i) => v + [0.137, 0.073, -0.093][i]);
  const length = Math.hypot(...direction);
  const deepStyle =
    spec.kind === "romanesco"
      ? { ...baseStyle, rotationX: 0, rotationY: 0 }
      : {
          ...baseStyle,
          rotationX: (Math.asin(direction[1] / length) * 180) / Math.PI,
          rotationY: (Math.atan2(-direction[0], direction[2]) * 180) / Math.PI,
        };
  const anchorCamera = (zoom) => {
    if (spec.kind !== "romanesco") return cameraAt(zoom, anchor);
    // Sum the root center and apex offset in fixed point. Adding their doubles
    // first loses the exact construction boundary at 80/240 zoom doublings.
    const bits = 160 + Math.ceil(zoom),
      root = shape.roots[0];
    const target = root.center.map((v) => fixedFromNumber(v, bits));
    target[1] += fixedFromNumber(root.axes[1][1], bits);
    return { bits, zoom, target: target.map(String) };
  };
  const definitions = [
    { name: "opening-depth", camera: INITIAL_SPATIAL_CAMERA, style: baseStyle },
    {
      name: "rotated-depth",
      camera: INITIAL_SPATIAL_CAMERA,
      style: { ...baseStyle, rotationX: -17, rotationY: 133 },
    },
    { name: "close-depth", camera: cameraAt(2), style: baseStyle },
    {
      name: "close-classic",
      camera: cameraAt(2),
      style: { ...baseStyle, lighting: "classic", occlusion: "off" },
    },
    {
      name: "close-wire",
      camera: cameraAt(2),
      style: {
        ...baseStyle,
        showFaces: false,
        showWireframe: true,
        lighting: "classic",
        occlusion: "off",
      },
    },
    { name: "deep-80", camera: anchorCamera(80), style: deepStyle },
    { name: "deep-240", camera: anchorCamera(240), style: deepStyle },
  ];
  for (const definition of definitions) {
    const name = expanded ? `${specName}/${definition.name}` : definition.name;
    if (process.env.QK_FILTER && !new RegExp(process.env.QK_FILTER).test(name)) continue;
    const { camera, style } = definition;
    const frame = buildGpuFrame(shape, camera, style);
    if (!frame.roots.length) throw Error(`No roots in ${name}`);
    const rotation = viewRotation(style.rotationX, style.rotationY);
    const projection = spatialProjection(width, height, { top: 60, bottom: 76 });
    let left = width,
      bottom = height,
      right = 0,
      top = 0;
    for (const root of frame.roots) {
      if (root.cone) {
        left = bottom = 0;
        right = width;
        top = height;
        break;
      }
      let nearEye = false,
        front = false;
      const projected = [];
      for (let mask = 0; mask < 8; mask++) {
        const p = applyPoint(
          root,
          [0, 1, 2].map((i) => (mask & (1 << i) ? shape.high[i] : shape.low[i])),
        );
        const v = [0, 1, 2].map(
          (i) => rotation[i * 3] * p[0] + rotation[i * 3 + 1] * p[1] + rotation[i * 3 + 2] * p[2],
        );
        if (v[2] >= -0.001) nearEye = true;
        else {
          front = true;
          projected.push([
            projection.centerX - (v[0] / v[2]) * projection.focal,
            height - projection.centerY - (v[1] / v[2]) * projection.focal,
          ]);
        }
      }
      if (!front) continue;
      if (nearEye) {
        left = bottom = 0;
        right = width;
        top = height;
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
    const minimumFootprint = 0.04 / projection.focal;
    const tangentPoints =
      shape.kind === 2
        ? [
            [-1, -1, 0],
            [1, 0, 0],
          ]
        : shape.kind === 1
          ? [
              [-0.5, -Math.sqrt(3) / 6, 0],
              [0, -Math.sqrt(3) / 6, 0],
            ]
          : shape.kind === 3
            ? [
                [0, 1, 0],
                [shape.coneSlope * 2, -1, 0],
              ]
            : shape.seedVertices.slice(0, 2);
    fixtures.push({
      name,
      specName,
      camera,
      style,
      variants: sourcesFor(frame, {
        minimumFootprint,
        pixelFootprint: 2 / projection.focal,
        maxRank,
      }),
      clearanceVariants: sourcesFor(frame, { clearance: true, maxRank }),
      roots: Array.from(packTransforms(frame.roots)),
      visited: frame.visited,
      tangencies: frame.roots
        .filter((root) => !root.cone)
        .slice(0, 3)
        .flatMap((root, i) =>
          tangentPoints.map((point, j) => ({
            name: `root-${i}-boundary-${j}`,
            ray: applyPoint(root, point),
          })),
        ),
      scissor: [
        x,
        y,
        Math.max(0, Math.min(width, Math.ceil(right) + 1) - x),
        Math.max(0, Math.min(height, Math.ceil(top) + 1) - y),
      ],
      projection: [(2 * projection.focal) / width, (2 * projection.focal) / height],
      origin: [0, 1 - (2 * projection.centerY) / height],
      pixelAngle: 1 / projection.focal,
      nearFootprint: 0.02 / projection.focal,
      reliefFront: spatialReliefFront(camera, rotation),
      basis: {
        right: inverseRotate([1, 0, 0], rotation),
        up: inverseRotate([0, 1, 0], rotation),
        forward: inverseRotate([0, 0, -1], rotation),
      },
    });
  }
}
if (!fixtures.length) throw Error("QK_FILTER matched no fixtures.");

async function check(page, payload, captures) {
  const result = await page.evaluate(
    async ({
      vertex,
      screen,
      variants,
      fixtures,
      width,
      height,
      samples,
      warmup,
      shapes,
      settings,
      capture,
    }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });
      if (!gl) throw Error("WebGL 2 unavailable");
      const owned = [];
      const own = (value, release) => {
        if (!value) throw Error("GPU allocation failed");
        owned.push(() => release(value));
        return value;
      };
      const shader = (type, text) => {
        const s = own(gl.createShader(type), (v) => gl.deleteShader(v));
        gl.shaderSource(s, text);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
        return s;
      };
      const vert = shader(gl.VERTEX_SHADER, vertex);
      const program = (source) => {
        const p = own(gl.createProgram(), (v) => gl.deleteProgram(v));
        gl.attachShader(p, vert);
        gl.attachShader(p, shader(gl.FRAGMENT_SHADER, source));
        gl.bindAttribLocation(p, 0, "aPosition");
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
        return {
          program: p,
          uniform: (name) => gl.getUniformLocation(p, "u_" + name),
          integerBounds:
            /\buniform\s+(?:(?:lowp|mediump|highp)\s+)?usampler2D\s+u_childBounds\b/.test(source),
        };
      };
      const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const images = [];
      try {
        const compiled = new Map();
        const programsFor = (indices) =>
          indices.map((index) => {
            if (!compiled.has(index))
              compiled.set(index, { ...variants[index], ...program(variants[index].source) });
            return compiled.get(index);
          });
        const post = program(screen);
        const vao = own(gl.createVertexArray(), (v) => gl.deleteVertexArray(v));
        gl.bindVertexArray(vao);
        const buffer = own(gl.createBuffer(), (v) => gl.deleteBuffer(v));
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        const textures = Array.from({ length: 6 }, () =>
          own(gl.createTexture(), (v) => gl.deleteTexture(v)),
        );
        const bind = (unit) => {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
        };
        textures.forEach((_, unit) => {
          bind(unit);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        });
        const framebuffer = own(gl.createFramebuffer(), (v) => gl.deleteFramebuffer(v));
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        for (let i = 0; i < 2; i++) {
          bind(i + 2);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA8,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
          );
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            gl.TEXTURE_2D,
            textures[i + 2],
            0,
          );
        }
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
          throw Error("Incomplete framebuffer");
        gl.disable(gl.DITHER);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.viewport(0, 0, width, height);
        const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
        const syncPixel = new Uint8Array(4);
        const synchronize = () => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, syncPixel);
        };
        const hardware = gl.getExtension("WEBGL_debug_renderer_info");
        const renderer = hardware
          ? gl.getParameter(hardware.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER);
        const setup = (p, f) => {
          const shape = shapes[f.specName];
          const planeData = new Float32Array(80),
            edgeData = new Float32Array(16);
          planeData.set(shape.hull.flat());
          edgeData.set(shape.edges.flat());
          // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
          gl.useProgram(p.program);
          const u = p.uniform;
          for (const [name, value] of Object.entries({
            roots: 0,
            children: 1,
            childBounds: p.integerBounds ? 5 : 4,
            childBoundsCount: shape.childBoundsCount,
            orderedChildren: 1,
            rootCount: f.roots.length / 16,
            childCount: shape.childCount,
            hullCount: shape.hull.length,
            edgeCount: shape.edges.length,
            kind: shape.kind,
            query: 0,
            faces: Number(f.style.showFaces),
            wire: Number(f.style.showWireframe),
            lighting: Number(f.style.lighting !== "classic"),
            occlusion: f.style.occlusion === "off" ? 0 : 1,
          }))
            gl.uniform1i(u(name), value);
          for (const [name, value] of Object.entries({
            radius: shape.radius,
            featureSize: shape.featureSize,
            coneSlope: shape.coneSlope,
            boundConeSlope: shape.boundConeSlope,
            boundConeBase: shape.boundConeBase,
            boundCylinderRadius: shape.boundCylinderRadius,
            growth: settings.growth,
            focal: 3.6,
            far: 128,
            maxRank: settings.maxRank,
            pixelAngle: f.pixelAngle,
            nearFootprint: f.nearFootprint,
            detailScale: 2,
            lineWidth: f.style.lineWidth,
            fogScale: 1 / 96,
            reliefFront: f.reliefFront,
          }))
            gl.uniform1f(u(name), value);
          gl.uniform4fv(u("hull[0]"), planeData);
          gl.uniform4fv(u("edges[0]"), edgeData);
          gl.uniform2f(u("resolution"), width, height);
          gl.uniform2fv(u("projection"), f.projection);
          gl.uniform2fv(u("origin"), f.origin);
          for (const name of ["right", "up", "forward"]) gl.uniform3fv(u(name), f.basis[name]);
          gl.uniform3fv(u("fill"), rgb(f.style.fillColor));
          gl.uniform3fv(u("stroke"), rgb(f.style.strokeColor));
          gl.uniform3fv(u("background"), rgb(f.style.background));
        };
        const read = () => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          return [0, 1].map((index) => {
            gl.readBuffer(gl.COLOR_ATTACHMENT0 + index);
            const bytes = new Uint8Array(width * height * 4);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
            return bytes;
          });
        };
        const compare = (a, b) => {
          let changedBytes = 0,
            changedPixels = 0,
            maximum = 0,
            absolute = 0;
          const examples = [];
          for (let i = 0; i < a.length; i += 4) {
            let changed = false;
            for (let c = 0; c < 4; c++) {
              const delta = Math.abs(a[i + c] - b[i + c]);
              if (delta) {
                changedBytes++;
                changed = true;
              }
              maximum = Math.max(maximum, delta);
              absolute += delta;
            }
            if (changed) {
              changedPixels++;
              if (examples.length < 4)
                examples.push({
                  x: (i / 4) % width,
                  y: Math.floor(i / 4 / width),
                  baseline: Array.from(a.slice(i, i + 4)),
                  current: Array.from(b.slice(i, i + 4)),
                });
            }
          }
          return {
            changedBytes,
            changedPixels,
            maxChannelDelta: maximum,
            meanAbsoluteChannelDelta: absolute / a.length,
            examples,
          };
        };
        const percentile = (values, p) =>
          [...values].sort((a, b) => a - b)[
            Math.min(values.length - 1, Math.floor(values.length * p))
          ];
        const results = [];
        for (const f of fixtures) {
          const shape = shapes[f.specName];
          const programs = programsFor(f.variants);
          const clearancePrograms = programsFor(f.clearanceVariants);
          for (const [unit, textureWidth, values] of [
            [1, 4, shape.children],
            [4, 2, shape.childBounds],
          ]) {
            bind(unit);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA32F,
              textureWidth,
              values.length / (textureWidth * 4),
              0,
              gl.RGBA,
              gl.FLOAT,
              new Float32Array(values),
            );
          }
          // Keep both formats bound while alternating programs. Generic shaders
          // still need a valid integer sampler even when their BVH count is zero.
          bind(5);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32UI,
            1,
            shape.packedChildBounds.length / 4,
            0,
            gl.RGBA_INTEGER,
            gl.UNSIGNED_INT,
            new Uint32Array(shape.packedChildBounds),
          );
          bind(0);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32F,
            4,
            f.roots.length / 16,
            0,
            gl.RGBA,
            gl.FLOAT,
            new Float32Array(f.roots),
          );
          for (const p of new Set([...programs, ...clearancePrograms])) setup(p, f);
          // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
          gl.useProgram(post.program);
          const pu = post.uniform;
          gl.uniform1i(pu("color"), 2);
          gl.uniform1i(pu("surface"), 3);
          gl.uniform2f(pu("resolution"), width, height);
          gl.uniform2fv(pu("projection"), f.projection);
          gl.uniform2fv(pu("origin"), f.origin);
          gl.uniform1f(pu("far"), 128);
          gl.uniform1f(pu("ao"), !f.style.showFaces || f.style.occlusion === "off" ? 0 : 1);
          const draw = (p) => {
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
            gl.useProgram(p.program);
            gl.disable(gl.SCISSOR_TEST);
            gl.clearBufferfv(gl.COLOR, 0, new Float32Array([...rgb(f.style.background), 1]));
            gl.clearBufferfv(gl.COLOR, 1, new Float32Array([0.5, 0.5, 1, 1]));
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(...f.scissor);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.disable(gl.SCISSOR_TEST);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
            gl.useProgram(post.program);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
          };
          for (let i = 0; i < warmup; i++)
            for (const p of programs) {
              draw(p);
              synchronize();
            }
          const pixels = programs.map((p) => {
            draw(p);
            gl.finish();
            if (capture)
              images.push({
                name: `${f.name.replaceAll("/", "-")}-${p.name}.png`,
                data: canvas.toDataURL("image/png"),
              });
            return read();
          });
          const synchronizedTimings = programs.map(() => []);
          const queries = programs.map(() => []);
          for (let i = 0; i < samples; i++) {
            const order = i % 2 ? [1, 0] : [0, 1];
            for (const index of order) {
              synchronize();
              const q = timer ? own(gl.createQuery(), (v) => gl.deleteQuery(v)) : null;
              const start = performance.now();
              if (q) gl.beginQuery(timer.TIME_ELAPSED_EXT, q);
              draw(programs[index]);
              if (q) gl.endQuery(timer.TIME_ELAPSED_EXT);
              // A one-pixel readback blocks until both passes finish. Chromium's
              // gl.finish alone can return before GPU execution has completed.
              synchronize();
              synchronizedTimings[index].push(performance.now() - start);
              if (q) queries[index].push(q);
            }
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
          const queryDeadline = performance.now() + 10000;
          while (queries.flat().some((q) => !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))) {
            if (performance.now() > queryDeadline) throw Error("GPU timing queries did not finish");
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
          const disjoint = timer ? Boolean(gl.getParameter(timer.GPU_DISJOINT_EXT)) : false;
          const useGpu = Boolean(timer) && !disjoint;
          const measurements = synchronizedTimings.map((values, i) => {
            const gpuMs = useGpu
              ? queries[i].map((q) => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6)
              : [];
            const measured = useGpu ? gpuMs : values;
            return {
              name: programs[i].name,
              timing: useGpu
                ? "EXT_disjoint_timer_query_webgl2"
                : "one-pixel readback synchronized wall time",
              disjoint,
              medianMs: percentile(measured, 0.5),
              p95Ms: percentile(measured, 0.95),
              samplesMs: measured,
              synchronizedMedianMs: percentile(values, 0.5),
              synchronizedSamplesMs: values,
            };
          });
          // Navigation queries run separately from the timed and visual draws.
          // Test rays parallel to canonical planes and aimed at exact root edges.
          const queryRays = [
            { name: "forward", ray: f.basis.forward },
            ...[-1, 1].flatMap((sign) => [
              {
                name: `horizontal-${sign}`,
                ray: f.basis.forward.map((v, i) => v + sign * 0.2 * f.basis.right[i]),
              },
              {
                name: `vertical-${sign}`,
                ray: f.basis.forward.map((v, i) => v + sign * 0.2 * f.basis.up[i]),
              },
              ...[0, 1, 2].map((axis) => ({
                name: `axis-${axis}-${sign}`,
                ray: [0, 1, 2].map((i) => (i === axis ? sign : 0)),
              })),
            ]),
            ...f.tangencies,
          ].filter(({ ray }) => Math.hypot(...ray) > 0);
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
          gl.readBuffer(gl.COLOR_ATTACHMENT0);
          gl.viewport(0, 0, 1, 1);
          gl.disable(gl.SCISSOR_TEST);
          const query = (p, mode, ray) => {
            gl.useProgram(p.program);
            gl.uniform1i(p.uniform("query"), mode);
            gl.uniform3fv(p.uniform("queryRay"), ray);
            gl.uniform2f(p.uniform("resolution"), 1, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            const bytes = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
            return bytes;
          };
          const decode = (bytes) => new DataView(bytes.buffer).getFloat32(0, true);
          const failures = [];
          const clearance = clearancePrograms.map((p) => query(p, 2, f.basis.forward));
          if (clearance[0].some((v, i) => v !== clearance[1][i]))
            failures.push({
              mode: "clearance",
              baseline: decode(clearance[0]),
              current: decode(clearance[1]),
            });
          const fallbackCounts = [0, 0];
          let hitMissMismatches = 0;
          for (const { name, ray } of queryRays) {
            for (const mode of [1, 3]) {
              const pair = programs.map((p) => query(p, mode, ray));
              if (mode === 1 && decode(pair[0]) >= 0 !== decode(pair[1]) >= 0) hitMissMismatches++;
              if (mode === 3)
                pair.forEach((bytes, i) => {
                  if (bytes[3] > 0 && bytes[3] < 250) fallbackCounts[i]++;
                });
              if (pair[0].some((v, i) => v !== pair[1][i]))
                failures.push({
                  name,
                  mode: mode === 1 ? "distance" : "normal-and-exhaustion",
                  baseline: mode === 1 ? decode(pair[0]) : Array.from(pair[0]),
                  current: mode === 1 ? decode(pair[1]) : Array.from(pair[1]),
                });
            }
          }
          gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
          gl.viewport(0, 0, width, height);
          results.push({
            name: f.name,
            ...(shape.kind === 3
              ? {
                  path: "texture traversal; excludes production beam and uniform-buffer geometry",
                }
              : {}),
            stackDepths: programs.map((p) => p.stackDepth),
            clearanceStackDepths: clearancePrograms.map((p) => p.stackDepth),
            queries: {
              rays: queryRays.length,
              clearance: clearance.map(decode),
              fallbackCounts,
              hitMissMismatches,
              failures,
            },
            roots: f.roots.length / 16,
            rootVisits: f.visited,
            scissor: f.scissor,
            measurements,
            speedup: measurements[0].medianMs / measurements[1].medianMs,
            color: compare(pixels[0][0], pixels[1][0]),
            surface: compare(pixels[0][1], pixels[1][1]),
          });
        }
        const error = gl.getError();
        return {
          passed:
            !error &&
            results.every(
              (r) =>
                r.color.changedBytes === 0 &&
                r.surface.changedBytes === 0 &&
                r.queries.failures.length === 0,
            ),
          renderer,
          width,
          height,
          samples,
          warmup,
          settings,
          timing:
            "GPU timer queries for trace + production screen pass; one-pixel readback synchronized wall time also reported; shader compilation excluded",
          webglError: error,
          results,
          images,
        };
      } finally {
        for (const release of owned.reverse()) release();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    },
    { ...payload, capture: Boolean(captures) },
  );
  if (captures) {
    // One bundle avoids Chrome's automatic multiple-download limit. Extract it
    // with --extract-captures in Node to preserve the original canvas PNG bytes.
    let url;
    try {
      const downloaded = page.waitForEvent("download");
      url = await page.evaluate((images) => {
        const blob = new Blob([JSON.stringify(images)], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = "captures.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return href;
      }, result.images);
      const download = await downloaded;
      const path = `${captures}/captures.json`;
      await download.saveAs(path);
      const failure = await download.failure();
      if (failure) throw Error(failure);
      result.captureBundle = { path, images: result.images.length };
    } catch (error) {
      // Preserve the complete measurements even if the browser blocks a download.
      result.captureError = String(error);
    } finally {
      if (url) await page.evaluate((href) => URL.revokeObjectURL(href), url);
    }
  }
  delete result.images;
  console.log(JSON.stringify(result, null, 2));
  return result;
}

writeFileSync(
  args[1] ?? "/private/tmp/check-quadratic-koch-performance.js",
  `async(page)=>await (${check.toString()})(page,${JSON.stringify({ vertex, screen, variants, fixtures, width, height, samples, warmup, shapes, settings })},${JSON.stringify(args[2] ?? null)})`,
);
