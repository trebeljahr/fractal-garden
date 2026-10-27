import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

// Generation runs the fixed-point oracle. The generated Playwright callback
// performs WebGL checks separately; this script never starts a browser.
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const {
  buildRomanescoResidualData,
  buildRomanescoSurfaceChart,
} = require("../utils/romanescoSurfaceChart.ts");
const { createRomanescoPrecision } = require("../utils/romanescoPrecision.ts");
const { fixedFromNumber, rescaleFixed } = require("../utils/deepZoom/math.ts");
const { ROMANESCO_SURFACE_MODEL: model } = require("../utils/romanescoSurface.ts");
const output = process.argv[2] ?? "/private/tmp/check-romanesco-residual.js";
const zooms = (process.env.ROMANESCO_RESIDUAL_ZOOMS ?? "9,16,20,28,40,80,240")
  .split(",")
  .map(Number);
if (!zooms.length || zooms.some((zoom) => !Number.isInteger(zoom) || zoom < 0 || zoom > 240))
  throw new Error("Residual probe zooms must be integers between zero and240.");
const helperPath =
  process.env.ROMANESCO_RESIDUAL_HELPER ??
  new URL("../utils/shaders/romanesco-residual.frag", import.meta.url);
const surfacePath = new URL("../utils/shaders/romanesco-surface.frag", import.meta.url);
const production = readFileSync(surfacePath, "utf8");
const marker = production.indexOf("// ROMANESCO_CHART");
if (marker < 0) throw new Error("The ordinary surface-field prefix marker changed.");
const helper = readFileSync(helperPath, "utf8");
if (!helper.includes("romanescoResidualRawField") || !helper.includes("residualReliable"))
  throw new Error("Residual field diagnostic entry points changed.");
const chartPath = new URL("../utils/shaders/romanesco-chart.frag", import.meta.url);
const chartMode = /uniform\s+int\s+u_chartMode\s*,\s*u_chartLevels\s*,\s*u_chartFirstRank\s*;/;
const chartSource = readFileSync(chartPath, "utf8");
if (!chartMode.test(chartSource)) throw new Error("The chart mode declaration changed.");
const chartFragment = chartSource.replace(
  chartMode,
  "const int u_chartMode=5;\nuniform int u_chartLevels,u_chartFirstRank;",
);
const traceStart = production.indexOf("vec3 chartNormal(");
const traceEnd = production.indexOf("float decodeRestart", traceStart);
if (traceStart < 0 || traceEnd < traceStart)
  throw new Error("The production chart trace boundaries changed.");
const fragment = `${production.slice(0, marker)}\n${helper}\n${chartFragment}\n${production.slice(traceStart, traceEnd)}
uniform vec3 u_probePoint;
uniform float u_probePixel;
uniform int u_probeMode;
vec4 residualProbeEncode(float value){
 uint bits=floatBitsToUint(value);
 return vec4(float(bits&255u),float((bits>>8u)&255u),float((bits>>16u)&255u),float((bits>>24u)&255u))/255.0;
}
void main(){
 int column=int(gl_FragCoord.x);
 if(u_probeMode==1){
  float hit;vec3 normal;bool complete;
  bool found=traceChart(u_queryRay,0.0,hit,normal,complete);
  float distance=complete?(found?hit:-1.0):-2.0;
  outColor=residualProbeEncode(column==0?distance:column==1?(complete?1.0:0.0):(found?1.0:0.0));
  return;
 }
 float value=romanescoResidualRawField(u_probePoint,u_probePixel);
 outColor=residualProbeEncode(column==0?value:column==1?residualError+u_probePixel*.032:residualReliable?1.0:0.0);
}`;
const vertex = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;

const bits = 512;
const fixed = createRomanescoPrecision(bits);
const one = fixed.one;
const abs = (value) => (value < 0n ? -value : value);
const options = {
  maxRank: 1000,
  growth: 1,
  levels: model.defaultLevels,
  shear: model.primaryShear,
};
const oracleOptions = { ...options, workingScale: 1, workingRadius: 2, errorTolerance: 1e-8 };
const chartAt = (point, extra = {}) =>
  buildRomanescoSurfaceChart(point, bits, { ...oracleOptions, ...extra });
