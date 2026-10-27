import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

// Generate a Playwright CLI callback. Generation performs CPU checks only;
// execute the resulting callback with run-code --filename for actual WebGL.
const arguments_ = process.argv.slice(2);
const positional = arguments_.filter((argument) => !argument.startsWith("--"));
if (arguments_.some((argument) => argument.startsWith("--") && argument !== "--no-motion"))
  throw new Error("Supported option: --no-motion (standalone shader probes only).");
const output = positional[0] ?? "/private/tmp/check-romanesco-surface.js";
const baseUrl = positional[1] ?? "http://127.0.0.1:56716";
const referencePath = new URL("../utils/romanescoSurface.ts", import.meta.url);
const referenceJs = ts.transpileModule(readFileSync(referencePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
if (/\brequire\s*\(/.test(referenceJs))
  throw new Error("The browser CPU reference loader needs an explicit dependency map.");
const cpu = {};
new Function("exports", referenceJs)(cpu);
const model = cpu.ROMANESCO_SURFACE_MODEL;
const field = cpu.romanescoSurfaceField;
const ring = cpu.romanescoSurfaceRingRadius;
const shaderPath =
  process.env.ROMANESCO_SURFACE_SHADER ??
  new URL("../utils/shaders/romanesco-surface.frag", import.meta.url);
let fragment = readFileSync(shaderPath, "utf8");
if (fragment.includes("// ROMANESCO_CHART")) {
  const chartPath = new URL("../utils/shaders/romanesco-chart.frag", import.meta.url);
  const residualPath = new URL("../utils/shaders/romanesco-residual.frag", import.meta.url);
  fragment = fragment.replace(
    "// ROMANESCO_CHART",
    `${readFileSync(residualPath, "utf8")}\n${readFileSync(chartPath, "utf8")}`,
  );
}
const levelMatch = fragment.match(/RELIEF_LEVELS\s*=\s*(\d+)/);
if (levelMatch && Number(levelMatch[1]) !== model.defaultLevels)
  throw new Error("CPU and shader finite relief level counts differ.");
// Only diagnostic outputs change. The production intersection code is intact.
const rayOutput =
  /if\s*\(u_query\s*==\s*1\)\s*\{\s*outColor\s*=\s*encodeDistance\(hit,\s*found\);\s*return;\s*\}/;
if (!rayOutput.test(fragment)) throw new Error("Production ray-query diagnostic changed.");
fragment = fragment.replace(
  rayOutput,
  "if(u_query==1){outColor=encodeDistance(complete?hit:-2.0,complete?found:true);return;}",
);
const clearanceQuery = /if\s*\(\s*u_query\s*==\s*2\s*\)/;
if (!clearanceQuery.test(fragment) || /u_query\s*==\s*6\b/.test(fragment))
  throw new Error("Production signed-field diagnostic insertion changed.");
fragment = fragment.replace(
  clearanceQuery,
  "if(u_query==6){outColor=encodeDistance(reliefField(rootInverse(root,-root.center),0.0),true);return;}\n$&",
);
const vertex = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
const normalize = (p) => {
  const length = Math.hypot(...p);
  return p.map((v) => v / length);
};
const plusRay = (eye, ray, t) => eye.map((v, i) => v + ray[i] * t);
const boundRadius = model.baseRadius + model.reliefHeight;
const low = [-boundRadius, -1 - model.baseDepth, -boundRadius];
const high = [boundRadius, 1, boundRadius];

// Independent conservative stepping: no over-relaxation, front-band shortcut,
// atlas, GPU normal code, or old cone-union oracle.
function referenceRay(eye, ray, options) {
  let enter = 0;
  let leave = 20;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(ray[axis]) < 1e-20) {
      if (eye[axis] < low[axis] || eye[axis] > high[axis]) return null;
    } else {
      const a = (low[axis] - eye[axis]) / ray[axis];
      const b = (high[axis] - eye[axis]) / ray[axis];
      enter = Math.max(enter, Math.min(a, b));
      leave = Math.min(leave, Math.max(a, b));
    }
  }
  if (leave < enter) return null;
  let t = enter;
  for (let step = 0; step < 30000; step++) {
    const value = field(plusRay(eye, ray, t), { ...options, pixel: 0 });
    if (!Number.isFinite(value)) throw new Error("Nonfinite CPU reference field.");
    if (Math.abs(value) < 2e-10) return t;
    const advance = Math.abs(value) * 0.8;
    if (t + advance > leave) return null;
    if (!(advance > 1e-13)) throw new Error("CPU ray oracle stopped without a certified result.");
    t += advance;
  }
  throw new Error(`CPU ray oracle exhausted: ${JSON.stringify({ eye, ray, options })}`);
}

let randomState = 0x5138a20d;
const random = () => {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 2 ** 32;
};
const configs = [
  { maxRank: 0, growth: 1 },
  { maxRank: 1, growth: 0 },
  { maxRank: 1, growth: 0.25 },
  { maxRank: 1, growth: 1 },
  { maxRank: 2, growth: 0 },
  { maxRank: 2, growth: 0.5 },
  { maxRank: 2, growth: 1 },
  { maxRank: 1000, growth: 1 },
];
const count = Number(process.env.ROMANESCO_SURFACE_RANDOM ?? 16);
if (!Number.isInteger(count) || count < 1 || count > 256)
  throw new Error("ROMANESCO_SURFACE_RANDOM must be an integer from1 to256.");
const fieldPoints = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 1.01, 0],
  [0, -1 - model.baseDepth, 0],
  [0, -1.4, 0],
  [1.2, 0, 0],
  [-1.2, 0, 0],
  ...Array.from({ length: count }, () => [
    random() * 2.4 - 1.2,
    random() * 2.8 - 1.5,
    random() * 2.4 - 1.2,
  ]),
];
const randomRays = Array.from({ length: count }, (_, i) => {
  const direction = normalize([random() * 2 - 1, random() * 2 - 1, random() * 2 - 1]);
  const eye = direction.map((v, axis) => v * 3 + (axis === 1 ? -0.15 : 0));
  const target = [random() * 0.18 - 0.09, -0.2 + random() * 0.1, random() * 0.18 - 0.09];
  return { name: `random-${i}`, eye, ray: normalize(target.map((v, axis) => v - eye[axis])) };
});
const rays = [
  ...randomRays,
  ...[0, 1, 2].flatMap((axis) =>
    [-1, 1].map((sign) => {
      const ray = [0, 0, 0];
      ray[axis] = sign;
      return { name: `inside-axis-${axis}-${sign}`, eye: [0, 0, 0], ray };
    }),
  ),
  { name: "parallel-miss", eye: [1.4, 0, 2], ray: [0, 0, -1] },
  { name: "away-miss", eye: [0, 2, 0], ray: [0, 1, 0] },
  { name: "above-miss", eye: [0, 1.2, 3], ray: [0, 0, -1] },
  { name: "grazing-flank", eye: [0.45, 0, 3], ray: [0, 0, -1] },
  { name: "grazing-peaks", eye: [0.49, 0, 3], ray: [0, 0, -1] },
  { name: "near-tip", eye: [0.0001, 1.1, 0], ray: [0, -1, 0] },
];
const probes = [];
const cpuChecks = [];
for (const options of configs) {
  const label = `rank${options.maxRank}/growth${options.growth}`;
  const addField = (name, point) => {
    const eye = point.map(Math.fround);
    probes.push({
      name: `${label}/${name}`,
      type: "field",
      eye,
      ray: [0, 0, -1],
      options,
      expected: field(eye, { ...options, pixel: 0 }),
    });
  };
  fieldPoints.forEach((point, i) => {
    addField(`field-${i}`, point);
  });
  const localRays = rays.slice();
  for (let i = 0; i < 8; i++) {
    const angle = ((i + 0.173) * model.tau) / 8;
    const radius = ring(angle, { ...options, pixel: 0 });
    const radial = [Math.cos(angle), 0, Math.sin(angle)];
    const point = [radius * radial[0], -1, radius * radial[2]];
    const seam = field(point, { ...options, pixel: 0 });
    if (Math.abs(seam) > 1e-8)
      throw new Error(`CPU underside ring is open: ${label}/${i}: ${seam}`);
    cpuChecks.push({ name: `${label}/closed-ring-${i}`, error: Math.abs(seam) });
    for (const delta of [-0.002, 0, 0.002])
      addField(
        `ring-${i}/${delta}`,
        point.map((v, axis) => v + delta * radial[axis]),
      );
    localRays.push({
      name: `ring-entry-${i}`,
      eye: point.map((v, axis) => v + 0.03 * radial[axis]),
      ray: radial.map((v) => -v),
    });
    localRays.push({
      name: `ring-exit-${i}`,
      eye: point.map((v, axis) => v - 0.03 * radial[axis]),
      ray: radial,
    });
  }
  for (const probe of localRays) {
    const eye = probe.eye.map(Math.fround);
    const ray = normalize(probe.ray.map(Math.fround));
    const expected = referenceRay(eye, ray, options);
    const derivative =
      expected === null
        ? 0
        : Math.abs(
            field(plusRay(eye, ray, expected + 1e-5), { ...options, pixel: 0 }) -
              field(plusRay(eye, ray, expected - 1e-5), { ...options, pixel: 0 }),
          ) / 2e-5;
    probes.push({
      ...probe,
      name: `${label}/${probe.name}`,
      type: "ray",
      eye,
      ray,
      options,
      expected,
      derivative,
    });
  }
}
for (const rank of [1, 2, 3])
  for (const point of fieldPoints) {
    const previous = field(point, { maxRank: rank - 1, growth: 1, pixel: 0 });
    const start = field(point, { maxRank: rank, growth: 0, pixel: 0 });
    if (Math.abs(previous - start) > 1e-12)
      throw new Error(`Construction growth does not start at rank${rank - 1}.`);
    cpuChecks.push({ name: `growth-start-${rank}`, error: Math.abs(previous - start) });
  }

