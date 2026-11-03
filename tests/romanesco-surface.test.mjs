import assert from "node:assert/strict";
import test from "node:test";
import { require } from "./helpers/spatial-gpu-fixtures.mjs";

const {
  ROMANESCO_SURFACE_MODEL: model,
  romanescoSurfaceCell: cell,
  romanescoSurfacePatchHeight: patch,
  romanescoSurfaceRingRadius: ring,
  romanescoSurfaceField: field,
  romanescoSurfaceClearance: clearance,
} = require("../../utils/romanescoSurface.ts");
const { createRomanescoPrecision } = require("../../utils/romanescoPrecision.ts");
const { buildRomanescoSurfaceChart } = require("../../utils/romanescoSurfaceChart.ts");
const { buildRomanescoSurfaceFrame } = require("../../utils/spatialGpu/romanescoSurfaceFrame.ts");
const { fixedFromNumber } = require("../../utils/deepZoom/math.ts");
const { reframeSpatialEye } = require("../../utils/spatial/flight.ts");
const { rotationOf } = require("../../utils/spatial/camera.ts");

test("surface construction grows each rank from the preceding surface", () => {
  for (let rank = 1; rank <= 6; rank++) {
    for (let i = 1; i <= 32; i++) {
      const point = [Math.cos(i) * 0.7, Math.sin(i) * 0.7];
      assert.equal(
        patch(point, 1, { maxRank: rank, growth: 0 }),
        patch(point, 1, { maxRank: rank - 1 }),
      );
    }
  }
});

test("flight retains nested height after the six-step construction preview", () => {
  const point = [0.25, 0.2];
  assert.ok(patch(point) > patch(point, 1, { levels: 6 }));
  assert.equal(patch(point, 1, { maxRank: 6 }), patch(point, 1, { levels: 6 }));
});

test("surface joins the scalloped underside along a closed ring", () => {
  for (let i = 0; i < 128; i++) {
    const angle = (i * Math.PI) / 64;
    const radius = ring(angle);
    const point = [radius * Math.cos(angle), -1, radius * Math.sin(angle)];
    assert.ok(Math.abs(field(point)) < 2e-14);
    assert.ok(field([point[0] * 1.001, -1, point[2] * 1.001]) > 0);
    assert.ok(field([point[0] * 0.999, -1, point[2] * 0.999]) < 0);
  }
});

test("hexagonal folding joins cell edges and closes the angular seam", () => {
  for (let i = 0; i < 64; i++) {
    const radius = Math.exp(-i * 0.06);
    const a = cell(radius, Math.PI - 1e-9);
    const b = cell(radius, -Math.PI + 1e-9);
    assert.ok(Math.abs(patch(a) - patch(b)) < 2e-7);
  }
  // The two cells on either side of this hexagonal Voronoi edge have
  // the same primary height; their nested contributions meet at zero.
  const edge = Math.sqrt(3) / 2;
  assert.ok(Math.abs(patch([edge - 1e-9, 0]) - patch([-edge + 1e-9, 0])) < 1e-8);
});

test("pixel tail omission stays below its marching allowance", () => {
  let seed = 7;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 2000; i++) {
    const point = [(random() - 0.5) * 2.4, random() * 2.8 - 1.5, (random() - 0.5) * 2.4];
    const pixel = 2 ** (-5 - random() * 16);
    assert.ok(
      Math.abs(field(point, { pixel }) - field(point)) <= model.pixelTailBound * pixel + 1e-13,
    );
    assert.ok(clearance(point) <= Math.max(0, field(point)));
  }
});

test("fixed-point anchor arithmetic retains changes far below binary64 precision", () => {
  const p = createRomanescoPrecision(384);
  const delta = p.one >> 240n;
  const change = p.log(p.one + delta);
  assert.ok(Math.abs(p.toNumber(change, 240) - 1) < 1e-14);
  assert.ok(Math.abs(p.toNumber(p.atan2(delta, p.one), 240) - 1) < 1e-14);
  assert.ok(Math.abs(p.toNumber(p.sqrt(p.one + 2n * delta) - p.one, 240) - 1) < 1e-14);
  for (const x of [0.01, 0.3, 1, 2, 19]) {
    assert.ok(Math.abs(p.toNumber(p.log(p.fromNumber(x))) - Math.log(x)) < 2e-14);
    assert.ok(Math.abs(p.toNumber(p.atan2(p.fromNumber(x), p.one)) - Math.atan(x)) < 2e-14);
  }
});