const fieldFixed = (chart) => rescaleFixed(chart.fieldFixed, chart.bits, bits);

// These elementary series only construct anchors. The actual field oracle is
// the production fixed-point evaluator, evaluated again at every probe point.
function expFixed(input) {
  let value = input;
  let halvings = 0;
  while (abs(value) > one / 8n) {
    value /= 2n;
    halvings++;
  }
  let sum = one,
    term = one;
  for (let k = 1; k <= bits; k++) {
    term = fixed.mul(term, value) / BigInt(k);
    if (term === 0n) break;
    sum += term;
  }
  for (let k = 0; k < halvings; k++) sum = fixed.mul(sum, sum);
  return sum;
}
function sinCosFixed(input) {
  let angle = input;
  angle %= fixed.tau;
  if (angle > fixed.pi) angle -= fixed.tau;
  if (angle < -fixed.pi) angle += fixed.tau;
  const square = fixed.mul(angle, angle);
  let sine = angle,
    cosine = one,
    sineTerm = angle,
    cosineTerm = one;
  for (let k = 1; k <= bits; k++) {
    sineTerm = -fixed.mul(sineTerm, square) / BigInt(2 * k * (2 * k + 1));
    cosineTerm = -fixed.mul(cosineTerm, square) / BigInt((2 * k - 1) * (2 * k));
    sine += sineTerm;
    cosine += cosineTerm;
    if (sineTerm === 0n && cosineTerm === 0n) break;
  }
  return [cosine, sine];
}
function polarPoint(radius, height, unit) {
  return [fixed.mul(radius, unit[0]), height, fixed.mul(radius, unit[1])];
}