async function check(page, payload) {
  const context = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 948 }, deviceScaleFactor: 2 });
  try {
    const standalone = await context.newPage();
    const gpu = await standalone.evaluate(
      ({ vertex, fragment, referenceJs, probes, cpuChecks }) => {
        const cpu = {};
        new Function("exports", referenceJs)(cpu);
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const gl = canvas.getContext("webgl2", {
          alpha: false,
          antialias: false,
          preserveDrawingBuffer: true,
        });
        if (!gl) throw new Error("WebGL2 is unavailable.");
        const shaders = [],
          textures = [],
          errors = [],
          groups = new Map();
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
          const texture = (unit, format, width, height, external, type, data) => {
            const t = gl.createTexture();
            textures.push(t);
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, external, type, data);
            return t;
          };
          const roots = texture(0, gl.RGBA32F, 4, 1, gl.RGBA, gl.FLOAT, null);
          const color = texture(1, gl.RGBA8, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, null);
          framebuffer = gl.createFramebuffer();
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
          gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
            throw new Error("Incomplete query framebuffer.");
          gl.disable(gl.BLEND);
          gl.disable(gl.DITHER);
          gl.disable(gl.DEPTH_TEST);
          gl.viewport(0, 0, 1, 1);
          gl.uniform1i(at("roots"), 0);
          gl.uniform1i(at("rootCount"), 1);
          gl.uniform2f(at("resolution"), 1, 1);
          gl.uniform2f(at("projection"), 0, 0);
          gl.uniform2f(at("origin"), 0, 0);
          gl.uniform3f(at("right"), 1, 0, 0);
          gl.uniform3f(at("up"), 0, 1, 0);
          gl.uniform3f(at("forward"), 0, 0, -1);
          gl.uniform1f(at("focal"), 3.6);
          gl.uniform1f(at("far"), 20);
          gl.uniform1f(at("detailScale"), 2);
          gl.uniform1f(at("pixelAngle"), 0.0001);
          gl.uniform1f(at("nearFootprint"), 0.00002);
          const bytes = new Uint8Array(4),
            view = new DataView(bytes.buffer);
          const query = (mode) => {
            gl.uniform1i(at("query"), mode);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
            return view.getFloat32(0, true);
          };
          const started = performance.now();
          for (const probe of probes) {
            const data = new Float32Array([
              -probe.eye[0],
              -probe.eye[1],
              -probe.eye[2],
              0,
              1,
              0,
              0,
              0,
              0,
              1,
              0,
              1,
              0,
              0,
              1,
              0,
            ]);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, roots);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, 1, gl.RGBA, gl.FLOAT, data);
            gl.uniform1f(at("maxRank"), probe.options.maxRank);
            gl.uniform1f(at("growth"), probe.options.growth);
            gl.uniform3fv(at("queryRay"), probe.ray);
            const groupName = probe.name.split("/").slice(0, 2).join("/");
            const group = groups.get(groupName) ?? {
              name: groupName,
              field: 0,
              rays: 0,
              failures: 0,
            };
            const fail = (reason, values) => {
              group.failures++;
              errors.push({ name: probe.name, reason, ...values });
            };
            if (probe.type === "field") {
              const signed = query(6),
                clearance = query(2);
              const tolerance = 0.000008 * (1 + Math.hypot(...probe.eye));
              if (!Number.isFinite(signed) || Math.abs(signed - probe.expected) > tolerance)
                fail("field", { expected: probe.expected, actual: signed, tolerance });
              if (
                !Number.isFinite(clearance) ||
                clearance < 0 ||
                Math.abs(clearance - Math.max(0, probe.expected)) > tolerance
              )
                fail("clearance", {
                  expected: Math.max(0, probe.expected),
                  actual: clearance,
                  tolerance,
                });
              group.field++;
            } else {
              const actual = query(1),
                hit = actual >= 0;
              if (!Number.isFinite(actual) || actual === -2) fail("incomplete-ray", { actual });
              else if (hit !== (probe.expected !== null))
                fail("hit/miss", { expected: probe.expected, actual });
              else if (hit) {
                const pixel = Math.max(0.00002, actual * 0.0001);
                const tolerance = 0.00004 + (pixel * 0.12) / Math.max(0.02, probe.derivative);
                const point = probe.eye.map((v, i) => v + actual * probe.ray[i]);
                const residual = cpu.romanescoSurfaceField(point, { ...probe.options, pixel: 0 });
                if (Math.abs(actual - probe.expected) > tolerance)
                  fail("first-hit-distance", {
                    expected: probe.expected,
                    actual,
                    tolerance,
                    derivative: probe.derivative,
                  });
                if (Math.abs(residual) > pixel * 0.12 + 0.000008)
                  fail("surface-residual", { actual, residual, pixel });
              }
              group.rays++;
            }
            groups.set(groupName, group);
          }
          const webglError = gl.getError();
          if (webglError) errors.push({ webglError });
          const debug = gl.getExtension("WEBGL_debug_renderer_info");
          return {
            passed: errors.length === 0,
            cases: probes.length,
            cpuChecks: cpuChecks.length,
            renderer: gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
            milliseconds: performance.now() - started,
            groups: Array.from(groups.values()),
            errors: errors.slice(0, 80),
            totalErrors: errors.length,
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
    await standalone.close();
    let motion = null;
    if (payload.motion) {
      const app = await context.newPage();
      await app.addInitScript(() => {
        window.__surfaceQuality = { stage: "rest", draws: [] };
        const original = WebGL2RenderingContext.prototype.drawArrays;
        WebGL2RenderingContext.prototype.drawArrays = function (...args) {
          const program = this.getParameter(this.CURRENT_PROGRAM);
          const location = program && this.getUniformLocation(program, "u_query");
          if (
            this.canvas.matches?.("[data-gpu-spatial-explorer]") &&
            location &&
            this.getUniform(program, location) === 0 &&
            this.getUniformLocation(program, "u_roots")
          ) {
            const values = {};
            for (const name of [
              "resolution",
              "pixelAngle",
              "nearFootprint",
              "detailScale",
              "maxRank",
              "growth",
            ]) {
              const at = this.getUniformLocation(program, `u_${name}`),
                value = at && this.getUniform(program, at);
              values[name] = ArrayBuffer.isView(value) ? Array.from(value) : value;
            }
            const state = window.__surfaceQuality;
            state.draws.push({
              stage: state.stage,
              size: [this.canvas.width, this.canvas.height],
              values,
            });
            if (state.draws.length > 500) state.draws.shift();
          }
          return original.apply(this, args);
        };
      });
      await app.goto(`${payload.baseUrl}/romanesco`);
      await app.waitForFunction(
        () =>
          document.querySelector("[data-gpu-spatial-explorer]")?.dataset.renderZoom !== undefined ||
          document.querySelector("[role=alert]")?.textContent,
      );
      const alerts = await app.locator("[role=alert]").allTextContents();
      if (alerts.some(Boolean)) throw new Error(alerts.join(" "));
      const canvas = app.locator("[data-gpu-spatial-explorer]");
      await app.evaluate(async () => {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        window.__surfaceQuality.draws = [];
        window.dispatchEvent(new Event("garden:before-export"));
      });
      const capture = () =>
        app.evaluate(async () => {
          const parts = {},
            pending = [];
          window.dispatchEvent(
            new CustomEvent("garden:capture-view", { detail: { parts, pending } }),
          );
          await Promise.all(pending);
          return parts.spatialZoom;
        });
      const beforeCamera = await capture();
      const before = await canvas.evaluate((c) => ({
        zoom: c.dataset.renderZoom,
        size: [c.width, c.height],
      }));
      await canvas.click();
      await app.waitForFunction(() => document.pointerLockElement !== null);
      await app.evaluate(() => {
        window.__surfaceQuality.stage = "moving";
      });
      await app.keyboard.down("w");
      await app.waitForTimeout(900);
      await app.keyboard.up("w");
      await app.keyboard.press("Escape");
      await app.evaluate(() => {
        window.__surfaceQuality.stage = "after";
        window.dispatchEvent(new Event("garden:before-export"));
      });
      motion = await canvas.evaluate((c) => {
        const state = window.__surfaceQuality,
          reference = state.draws[0];
        const failures = state.draws.filter(
          (draw) =>
            JSON.stringify(draw.size) !== JSON.stringify(reference.size) ||
            JSON.stringify(draw.values) !== JSON.stringify(reference.values),
        );
        const rect = c.getBoundingClientRect(),
          native = [
            Math.round(rect.width * devicePixelRatio),
            Math.round(rect.height * devicePixelRatio),
          ];
        return {
          passed:
            failures.length === 0 &&
            state.draws.some((draw) => draw.stage === "moving") &&
            JSON.stringify(native) === JSON.stringify([c.width, c.height]),
          native,
          actual: [c.width, c.height],
          zoom: c.dataset.renderZoom,
          draws: state.draws.length,
          movingDraws: state.draws.filter((draw) => draw.stage === "moving").length,
          failures: failures.slice(0, 10),
        };
      });
      motion.before = before;
      motion.beforeCamera = beforeCamera;
      motion.afterCamera = await capture();
      motion.cameraMoved =
        JSON.stringify(motion.beforeCamera) !== JSON.stringify(motion.afterCamera);
      motion.passed = motion.passed && motion.cameraMoved;
      await app.close();
    }
    return {
      passed: gpu.passed && (motion === null || motion.passed),
      model: payload.model,
      gpu,
      motion,
    };
  } finally {
    await context.close();
  }
}

writeFileSync(
  output,
  `async page => await (${check.toString()})(page,${JSON.stringify({
    vertex,
    fragment,
    referenceJs,
    probes,
    cpuChecks,
    model,
    baseUrl,
    motion: !process.argv.includes("--no-motion"),
  })})`,
);
console.log(
  JSON.stringify({
    output,
    probes: probes.length,
    cpuChecks: cpuChecks.length,
    motion: !process.argv.includes("--no-motion"),
  }),
);