test("diagonal hex seams remain continuous at deep camera precision", () => {
  const bits = 384;
  const fixed = createRomanescoPrecision(bits);
  const one = fixed.one;
  const abs = (value) => (value < 0n ? -value : value);
  // Construct exact lattice-side anchors without rounding their separation to
  // binary64. The production chart remains the field evaluator under test.
  const exp = (input) => {
    let value = input;
    let halvings = 0;
    while (abs(value) > one / 8n) {
      value /= 2n;
      halvings++;
    }
    let result = one;
    let term = one;
    for (let k = 1; k <= bits; k++) {
      term = fixed.mul(term, value) / BigInt(k);
      if (term === 0n) break;
      result += term;
    }
    for (let k = 0; k < halvings; k++) result = fixed.mul(result, result);
    return result;
  };
  const unit = (angle) => {
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
  };
  const A = fixed.fromNumber(model.latticeA),
    B = fixed.fromNumber(model.latticeB);
  const determinant = 8n * A + 13n * B;
  const b = (2n * one) / 5n;
  const point = (delta) => {
    // a+b=9 is a diagonal edge, away from its symmetric midpoint and vertices.
    const a = 9n * one - b + delta;
    const u = fixed.div(8n * a + 13n * b, determinant);
    const v = fixed.div(fixed.mul(B, a) - fixed.mul(A, b), determinant);
    const h = exp(-fixed.mul(fixed.fromNumber(model.spiralDecay), u));
    const radial = fixed.mul(fixed.fromNumber(0.95), h);
    const direction = unit(fixed.mul(fixed.tau, v));
    return [fixed.mul(radial, direction[0]), one - 2n * h, fixed.mul(radial, direction[1])];
  };
  for (const zoom of [80, 240]) {
    const delta = one >> BigInt(zoom);
    const left = point(-delta),
      right = point(delta);
    const options = { workingScale: 2 ** zoom, workingRadius: 129, shear: 0, residualData: true };
    const a = buildRomanescoSurfaceChart(left, bits, options);
    const b = buildRomanescoSurfaceChart(right, bits, options);
    assert.notDeepEqual(a.patches[0].cell, b.patches[0].cell);
    const distance = fixed.toNumber(fixed.hypot(...left.map((v, i) => v - right[i])), zoom);
    const change = createRomanescoPrecision(a.bits).toNumber(
      abs(a.fieldFixed - b.fieldFixed),
      zoom,
    );
    assert.ok(change <= distance + 1e-8, `zoom ${zoom}: seam change ${change} exceeds ${distance}`);
  }
});

test("the signed field remains a conservative distance bound across surface joins", () => {
  for (let i = 0; i < 400; i++) {
    const a = [Math.sin(i * 1.7), Math.cos(i * 0.9) * 1.4, Math.sin(i * 2.3)];
    const b = a.map((v, axis) => v + Math.sin(i * 3.1 + axis) * 0.003);
    assert.ok(
      Math.abs(field(a) - field(b)) <= Math.hypot(...a.map((v, axis) => v - b[axis])) + 1e-12,
    );
  }
});

test("the signed field stays a lower distance bound right at the relief", () => {
  let seed = 11;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 20000; i++) {
    const y = random() * 1.96 - 0.98;
    const h = (1 - y) / 2,
      angle = random() * model.tau;
    const radial = (model.baseRadius + random() * model.reliefHeight) * h;
    const a = [radial * Math.cos(angle), y, radial * Math.sin(angle)];
    const b = a.map((v) => v + (random() - 0.5) * 2e-5);
    assert.ok(
      Math.abs(field(a) - field(b)) <= Math.hypot(...a.map((v, axis) => v - b[axis])) + 1e-12,
    );
  }
});

test("nested florets stay steep enough to read as relief when zoomed in", () => {
  let seed = 3,
    total = 0,
    count = 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const tail = (p) => patch(p) - patch(p, 1, { levels: 5 });
  const step = 1e-7;
  for (let i = 0; i < 20000; i++) {
    const point = [(random() - 0.5) * 1.2, (random() - 0.5) * 1.2];
    const dx = tail([point[0] + step, point[1]]) - tail([point[0] - step, point[1]]);
    const dy = tail([point[0], point[1] + step]) - tail([point[0], point[1] - step]);
    total += (dx * dx + dy * dy) / (4 * step * step);
    count++;
  }
  // Epsilon .14 measures .042 here. Epsilon .06 measured .0006 and rendered as a blank wall.
  assert.ok(Math.sqrt(total / count) > 0.02);
});

test("turning the camera in place does not change the surface it sees", () => {
  const zoom = 12,
    bits = 160 + zoom;
  const camera = {
    target: [0.7, 0.2, 0.2].map((v) => String(fixedFromNumber(v, bits))),
    bits,
    zoom,
  };
  const before = { rotationX: 65, rotationY: 28 },
    after = { rotationX: 40, rotationY: 70 };
  const a = buildRomanescoSurfaceFrame(camera, before);
  const b = buildRomanescoSurfaceFrame(
    reframeSpatialEye(camera, rotationOf(before), rotationOf(after)),
    after,
  );
  for (let axis = 0; axis < 3; axis++) {
    const gap = a.surface.canonicalEyeFixed[axis] - BigInt(b.surface.canonicalEyeFixed[axis]);
    assert.ok(Math.abs(Number(gap) * 2 ** (zoom - bits)) < 1e-9);
  }
  assert.equal(a.chart.kind, b.chart.kind);
  assert.ok(Math.abs(a.chart.offset - b.chart.offset) < 1e-6);
});

test("each deep camera has a finite GPU coordinate model", () => {
  for (const zoom of [9, 16, 17, 24, 40, 80, 240]) {
    const bits = 160 + zoom;
    const camera = {
      target: ["0", String(fixedFromNumber(0.12, bits) + fixedFromNumber(1.25, bits)), "0"],
      bits,
      zoom,
    };
    const frame = buildRomanescoSurfaceFrame(camera, { rotationX: 65, rotationY: 28 });
    assert.ok(frame.chart?.active || frame.chart?.kind === "plane" || frame.chart?.residual);
    assert.ok(frame.rootData.every(Number.isFinite));
    if (frame.chart.residual) assert.ok(frame.chart.residual.data.every(Number.isFinite));
  }
});

test("adaptive reference records preserve the full fixed-point anchor", () => {
  const bits = 512;
  const anchor = [0.41, 0.32, 0.2].map((value) => fixedFromNumber(value, bits));
  const shallow = buildRomanescoSurfaceChart(anchor, bits, { workingScale: 1, residualData: true });
  const deep = buildRomanescoSurfaceChart(anchor, bits, {
    workingScale: 2 ** 240,
    residualData: true,
  });
  const error = shallow.fieldFixed - deep.fieldFixed;
  assert.ok((error < 0n ? -error : error) < 65536n);
  assert.ok(shallow.residual.orbits.side.count < deep.residual.orbits.side.count);
});