// A safeguarded Newton step makes anchor generation small, while the bracket
// and fixed-point residual remain the termination criteria at all zooms.
function solveSurface(name, lower, upper, pointAt, tangentAt) {
  let lo = lower,
    hi = upper;
  let loValue = fieldFixed(chartAt(pointAt(lo)));
  let hiValue = fieldFixed(chartAt(pointAt(hi)));
  if (loValue === 0n) return pointAt(lo);
  if (hiValue === 0n) return pointAt(hi);
  if (loValue > 0n === hiValue > 0n) throw new Error(`${name}: surface root is not bracketed.`);
  let at = (lo + hi) / 2n;
  // This is 2^-320 canonical units: more than70 guard bits at the deepest view.
  const tolerance = one >> 320n;
  for (let step = 0; step < bits + 16; step++) {
    const point = pointAt(at),
      chart = chartAt(point),
      value = fieldFixed(chart);
    if (abs(value) <= tolerance || hi - lo <= tolerance) return point;
    if (value > 0n === loValue > 0n) {
      lo = at;
      loValue = value;
    } else {
      hi = at;
      hiValue = value;
    }
    const tangent = tangentAt(at),
      derivative = chart.gradient.reduce((sum, v, i) => sum + v * tangent[i], 0);
    let next = (lo + hi) / 2n;
    if (Number.isFinite(derivative) && Math.abs(derivative) > 1e-10) {
      const proposed = at - fixed.div(value, fixed.fromNumber(derivative));
      if (proposed > lo && proposed < hi && proposed !== at) next = proposed;
    }
    at = next;
  }
  throw new Error(`${name}: fixed-point anchor solve exhausted.`);
}
function radialSurface(name, y, angle) {
  const height = fixed.fromNumber(y),
    h = fixed.div(one - height, fixed.fromNumber(2));
  const unit = sinCosFixed(fixed.fromNumber(angle));
  return solveSurface(
    name,
    fixed.mul(h, fixed.fromNumber(model.baseRadius * 0.99)),
    fixed.mul(h, fixed.fromNumber(model.baseRadius + model.reliefHeight + 0.01)),
    (r) => polarPoint(r, height, unit),
    () => [fixed.toNumber(unit[0]), 0, fixed.toNumber(unit[1])],
  );
}
function primaryFeature(name, localA) {
  // Invert the actual binary64 model coefficients, not the ideal identity
  // 8A+13B=1, so these anchors retain their seams beyond double precision.
  const a = fixed.fromNumber(8 + localA),
    b = 0n;
  const A = fixed.fromNumber(model.latticeA),
    B = fixed.fromNumber(model.latticeB);
  const determinant = -8n * A - 13n * B;
  const u = fixed.div(-8n * a - 13n * b, determinant);
  const v = fixed.div(-fixed.mul(B, a) + fixed.mul(A, b), determinant);
  const primary = expFixed(-fixed.mul(fixed.fromNumber(model.spiralDecay), u));
  const unit = sinCosFixed(fixed.mul(fixed.tau, v));
  const coefficient = (h) =>
    fixed.mul(
      fixed.fromNumber(model.primaryShear),
      one - fixed.mul(fixed.mul(h, h), fixed.mul(h, h)),
    );
  const pointAt = (h) => {
    const radius =
      fixed.mul(fixed.fromNumber(model.baseRadius), h) + fixed.div(primary - h, coefficient(h));
    return polarPoint(radius, one - 2n * h, unit);
  };
  return solveSurface(
    name,
    fixed.div(primary, fixed.fromNumber(1 + model.primaryShear * model.reliefHeight)),
    primary,
    pointAt,
    (h) => {
      const x = fixed.toNumber(h),
        p = fixed.toNumber(primary),
        c = model.primaryShear * (1 - x ** 4),
        cp = -4 * model.primaryShear * x ** 3;
      const dr = model.baseRadius - 1 / c - ((p - x) * cp) / (c * c);
      return [dr * fixed.toNumber(unit[0]), -2, dr * fixed.toNumber(unit[1])];
    },
  );
}
function undersideNearCenter() {
  const x = fixed.fromNumber(0.008),
    z = fixed.fromNumber(0.005);
  return solveSurface(
    "underside-near-center",
    fixed.fromNumber(-1.3),
    fixed.fromNumber(-1),
    (y) => [x, y, z],
    () => [0, 1, 0],
  );
}
const anchorFamilies = [
  { name: "front-surface", point: radialSurface("front-surface", 0.2, 0.4) },
  { name: "primary-cell-edge", point: primaryFeature("primary-cell-edge", 0.5) },
  { name: "primary-rim-kink", point: primaryFeature("primary-rim-kink", 0.25) },
  { name: "underside-join", point: radialSurface("underside-join", -1, 0.37) },
  { name: "underside-near-center", point: undersideNearCenter() },
];
const viewsOutput = process.env.ROMANESCO_RESIDUAL_VIEWS;
if (viewsOutput) {
  const { rotationOf, inverseRotate, readSpatialCamera } = require("../utils/spatial/camera.ts");
  const baseUrl = "http://127.0.0.1:56715/romanesco";
  const rootCenter = [0, 0.12, 0].map((value) => fixedFromNumber(value, bits));
  const views = [];
  const addView = (family, point, zoom, vertical = 0) => {
    const radial = fixed.hypot(point[0], point[2]);
    const outward = vertical
      ? [0, vertical, 0]
      : [
          fixed.toNumber(fixed.div(point[0], radial)),
          0,
          fixed.toNumber(fixed.div(point[2], radial)),
        ];
    const config = {
      rotationX: vertical * 90,
      rotationY: vertical ? 0 : (Math.atan2(-outward[0], outward[2]) * 180) / Math.PI,
      showFaces: true,
      showWireframe: false,
      autoRotate: false,
    };
    const offset = inverseRotate([0, 0, 6], rotationOf(config));
    const offsetLength = Math.hypot(...offset);
    const eyeDirection = offset.map((value) => value / offsetLength);
    if (eyeDirection.some((value, axis) => Math.abs(value - outward[axis]) > 1e-12))
      throw new Error(
        `${family}/zoom${zoom}: app camera does not face the HP target from outside.`,
      );
    // Keep root placement fixed point. A binary64 sum here loses the entire
    // zoom240 neighborhood before the shared-view decoder receives it.
    const target = point.map((value, axis) => rootCenter[axis] + (5n * value) / 4n);
    const camera = readSpatialCamera({
      target: target.map(String),
      bits,
      zoom,
      atmosphereZoom: zoom,
      atmosphereVelocity: 0,
    });
    const parts = { config, spatialZoom: camera };
    const encoded = Buffer.from(JSON.stringify({ version: 1, path: "/romanesco", parts })).toString(
      "base64url",
    );
    views.push({
      name: `${family}/zoom${zoom}`,
      family,
      canonicalTarget: point.map(String),
      canonicalBits: bits,
      camera,
      config,
      eyeDirection,
      parts,
      url: `${baseUrl}#view=${encoded}`,
    });
  };
  for (const family of anchorFamilies) {
    for (const zoom of [9, 20, 40, 80, 240])
      addView(family.name, family.point, zoom, family.name === "underside-near-center" ? -1 : 0);
  }
  for (const zoom of [80, 240]) {
    addView("root-apex", [0n, one, 0n], zoom, 1);
    addView("underside-tip", [0n, -one - fixed.fromNumber(model.baseDepth), 0n], zoom, -1);
  }
  writeFileSync(
    viewsOutput,
    `${JSON.stringify({ version: 1, baseUrl, anchorBits: bits, model, views }, null, 2)}\n`,
  );
}
const templates = [
  [0, 0, 0],
  [0.25, -0.125, 0.375],
  [-0.5, 0.5, 0.25],
  [2, -1, 1],
  [-16, 8, -8],
  [64, -32, 48],
];
const frames = [];
const rayFrames = [];
const pixelAngle = 1 / (1.8 * 1896);
function normalizedFloat32(values) {
  const rounded = values.map(Math.fround);
  const squared = rounded.map((value) => Math.fround(value * value));
  const length = Math.fround(
    Math.sqrt(Math.fround(Math.fround(squared[0] + squared[1]) + squared[2])),
  );
  return rounded.map((value) => Math.fround(value / length));
}
for (const family of anchorFamilies) {
  const anchorCheck = chartAt(family.point);
  if (Math.abs(anchorCheck.offset) > 2 ** -300)
    throw new Error(`${family.name}: anchor is not on the high-precision surface.`);
  if (family.name.startsWith("primary-")) {
    const primary = anchorCheck.patches.find((patch) => patch.path === "side" && patch.level === 0);
    if (!primary) throw new Error(`${family.name}: missing primary patch.`);
    const q = primary.point.map((value) =>
      createRomanescoPrecision(anchorCheck.bits).toNumber(value),
    );
    const support =
      model.hexCover *
      Math.max(
        Math.abs(q[0]),
        Math.abs(0.5 * q[0] + model.sqrtThreeOverTwo * q[1]),
        Math.abs(-0.5 * q[0] + model.sqrtThreeOverTwo * q[1]),
      );
    const expected = family.name.endsWith("edge") ? 0.5 : 0.25;
    if (Math.abs(support - expected) > 1e-12)
      throw new Error(`${family.name}: prescribed feature was not reached.`);
  }
  for (const zoom of zooms) {
    const workingScale = 1.25 * 2 ** zoom;
    const radial = fixed.toNumber(fixed.hypot(family.point[0], family.point[2]));
    // Keep these mode5 fixtures nonpolar. Modes2/4 cover the root poles.
    const workingRadius = Math.min(128, radial * workingScale * 0.2);
    const data = buildRomanescoResidualData(family.point, bits, {
      ...options,
      workingScale,
      workingRadius,
    });
    if (
      data.width !== 20 ||
      data.height !== 3 * model.defaultLevels + 1 ||
      data.data.length !== 20 * data.height * 4
    )
      throw new Error("Residual table dimensions changed.");
    const probeScale = Math.min(1, workingRadius / 100);
    const probes = templates.map((template, index) => {
      // The oracle uses the exact Float32 coordinates sent to the shader.
      const point = template.map((value) => Math.fround(value * probeScale));
      const actual = family.point.map(
        (value, axis) => value + fixedFromNumber(point[axis] / workingScale, bits),
      );
      const oracle = chartAt(actual, { workingScale, workingRadius: 128, residualData: true });
      if (!Number.isFinite(oracle.offset))
        throw new Error(`${family.name}/${zoom}/${index}: nonfinite oracle.`);
      return {
        name: `${family.name}/zoom${zoom}/${index}`,
        point,
        pixel: Math.max(0.02, Math.hypot(...point)) / (1.8 * 1896),
        expected: oracle.offset,
      };
    });
    frames.push({
      name: `${family.name}/zoom${zoom}`,
      zoom,
      workingRadius,
      anchor: family.point.map(String),
      anchorBits: bits,
      ...data,
      data: Array.from(data.data),
      probes,
    });
    const outward =
      family.name === "underside-near-center"
        ? [0, -1, 0]
        : [fixed.toNumber(family.point[0]) / radial, 0, fixed.toNumber(family.point[2]) / radial];
    const ray = normalizedFloat32(outward.map((value) => -value));
    // Match the shader's Float32 ray*6 exactly. This preserves the HP surface
    // point at t=6 even when its absolute coordinates cannot enter a float.
    const displacement = ray.map((value) => Math.fround(6 * value));
    const eye = family.point.map(
      (value, axis) => value - fixedFromNumber(displacement[axis] / workingScale, bits),
    );
    const derivativeStep = 0.0001;
    const outside = family.point.map(
      (value, axis) => value + fixedFromNumber((-ray[axis] * derivativeStep) / workingScale, bits),
    );
    const derivative =
      chartAt(outside, { workingScale, workingRadius: 128, residualData: true }).offset /
      derivativeStep;
    const eyeField = chartAt(eye, { workingScale, workingRadius: 128, residualData: true }).offset;
    if (!(derivative > 0) || !(eyeField > 0))
      throw new Error(
        `${family.name}/zoom${zoom}: the known-hit ray must start on the outward side.`,
      );
    const rayData = buildRomanescoResidualData(eye, bits, {
      ...options,
      workingScale,
      workingRadius: 128,
    });
    rayFrames.push({
      name: `${family.name}/zoom${zoom}/ray`,
      zoom,
      workingRadius: 128,
      ...rayData,
      data: Array.from(rayData.data),
      anchorFixed: eye.map(String),
      anchorBits: bits,
      probes: [
        {
          name: `${family.name}/zoom${zoom}/first-hit`,
          type: "ray",
          ray,
          expected: 6,
          derivative,
          eyeField,
          tolerance: 0.00004 + (6 * pixelAngle * 0.12) / derivative,
        },
      ],
    });
  }
}

async function check(page, payload) {
  const context = await page.context().browser().newContext();
  try {
    const target = await context.newPage();
    return await target.evaluate(
      ({ vertex, fragment, frames, rayFrames, options, model, pixelAngle }) => {
        const canvas = document.createElement("canvas");
        canvas.width = 3;
        canvas.height = 1;
        const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });
        if (!gl) throw new Error("WebGL2 is unavailable.");
        const shaders = [],
          textures = [],
          failures = [],
          groups = [];
        let program, framebuffer, vao;
        const compile = (type, source) => {
          const shader = gl.createShader(type);
          shaders.push(shader);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw new Error(gl.getShaderInfoLog(shader));
          return shader;
        };
        try {
          program = gl.createProgram();
          gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
          gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            throw new Error(gl.getProgramInfoLog(program));
          // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook.
          gl.useProgram(program);
          vao = gl.createVertexArray();
          gl.bindVertexArray(vao);
          const at = (name) => gl.getUniformLocation(program, `u_${name}`);
          const texture = (unit, internal, width, height, format, type) => {
            const value = gl.createTexture();
            textures.push(value);
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, value);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, type, null);
            return value;
          };
          const table = texture(0, gl.RGBA32F, 20, 3 * model.defaultLevels + 1, gl.RGBA, gl.FLOAT);
          const result = texture(1, gl.RGBA8, 3, 1, gl.RGBA, gl.UNSIGNED_BYTE);
          framebuffer = gl.createFramebuffer();
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, result, 0);
          gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
            throw new Error("Incomplete residual query framebuffer.");
          gl.disable(gl.BLEND);
          gl.disable(gl.DITHER);
          gl.disable(gl.DEPTH_TEST);
          gl.viewport(0, 0, 3, 1);
          gl.uniform1i(at("residualTable"), 0);
          gl.uniform1f(at("maxRank"), options.maxRank);
          gl.uniform1f(at("growth"), options.growth);
          gl.uniform1f(at("probePixel"), 0);
          gl.uniform1i(at("query"), 0);
          gl.uniform1i(at("iterationLimit"), 0);
          gl.uniform1f(at("far"), 128);
          gl.uniform1f(at("pixelAngle"), pixelAngle);
          gl.uniform1f(at("nearFootprint"), pixelAngle * 0.02);
          const bytes = new Uint8Array(12),
            values = new DataView(bytes.buffer);
          let cases = 0,
            unreliable = 0,
            inaccurate = 0,
            rayCases = 0,
            rayFailures = 0,
            maximumErrorRatio = 0;
          const started = performance.now();
          for (const frame of [...frames, ...rayFrames]) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, table);
            gl.texSubImage2D(
              gl.TEXTURE_2D,
              0,
              0,
              0,
              20,
              frame.height,
              gl.RGBA,
              gl.FLOAT,
              new Float32Array(frame.data),
            );
            const orbits = [frame.orbits.side, frame.orbits.ring, frame.orbits.bottom];
            gl.uniform3iv(
              at("residualOffsets"),
              orbits.map((orbit) => orbit.row),
            );
            gl.uniform3iv(
              at("residualCounts"),
              orbits.map((orbit) => orbit.count),
            );
            gl.uniform3fv(
              at("residualInverseSigma"),
              orbits.map((orbit) => orbit.inverseSigma),
            );
            const scalars = {
              residualScale: frame.viewScale,
              residualHeight: frame.heightAtAnchor,
              residualRing: frame.ringRadius,
              residualRadialRatio: frame.radialRatio,
              residualPrimaryRatio: frame.primaryRatio,
              residualSideLogTransport: frame.sideLogTransport,
              residualDelta: frame.delta,
              residualShearCoefficient: frame.shearCoefficient,
              residualBottomUpperWork: frame.bottomUpperWork,
            };
            for (const [name, value] of Object.entries(scalars)) gl.uniform1f(at(name), value);
            const pairs = {
              residualRootUnit: frame.rootUnit,
              residualDiskPoint: frame.diskPoint,
              residualAmplitudeOffsets: frame.amplitudeOffsets,
              residualShearOffsets: frame.shearOffsets,
            };
            for (const [name, value] of Object.entries(pairs)) gl.uniform2fv(at(name), value);
            gl.uniform3fv(at("residualAnchorField"), [
              frame.rawSideWork,
              frame.rawBottomWork,
              frame.yMinusOneWork,
            ]);
            gl.uniform3fv(at("residualDeltaOffsets"), frame.deltaOffsets);
            gl.uniform3fv(at("residualAngleTransports"), frame.angleTransports);
            const group = {
              name: frame.name,
              cases: 0,
              unreliable: 0,
              inaccurate: 0,
              rays: 0,
              rayFailures: 0,
              maximumAbsoluteError: 0,
              maximumReportedError: 0,
            };
            for (const probe of frame.probes) {
              if (probe.type === "ray") {
                gl.uniform1i(at("probeMode"), 1);
                gl.uniform3fv(at("queryRay"), probe.ray);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                gl.readPixels(0, 0, 3, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
                const actual = values.getFloat32(0, true);
                const complete = values.getFloat32(4, true) === 1;
                const found = values.getFloat32(8, true) === 1;
                cases++;
                rayCases++;
                group.cases++;
                group.rays++;
                const reason =
                  !complete || actual === -2
                    ? "incomplete-ray"
                    : !found || actual === -1
                      ? "ray-miss"
                      : !Number.isFinite(actual) ||
                          Math.abs(actual - probe.expected) > probe.tolerance
                        ? "first-hit-distance"
                        : null;
                if (reason) {
                  rayFailures++;
                  group.rayFailures++;
                  failures.push({
                    name: probe.name,
                    reason,
                    actual,
                    expected: probe.expected,
                    tolerance: probe.tolerance,
                    derivative: probe.derivative,
                    complete,
                    found,
                  });
                }
                continue;
              }
              gl.uniform1i(at("probeMode"), 0);
              gl.uniform3fv(at("probePoint"), probe.point);
              gl.uniform1f(at("probePixel"), probe.pixel);
              gl.drawArrays(gl.TRIANGLES, 0, 3);
              gl.readPixels(0, 0, 3, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
              const actual = values.getFloat32(0, true),
                reportedError = values.getFloat32(4, true),
                reliable = values.getFloat32(8, true) === 1;
              const absoluteError = Math.abs(actual - probe.expected);
              const floatRounding =
                4 * 2 ** -23 * Math.max(1, Math.abs(actual), Math.abs(probe.expected));
              const tolerance = reportedError + floatRounding;
              cases++;
              group.cases++;
              if (!reliable) {
                unreliable++;
                group.unreliable++;
                failures.push({
                  name: probe.name,
                  reason: "unreliable",
                  actual,
                  expected: probe.expected,
                  reportedError,
                });
              }
              if (
                !Number.isFinite(actual) ||
                !Number.isFinite(reportedError) ||
                reportedError < 0 ||
                absoluteError > tolerance
              ) {
                inaccurate++;
                group.inaccurate++;
                failures.push({
                  name: probe.name,
                  reason: "field-error",
                  actual,
                  expected: probe.expected,
                  absoluteError,
                  reportedError,
                  floatRounding,
                });
              }
              group.maximumAbsoluteError = Math.max(group.maximumAbsoluteError, absoluteError);
              group.maximumReportedError = Math.max(group.maximumReportedError, reportedError);
              maximumErrorRatio = Math.max(
                maximumErrorRatio,
                absoluteError / Math.max(tolerance, Number.MIN_VALUE),
              );
            }
            groups.push(group);
          }
          const webglError = gl.getError();
          if (webglError) failures.push({ reason: "webgl", code: webglError });
          const debug = gl.getExtension("WEBGL_debug_renderer_info");
          return {
            passed: failures.length === 0,
            model,
            cases,
            frames: frames.length + rayFrames.length,
            fieldCases: cases - rayCases,
            rayCases,
            rayFailures,
            unreliable,
            inaccurate,
            maximumErrorRatio,
            renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
            milliseconds: performance.now() - started,
            groups,
            totalFailures: failures.length,
            failures: failures.slice(0, 100),
          };
        } finally {
          textures.forEach((texture) => {
            gl.deleteTexture(texture);
          });
          shaders.forEach((shader) => {
            gl.deleteShader(shader);
          });
          if (program) gl.deleteProgram(program);
          if (framebuffer) gl.deleteFramebuffer(framebuffer);
          if (vao) gl.deleteVertexArray(vao);
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
      },
      payload,
    );
  } finally {
    await context.close();
  }
}

writeFileSync(
  output,
  `async page => await (${check.toString()})(page,${JSON.stringify({ vertex, fragment, frames, rayFrames, options, model, pixelAngle })})`,
);
console.log(
  JSON.stringify({
    output,
    frames: frames.length,
    probes: frames.reduce((sum, frame) => sum + frame.probes.length, 0),
    rayFrames: rayFrames.length,
    rayProbes: rayFrames.reduce((sum, frame) => sum + frame.probes.length, 0),
    zooms,
    anchorBits: bits,
    helperPath,
    viewsOutput,
  }),
);
