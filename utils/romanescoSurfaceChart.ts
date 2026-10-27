import { rescaleFixed } from "./deepZoom/math";
import { createRomanescoPrecision } from "./romanescoPrecision";
import { ROMANESCO_SURFACE_MODEL, type RomanescoSurfaceOptions } from "./romanescoSurface";

type Vec3 = [number, number, number];
type Fixed3 = readonly [bigint, bigint, bigint];
type Jet = { value: bigint; gradient: Vec3; gradientBound: number; hessianBound: number };
type Pair = [Jet, Jet];

export type RomanescoChartFeature = {
  kind: "center" | "cell-edge" | "rim" | "carrier" | "intersection";
  path: string;
  level: number;
  /** Conservative distance to the feature in canonical root units. */
  distance: number;
};

export type RomanescoChartPatch = {
  path: string;
  level: number;
  point: readonly [bigint, bigint];
  radius: bigint;
  /** Integer cell address selected before entering this patch. */
  cell: readonly [bigint, bigint];
};

export type RomanescoSurfaceChartOptions = Omit<RomanescoSurfaceOptions, "pixel"> & {
  /** Canonical root units become working-frame units after this multiplication. */
  workingScale: number;
  /** Radius of the region to certify, measured in working-frame units. */
  workingRadius?: number;
  /** Maximum permitted Taylor remainder in working-frame units. */
  errorTolerance?: number;
  /** Zero matches the initial surface. .63 selects the bounded upward shear. */
  shear?: number;
  /** Include anchor records for the nonlinear residual shader. */
  residualData?: boolean | "fallback";
};

export type RomanescoSurfaceChart = {
  kind: "plane" | "active";
  bits: number;
  fieldFixed: bigint;
  /** Field at the anchor, divided by the working-frame length scale. */
  offset: number;
  gradient: Vec3;
  /** |actualField - (offset + dot(gradient, localPoint))| within workingRadius. */
  error: number;
  workingRadius: number;
  features: RomanescoChartFeature[];
  patches: RomanescoChartPatch[];
  active?: RomanescoActiveChart;
  /** A constant signed lower bound proves this entire chart contains no surface. */
  empty?: boolean;
  residual?: RomanescoResidualData;
};

export type RomanescoResidualData = {
  width: 20;
  height: number;
  data: Float32Array;
  anchor: Vec3;
  radial: number;
  heightAtAnchor: number;
  primaryHeight: number;
  amplitude: number;
  ringRadius: number;
  diskPoint: [number, number];
  rawSideWork: number;
  rawBottomWork: number;
  bottomUpperWork: number;
  yMinusOneWork: number;
  viewScale: number;
  rootUnit: [number, number];
  radialRatio: number;
  primaryRatio: number;
  angleTransports: [number, number, number];
  sideLogTransport: number;
  amplitudeOffsets: [number, number];
  deltaOffsets: [number, number, number];
  delta: number;
  shearCoefficient: number;
  shearOffsets: [number, number];
  orbits: {
    side: { row: number; count: number; inverseSigma: number };
    ring: { row: number; count: number; inverseSigma: number };
    bottom: { row: number; count: number; inverseSigma: number };
  };
};

/** Uniform layout consumed by romanesco-chart.frag; vectors use canonical axes. */
export type RomanescoActiveChart = {
  mode: 2 | 3 | 4;
  origin: Vec3;
  phase: [number, number];
  carrier: [number, number, number, number];
  weight: [number, number, number, number];
  qOffset: [number, number];
  qJacobian: [Vec3, Vec3];
  levels: number;
  firstRank: number;
  baseGrowth: number;
  localScale: number;
  error: number;
};

/**
 * High-precision anchor plus a certified smooth local chart. A cell edge, cone
 * tip, rim kink or solid intersection inside the requested region returns an
 * active chart instead of silently substituting a tangent plane there.
 */
export function buildRomanescoSurfaceChart(
  anchor: Fixed3,
  anchorBits: number,
  options: RomanescoSurfaceChartOptions,
): RomanescoSurfaceChart {
  const model = ROMANESCO_SURFACE_MODEL;
  const scale = options.workingScale;
  const workingRadius = options.workingRadius ?? 128;
  const tolerance = options.errorTolerance ?? 1e-5;
  if (
    !(scale > 0) ||
    !Number.isFinite(scale) ||
    !(workingRadius > 0) ||
    !Number.isFinite(workingRadius)
  )
    throw new RangeError("Surface chart scale and radius must be finite and positive.");
  if (!(tolerance > 0) || !Number.isFinite(tolerance))
    throw new RangeError("Surface chart tolerance must be finite and positive.");
  const bits = Math.max(192, anchorBits + 64);
  const fixed = createRomanescoPrecision(bits);
  const zero = BigInt(0),
    one = fixed.one;
  // Cube rounding uses an exactly equilateral lattice. A binary64 square-root
  // constant would introduce a tiny discontinuity on its diagonal cell edges.
  const sqrtThreeOverTwo = fixed.sqrt(BigInt(3) * one) / BigInt(2);
  const region = workingRadius / scale;
  const rounding = 2 ** (-bits + 20);
  const maxRank = options.maxRank ?? Infinity;
  const growth = Math.max(0, Math.min(1, options.growth ?? 1));
  const levels = options.levels ?? model.defaultLevels;
  const shear = options.shear ?? model.primaryShear;
  const forceResidual = options.residualData === true;
  if (
    !Number.isSafeInteger(levels) ||
    levels < 0 ||
    levels > 64 ||
    !(maxRank >= 0) ||
    !Number.isFinite(growth)
  )
    throw new RangeError("Invalid surface chart construction parameters.");
  if (options.residualData && levels > model.defaultLevels)
    throw new RangeError("Residual tables cannot exceed the surface model's maximum depth.");
  if (!Number.isFinite(shear) || shear < 0 || shear > 0.63)
    throw new RangeError("Surface chart shear must be between zero and .63.");
  const features: RomanescoChartFeature[] = [];
  const patches: RomanescoChartPatch[] = [];
  if (!forceResidual) {
    // This undecorated bicone is contained in every construction rank. A ball
    // certified inside it needs no polar coordinates or recursive anchor.
    const p = anchor.map((value) => rescaleFixed(value, anchorBits, bits));
    const r = fixed.hypot(p[0], p[2]),
      k = fixed.fromNumber(model.baseRadius),
      depth = fixed.fromNumber(model.baseDepth);
    const h = (one - p[1]) / BigInt(2),
      halfK = k / BigInt(2),
      slope = fixed.div(depth, k);
    const side = fixed.div(r - fixed.mul(k, h), fixed.sqrt(one + fixed.mul(halfK, halfK)));
    const bottom = fixed.div(
      -one - depth + fixed.mul(slope, r) - p[1],
      fixed.sqrt(one + fixed.mul(slope, slope)),
    );
    const core = [side, bottom, p[1] - one].reduce((a, b) => (a > b ? a : b));
    const work = fixed.toNumber(core) * scale;
    if (work < -workingRadius - 1)
      return {
        kind: "plane",
        bits,
        fieldFixed: core,
        offset: Math.max(-1e30, work + workingRadius),
        gradient: [0, 0, 0],
        error: 0,
        workingRadius,
        features,
        patches,
        empty: true,
      };
  }
  type ResidualRecord = {
    point: Pair;
    radius: Jet;
    rim: Jet;
    weight: Jet;
    base: Jet;
    rank: number;
    growth: number;
    circle: boolean;
    remaining: number;
  };
  const residualRecords: Record<string, ResidualRecord[]> = { side: [], ring: [], bottom: [] };
  const residualTails: Record<string, bigint> = { side: zero, ring: zero, bottom: zero };
  // The hex tail coefficient never exceeds .03. Resolve derivatives only while
  // that tail can affect this view; its fixed-point value is still evaluated to
  // the requested model depth. The circular seed is covered by maxAmplitude.
  const anchorY = fixed.toNumber(rescaleFixed(anchor[1], anchorBits, bits));
  const maxAmplitude = Math.max(0.5, model.reliefHeight * Math.max(0, (1 - anchorY + region) / 2));
  const tailRatio = 0.03;
  const resolvedLevels = Math.min(
    levels,
    Math.max(
      1,
      Math.ceil((Math.log(1e-8) - Math.log(scale) - Math.log(maxAmplitude)) / Math.log(tailRatio)),
    ),
  );
  // Side, ring and underside tails; ring-to-underside sensitivity is below one.
  const uniformTailBoundWork =
    resolvedLevels < levels ? 3 * maxAmplitude * scale * tailRatio ** resolvedLevels : 0;
  const sideCandidates: { point: Pair; prefix: Jet; weight: Jet; index: number; clean: boolean }[] =
    [];
  let path = "surface",
    level = 0;
  const number = fixed.toNumber;
  const constant = (value: number): Jet => ({
    value: fixed.fromNumber(value),
    gradient: [0, 0, 0],
    gradientBound: 0,
    hessianBound: 0,
  });
  const norm3 = (v: Vec3) => Math.hypot(...v);
  const sumGradient = (a: Vec3, b: Vec3, k = 1): Vec3 => a.map((v, i) => v + k * b[i]) as Vec3;
  const absMaximum = (a: Jet) => Math.abs(number(a.value)) + region * a.gradientBound;
  const feature = (kind: RomanescoChartFeature["kind"], gap: bigint, bound: number) => {
    const distance = bound > 0 ? Math.max(0, number(gap) - rounding) / bound : Infinity;
    if (!Number.isFinite(bound) || distance <= region)
      features.push({ kind, path, level, distance });
  };
  const add = (a: Jet, b: Jet): Jet => ({
    value: a.value + b.value,
    gradient: sumGradient(a.gradient, b.gradient),
    gradientBound: a.gradientBound + b.gradientBound,
    hessianBound: a.hessianBound + b.hessianBound,
  });
  const times = (a: Jet, k: number): Jet => ({
    value: fixed.mul(a.value, fixed.fromNumber(k)),
    gradient: a.gradient.map((v) => v * k) as Vec3,
    gradientBound: a.gradientBound * Math.abs(k),
    hessianBound: a.hessianBound * Math.abs(k),
  });
  const triangular = (a: Jet): Jet => ({
    ...times(a, model.sqrtThreeOverTwo),
    value: fixed.mul(a.value, sqrtThreeOverTwo),
  });
  const divideConstant = (a: Jet, k: number): Jet => ({
    ...times(a, 1 / k),
    value: fixed.div(a.value, fixed.fromNumber(k)),
  });
  const subtract = (a: Jet, b: Jet) => add(a, times(b, -1));
  const multiply = (a: Jet, b: Jet): Jet => {
    const av = number(a.value),
      bv = number(b.value),
      am = absMaximum(a),
      bm = absMaximum(b);
    return {
      value: fixed.mul(a.value, b.value),
      gradient: a.gradient.map((v, i) => v * bv + b.gradient[i] * av) as Vec3,
      gradientBound: am * b.gradientBound + bm * a.gradientBound,
      hessianBound:
        am * b.hessianBound + bm * a.hessianBound + 2 * a.gradientBound * b.gradientBound,
    };
  };
  const reciprocal = (a: Jet): Jet => {
    if (a.value === zero)
      return { ...constant(0), gradientBound: Infinity, hessianBound: Infinity };
    const av = number(a.value),
      lower = Math.abs(av) - region * a.gradientBound;
    if (lower <= 0) feature("center", a.value < zero ? -a.value : a.value, a.gradientBound);
    const inverse = 1 / Math.max(lower, Number.MIN_VALUE);
    return {
      value: fixed.div(one, a.value),
      gradient: a.gradient.map((v) => -v / (av * av)) as Vec3,
      gradientBound: inverse * inverse * a.gradientBound,
      hessianBound: inverse * inverse * a.hessianBound + 2 * inverse ** 3 * a.gradientBound ** 2,
    };
  };
  const divide = (a: Jet, b: Jet) => multiply(a, reciprocal(b));
  const norm = (values: Jet[]): Jet => {
    const value = fixed.hypot(...values.map((v) => v.value));
    const g = Math.hypot(...values.map((v) => v.gradientBound));
    const r = number(value),
      lower = r - region * g;
    if (lower <= rounding) feature("center", value, g);
    const gradient: Vec3 = [0, 0, 0];
    if (value !== zero)
      for (const v of values) {
        const coefficient = number(fixed.div(v.value, value));
        for (let i = 0; i < 3; i++) gradient[i] += coefficient * v.gradient[i];
      }
    return {
      value,
      gradient,
      gradientBound: g,
      hessianBound:
        (g * g) / Math.max(lower, Number.MIN_VALUE) +
        Math.hypot(...values.map((v) => v.hessianBound)),
    };
  };
  const log = (a: Jet): Jet => {
    if (a.value <= zero)
      throw new RangeError("Surface chart logarithm reached a nonpositive radius.");
    const av = number(a.value),
      lower = av - region * a.gradientBound;
    if (lower <= rounding) feature("center", a.value, a.gradientBound);
    const inverse = 1 / Math.max(lower, Number.MIN_VALUE);
    return {
      value: fixed.log(a.value),
      gradient: a.gradient.map((v) => v / av) as Vec3,
      gradientBound: inverse * a.gradientBound,
      hessianBound: inverse * a.hessianBound + inverse * inverse * a.gradientBound ** 2,
    };
  };
  const angle = (y: Jet, x: Jet): Jet => {
    const radius = fixed.hypot(x.value, y.value),
      r = number(radius);
    const g = Math.hypot(x.gradientBound, y.gradientBound),
      lower = r - region * g;
    if (lower <= rounding) feature("center", radius, g);
    const inverse = 1 / Math.max(lower, Number.MIN_VALUE);
    const xv = radius === zero ? 0 : number(fixed.div(x.value, radius));
    const yv = radius === zero ? 0 : number(fixed.div(y.value, radius));
    return {
      value: fixed.atan2(y.value, x.value),
      gradient: x.gradient.map((v, i) =>
        radius === zero ? 0 : (xv * y.gradient[i] - yv * v) / r,
      ) as Vec3,
      gradientBound: inverse * g,
      hessianBound:
        inverse * Math.hypot(x.hessianBound, y.hessianBound) + inverse * inverse * g * g,
    };
  };
  const choose = (a: Jet, b: Jet, maximum: boolean, kind: RomanescoChartFeature["kind"]): Jet => {
    const difference = a.value - b.value;
    const bound = a.gradientBound + b.gradientBound;
    if (bound > 0) feature(kind, difference < zero ? -difference : difference, bound);
    return difference >= zero === maximum ? a : b;
  };
  const maximum = (a: Jet, b: Jet, kind: RomanescoChartFeature["kind"] = "carrier") =>
    choose(a, b, true, kind);
  const minimum = (a: Jet, b: Jet, kind: RomanescoChartFeature["kind"] = "carrier") =>
    choose(a, b, false, kind);
  const absolute = (a: Jet): Jet => (a.value < zero ? times(a, -1) : a);
  const floor = (a: bigint) => (a >= zero ? a / one : -((-a + one - BigInt(1)) / one));
  const phaseAtScale = (localScale: bigint): [number, number] => {
    const u = -fixed.div(fixed.log(localScale), fixed.fromNumber(model.spiralDecay));
    return [model.latticeA, model.latticeB].map((coefficient) => {
      const value = fixed.mul(fixed.fromNumber(coefficient), u);
      return number(value - floor(value) * one);
    }) as [number, number];
  };
  const fold = (radius: Jet, theta: Jet): { point: Pair; cell: [bigint, bigint] } => {
    const u = divideConstant(times(log(radius), -1), model.spiralDecay);
    // Normalize by mathematical tau so the two atan2 branches identify exactly.
    const turn: Jet = {
      ...times(theta, 1 / (2 * Math.PI)),
      value: fixed.div(theta.value, fixed.tau),
    };
    const a = add(times(u, model.latticeA), times(turn, 13));
    const b = subtract(times(u, model.latticeB), times(turn, 8));
    const cube = [a.value, -b.value, -a.value + b.value];
    const rounded = cube.map((v) => floor(v + one / BigInt(2)));
    const errors = cube.map((v, i) => {
      const e = rounded[i] * one - v;
      return e < zero ? -e : e;
    });
    if (errors[0] > errors[1] && errors[0] > errors[2]) rounded[0] = -rounded[1] - rounded[2];
    else if (errors[1] > errors[2]) rounded[1] = -rounded[0] - rounded[2];
    else rounded[2] = -rounded[0] - rounded[1];
    const localA = { ...a, value: a.value - rounded[0] * one };
    const localB = { ...b, value: b.value + rounded[1] * one };
    const offset: Pair = [subtract(localA, times(localB, 0.5)), triangular(localB)];
    for (const projection of [
      offset[0],
      add(times(offset[0], 0.5), triangular(offset[1])),
      add(times(offset[0], -0.5), triangular(offset[1])),
    ])
      feature(
        "cell-edge",
        fixed.fromNumber(0.5) - (projection.value < zero ? -projection.value : projection.value),
        projection.gradientBound,
      );
    return {
      point: [divideConstant(offset[0], model.hexCover), divideConstant(offset[1], model.hexCover)],
      cell: [rounded[0], -rounded[1]],
    };
  };
  const hexRim = (point: Pair): Jet => {
    const x = times(point[0], model.hexCover),
      y = times(point[1], model.hexCover);
    const projections = [
      absolute(x),
      absolute(add(times(x, 0.5), triangular(y))),
      absolute(add(times(x, -0.5), triangular(y))),
    ];
    const sorted = [...projections].sort((a, b) =>
      a.value > b.value ? -1 : a.value < b.value ? 1 : 0,
    );
    let support = sorted[0];
    if (number(support.value) + region * support.gradientBound < 0.25) return constant(1);
    for (let i = 1; i < sorted.length; i++) support = maximum(support, sorted[i], "rim");
    return minimum(
      constant(1),
      maximum(constant(0), divideConstant(subtract(constant(0.5), support), model.rimWidth), "rim"),
      "rim",
    );
  };
  type FixedPair = [bigint, bigint];
  const scalarFold = (radius: bigint, theta: bigint): FixedPair => {
    const u = fixed.div(-fixed.log(radius), fixed.fromNumber(model.spiralDecay));
    const turn = fixed.div(theta, fixed.tau);
    const a = fixed.mul(u, fixed.fromNumber(model.latticeA)) + turn * BigInt(13);
    const b = fixed.mul(u, fixed.fromNumber(model.latticeB)) - turn * BigInt(8);
    const cube = [a, -b, -a + b];
    const rounded = cube.map((v) => floor(v + one / BigInt(2)));
    const errors = cube.map((v, i) => {
      const difference = rounded[i] * one - v;
      return difference < zero ? -difference : difference;
    });
    if (errors[0] > errors[1] && errors[0] > errors[2]) rounded[0] = -rounded[1] - rounded[2];
    else if (errors[1] > errors[2]) rounded[1] = -rounded[0] - rounded[2];
    else rounded[2] = -rounded[0] - rounded[1];
    const localA = a - rounded[0] * one;
    const localB = b + rounded[1] * one;
    return [
      fixed.div(
        localA - fixed.mul(localB, fixed.fromNumber(0.5)),
        fixed.fromNumber(model.hexCover),
      ),
      fixed.div(fixed.mul(localB, sqrtThreeOverTwo), fixed.fromNumber(model.hexCover)),
    ];
  };
  const scalarRim = (point: FixedPair): bigint => {
    const x = fixed.mul(point[0], fixed.fromNumber(model.hexCover));
    const y = fixed.mul(point[1], fixed.fromNumber(model.hexCover));
    const halfX = fixed.mul(x, fixed.fromNumber(0.5));
    const triangularY = fixed.mul(y, sqrtThreeOverTwo);
    const support = [x, halfX + triangularY, -halfX + triangularY]
      .map((v) => (v < zero ? -v : v))
      .reduce((a, b) => (a > b ? a : b));
    const rim = fixed.div(fixed.fromNumber(0.5) - support, fixed.fromNumber(model.rimWidth));
    return rim < zero ? zero : rim > one ? one : rim;
  };
  // No derivative bounds or feature collection below the visible tail cutoff.
  const scalarPatch = (initial: FixedPair, firstIndex: number): bigint => {
    let point = initial;
    let value = zero;
    let weight = one;
    for (let index = firstIndex; index < levels && index + 1 <= maxRank; index++) {
      const radius = fixed.hypot(...point);
      const clipped = radius < one ? radius : one;
      const g = index + 1 === maxRank ? fixed.fromNumber(growth) : one;
      value += fixed.mul(weight, fixed.mul(one - clipped, g));
      weight = fixed.mul(
        weight,
        fixed.mul(fixed.mul(clipped, scalarRim(point)), fixed.fromNumber(model.patchEpsilon)),
      );
      if (radius === zero || weight === zero || index + 1 >= levels) break;
      point = scalarFold(clipped, fixed.atan2(point[1], point[0]));
    }
    return value;
  };
  const patch = (
    initial: { point: Pair; cell: [bigint, bigint] },
    name: string,
    outerAmplitude: Jet = constant(1),
  ): Jet => {
    let current = initial,
      value = constant(0),
      weight = constant(1);
    for (let index = 0; index < resolvedLevels; index++) {
      const rank = index + 1;
      if (rank > maxRank) break;
      path = name;
      level = index;
      if (name === "side")
        sideCandidates.push({
          point: current.point,
          prefix: value,
          weight,
          index,
          clean: features.length === 0,
        });
      const radius = norm(current.point);
      patches.push({
        path,
        level,
        point: [current.point[0].value, current.point[1].value],
        radius: radius.value,
        cell: current.cell,
      });
      const clipped = minimum(radius, constant(1), "rim");
      const g = rank === maxRank ? growth : 1;
      const base = subtract(constant(1), clipped),
        rim = hexRim(current.point);
      if (options.residualData)
        residualRecords[name].push({
          point: current.point,
          radius,
          rim,
          weight: multiply(outerAmplitude, weight),
          base,
          rank,
          growth: g,
          circle: false,
          remaining: levels - index - 1,
        });
      value = add(value, multiply(weight, times(base, g)));
      weight = multiply(weight, times(multiply(clipped, rim), model.patchEpsilon));
      if (radius.value === zero || (weight.value === zero && !options.residualData)) break;
      if (rank >= maxRank || index + 1 >= levels) break;
      if (index + 1 >= resolvedLevels) {
        if (index + 1 < levels && rank < maxRank) {
          const tail = scalarPatch(
            scalarFold(clipped.value, fixed.atan2(current.point[1].value, current.point[0].value)),
            index + 1,
          );
          residualTails[name] = tail;
          value = { ...value, value: value.value + fixed.mul(weight.value, tail) };
        }
        break;
      }
      level = index + 1;
      current = fold(clipped, angle(current.point[1], current.point[0]));
    }
    return value;
  };
  const point = anchor.map((v, i) => ({
    value: rescaleFixed(v, anchorBits, bits),
    gradient: [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0] as Vec3,
    gradientBound: 1,
    hessianBound: 0,
  })) as [Jet, Jet, Jet];
  const [x, y, z] = point;
  const radial = norm([x, z]),
    theta = angle(z, x);
  const h = maximum(constant(0), times(subtract(constant(1), y), 0.5));
  const amplitude = times(minimum(h, divideConstant(radial, model.baseRadius)), model.reliefHeight);
  let chartH = h;
  let primaryC = constant(0),
    primaryDelta = constant(0);
  if (shear > 0) {
    const h2 = multiply(h, h),
      c = times(maximum(constant(0), subtract(constant(1), multiply(h2, h2))), shear);
    const delta = minimum(
      maximum(subtract(radial, times(h, model.baseRadius)), constant(0)),
      times(h, model.reliefHeight),
    );
    primaryC = c;
    primaryDelta = delta;
    chartH = add(h, multiply(c, delta));
  }
  let top = constant(0);
  path = "side";
  level = 0;
  if (maxRank >= 1 && amplitude.value > zero && chartH.value > zero)
    top = patch(fold(chartH, theta), "side", amplitude);
  path = "surface";
  level = 0;
  const sideDivisor = shear > 0 ? 2.75 : model.sideLipschitz;
  const rawSide = subtract(subtract(radial, times(h, model.baseRadius)), multiply(amplitude, top));
  const side = divideConstant(rawSide, sideDivisor);
  // Hdisk >= 0, so this upper bound proves the underside cannot win anywhere
  // in the chart. Unlike testing only the anchor sign, it is valid on the ball.
  const bottomUpper = (-1 - number(y.value) + region) / model.bottomLipschitz;
  const sideLower =
    number(side.value) - region * side.gradientBound - (2 * uniformTailBoundWork) / scale;
  let bottom = constant(-1e30);
  let rawBottom = constant(-1e30),
    residualRing = constant(model.baseRadius),
    residualDisk: Pair = [constant(0), constant(0)];
  let bottomEvaluated = false;
  const evaluateBottom = () => {
    bottomEvaluated = true;
    let ring = constant(model.baseRadius);
    path = "ring";
    level = 0;
    if (maxRank >= 1)
      ring = add(
        ring,
        times(
          patch(fold(constant(1), theta), "ring", constant(model.reliefHeight)),
          model.reliefHeight,
        ),
      );
    const disk: Pair = [divide(x, ring), divide(z, ring)];
    residualRing = ring;
    residualDisk = disk;
    path = "bottom";
    level = 0;
    const r = norm(disk);
    let depth = maximum(constant(0), subtract(constant(1), r), "rim");
    const rim = minimum(constant(1), times(depth, 1 / model.rimWidth), "rim");
    const weight = times(multiply(r, rim), model.patchEpsilon);
    if (options.residualData)
      residualRecords.bottom.push({
        point: disk,
        radius: r,
        rim,
        weight: constant(model.baseDepth),
        base: depth,
        rank: 0,
        growth: 1,
        circle: true,
        remaining: levels,
      });
    if (maxRank >= 1 && r.value > zero && (weight.value !== zero || options.residualData))
      depth = add(
        depth,
        multiply(
          weight,
          patch(fold(r, angle(disk[1], disk[0])), "bottom", times(weight, model.baseDepth)),
        ),
      );
    rawBottom = subtract(subtract(constant(-1), times(depth, model.baseDepth)), y);
    bottom = divideConstant(rawBottom, model.bottomLipschitz);
  };
  if (forceResidual || !(sideLower > bottomUpper)) evaluateBottom();
  path = "surface";
  level = 0;
  const field = maximum(
    subtract(y, constant(1)),
    maximum(side, bottom, "intersection"),
    "intersection",
  );
  const error =
    (0.500001 * field.hessianBound * region * region + rounding) * scale +
    1e-12 * (1 + norm3(field.gradient)) * workingRadius +
    2 * uniformTailBoundWork;
  const finite =
    Number.isFinite(error) &&
    field.gradient.every(Number.isFinite) &&
    Number.isFinite(norm3(field.gradient));
  const anchorDistance = number(field.value) * scale;
  if (!forceResidual && Math.abs(anchorDistance) > workingRadius + 1e-5)
    return {
      kind: "plane",
      bits,
      fieldFixed: field.value,
      offset: Math.sign(anchorDistance) * Math.min(1e30, Math.abs(anchorDistance) - workingRadius),
      gradient: [0, 0, 0],
      error: 0,
      workingRadius,
      features,
      patches,
      empty: true,
    };
  let active: RomanescoActiveChart | undefined;
  const viewScale = fixed.div(one, fixed.fromNumber(scale));
  const apexOrigin: Vec3 = [
    number(x.value) * scale,
    number(y.value - one) * scale,
    number(z.value) * scale,
  ];
  const apexReach = norm3(apexOrigin) + workingRadius;
  if (norm3(apexOrigin) <= 4 * workingRadius && apexReach / scale < 0.001) {
    // In this chart h is tiny. Replacing c(h) by c(0) changes the raw side
    // field by O(h^5); keep the resulting bound in working units.
    const apexError =
      (2 * model.reliefHeight ** 2 * shear * 1.878 * 5.625 * apexReach ** 5) / scale ** 4 + 2e-6;
    if (apexError <= tolerance)
      active = {
        mode: 2,
        origin: apexOrigin,
        phase: phaseAtScale(viewScale),
        carrier: [0, 0, 0, 0],
        weight: [0, 0, 0, 0],
        qOffset: [0, 0],
        qJacobian: [
          [0, 0, 0],
          [0, 0, 0],
        ],
        levels,
        firstRank: 1,
        baseGrowth: 1,
        localScale: 1 / scale,
        error: apexError,
      };
  }
  const bottomOrigin: Vec3 = [
    number(x.value) * scale,
    number(y.value + one + fixed.fromNumber(model.baseDepth)) * scale,
    number(z.value) * scale,
  ];
  if (
    !active &&
    norm3(bottomOrigin) <= 4 * workingRadius &&
    (norm3(bottomOrigin) + workingRadius) / scale < 0.001
  )
    active = {
      mode: 4,
      origin: bottomOrigin,
      phase: phaseAtScale(viewScale),
      carrier: [0, 0, 0, 0],
      weight: [0, 0, 0, 0],
      qOffset: [0, 0],
      qJacobian: [
        [0, 0, 0],
        [0, 0, 0],
      ],
      levels,
      firstRank: 1,
      baseGrowth: 1,
      localScale: 1 / scale,
      error: 2e-6,
    };
  if (!active && number(y.value) > -1 + 4 * region)
    for (const candidate of sideCandidates) {
      if (!candidate.clean) continue;
      const q = candidate.point;
      const qRadius = fixed.hypot(q[0].value, q[1].value);
      const qBound = Math.hypot(q[0].gradientBound, q[1].gradientBound);
      const qHessian = Math.hypot(q[0].hessianBound, q[1].hessianBound);
      if (
        !Number.isFinite(qHessian) ||
        number(qRadius) > 4 * qBound * region ||
        number(qRadius) + qBound * region >= 0.1
      )
        continue;
      const rank = candidate.index + 1,
        g = rank === maxRank ? growth : 1;
      const carrier = subtract(
        subtract(radial, times(h, model.baseRadius)),
        multiply(amplitude, add(candidate.prefix, times(candidate.weight, g))),
      );
      const weight = multiply(amplitude, candidate.weight);
      const sigma =
        2 ** Math.ceil(Math.log2(Math.max(1, norm3(q[0].gradient), norm3(q[1].gradient))));
      const localScale = fixed.mul(viewScale, fixed.fromNumber(sigma));
      const divisor = 3;
      const activeError =
        ((0.500001 *
          (carrier.hessianBound +
            2 * absMaximum(weight) * qHessian +
            2 * weight.gradientBound * qBound) *
          region *
          region +
          rounding) *
          scale) /
          divisor +
        2e-6;
      if (!(activeError <= tolerance)) continue;
      active = {
        mode: 3,
        origin: [0, 0, 0],
        phase: phaseAtScale(localScale),
        carrier: [
          (number(carrier.value) * scale) / divisor,
          ...carrier.gradient.map((v) => v / divisor),
        ] as [number, number, number, number],
        weight: [
          (number(weight.value) * sigma) / divisor,
          ...weight.gradient.map((v) => (v * number(localScale)) / divisor),
        ] as [number, number, number, number],
        qOffset: [
          number(fixed.div(q[0].value, localScale)),
          number(fixed.div(q[1].value, localScale)),
        ],
        qJacobian: [
          q[0].gradient.map((v) => v / sigma) as Vec3,
          q[1].gradient.map((v) => v / sigma) as Vec3,
        ],
        levels: Math.max(0, levels - candidate.index - 1),
        firstRank: candidate.index + 2,
        baseGrowth: g,
        localScale: number(localScale),
        error: activeError,
      };
      break;
    }
  if (
    !active &&
    maxRank >= 1 &&
    levels > 0 &&
    number(h.value) > 4 * region &&
    number(h.value) < 1 - 4 * region &&
    number(y.value) > -1 + 4 * region
  ) {
    // Near a primary peak, use the smooth interior extension of the shear.
    // Outside the outer carrier C>0, so extending this chart does not add zeros.
    const savedFeatures = features.length;
    path = "primary-chart";
    level = 0;
    const h2 = multiply(h, h);
    const c = times(subtract(constant(1), multiply(h2, h2)), shear);
    const unboundedChart = add(h, multiply(c, subtract(radial, times(h, model.baseRadius))));
    if (unboundedChart.value > zero) {
      const q = fold(unboundedChart, theta).point;
      const qRadius = fixed.hypot(q[0].value, q[1].value);
      const qBound = Math.hypot(q[0].gradientBound, q[1].gradientBound);
      const qHessian = Math.hypot(q[0].hessianBound, q[1].hessianBound);
      const growthAtPeak = maxRank === 1 ? growth : 1;
      const carrier = subtract(
        radial,
        times(h, model.baseRadius + model.reliefHeight * growthAtPeak),
      );
      const weight = times(h, model.reliefHeight);
      const aboveCore = subtract(radial, times(h, model.baseRadius));
      // The whole chart lies in the central constant-rim region of this cell.
      const qMaximum = number(qRadius) + qBound * region;
      const conditioned =
        features.length === savedFeatures &&
        Number.isFinite(qHessian) &&
        number(qRadius) <= 4 * qBound * region &&
        qMaximum < 0.1 &&
        number(aboveCore.value) > aboveCore.gradientBound * region;
      if (conditioned) {
        const sigma =
          2 ** Math.ceil(Math.log2(Math.max(1, norm3(q[0].gradient), norm3(q[1].gradient))));
        const localScale = fixed.mul(viewScale, fixed.fromNumber(sigma));
        const divisor = 3;
        const weightMaximum = absMaximum(weight);
        const activeError =
          ((0.500001 *
            (carrier.hessianBound +
              2 * weightMaximum * qHessian +
              2 * weight.gradientBound * qBound) *
            region *
            region +
            rounding) *
            scale) /
            divisor +
          2e-6;
        if (activeError <= tolerance)
          active = {
            mode: 3,
            origin: [0, 0, 0],
            phase: phaseAtScale(localScale),
            carrier: [
              (number(carrier.value) * scale) / divisor,
              ...carrier.gradient.map((v) => v / divisor),
            ] as [number, number, number, number],
            weight: [
              (number(weight.value) * sigma) / divisor,
              ...weight.gradient.map((v) => (v * number(localScale)) / divisor),
            ] as [number, number, number, number],
            qOffset: [
              number(fixed.div(q[0].value, localScale)),
              number(fixed.div(q[1].value, localScale)),
            ],
            qJacobian: [
              q[0].gradient.map((v) => v / sigma) as Vec3,
              q[1].gradient.map((v) => v / sigma) as Vec3,
            ],
            levels: Math.max(0, levels - 1),
            firstRank: 2,
            baseGrowth: growthAtPeak,
            localScale: number(localScale),
            error: activeError,
          };
      }
    }
  }
  let residual: RomanescoResidualData | undefined;
  const smoothPlane = features.length === 0 && finite && error <= tolerance;
  const needsResidual =
    forceResidual || (options.residualData === "fallback" && !active && !smoothPlane);
  if (needsResidual) {
    if (!bottomEvaluated) evaluateBottom();
    const tableHeight = 3 * model.defaultLevels + 1;
    const data = new Float32Array(20 * tableHeight * 4);
    const bounded = (value: number) =>
      Number.isNaN(value) ? 0 : Math.max(-1e30, Math.min(1e30, value));
    const write = (row: number, texel: number, values: number[]) =>
      values.forEach((value, component) => {
        data[(row * 20 + texel) * 4 + component] = bounded(value);
      });
    const work = (value: bigint) => bounded(number(value) * scale);
    const coordinates = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
    ];
    const normals = [
      [one, zero],
      [-one, zero],
      [one / BigInt(2), sqrtThreeOverTwo],
      [-one / BigInt(2), -sqrtThreeOverTwo],
      [-one / BigInt(2), sqrtThreeOverTwo],
      [one / BigInt(2), -sqrtThreeOverTwo],
    ];
    const starts: Record<string, number> = {
      side: 0,
      ring: model.defaultLevels,
      bottom: 2 * model.defaultLevels,
    };
    const orbitHeaders: Record<string, { row: number; count: number; inverseSigma: number }> = {};
    for (const name of ["side", "ring", "bottom"]) {
      const records = residualRecords[name];
      const sigmas = records.map((record) => {
        const size = Math.max(1, norm3(record.point[0].gradient), norm3(record.point[1].gradient));
        return Number.isFinite(size) ? 2 ** Math.ceil(Math.log2(size)) : 1e30;
      });
      const heights: bigint[] = Array(records.length + 1).fill(zero);
      heights[records.length] = residualTails[name];
      const betas = records.map((record) =>
        fixed.mul(
          fixed.fromNumber(model.patchEpsilon),
          fixed.mul(record.radius.value, record.rim.value),
        ),
      );
      for (let index = records.length - 1; index >= 0; index--)
        heights[index] =
          fixed.mul(records[index].base.value, fixed.fromNumber(records[index].growth)) +
          fixed.mul(betas[index], heights[index + 1]);
      records.forEach((record, index) => {
        const row = starts[name] + index;
        if (row >= tableHeight) return;
        const sigma = sigmas[index],
          localScale = fixed.mul(viewScale, fixed.fromNumber(sigma));
        const scaled = (value: bigint) => bounded(number(fixed.div(value, localScale)));
        const radius = number(record.radius.value),
          rim = number(record.rim.value),
          amplitude = number(record.weight.value);
        const q: [bigint, bigint] = [record.point[0].value, record.point[1].value];
        const anchorSquare = q[0] * q[0] + q[1] * q[1];
        const squaredGaps: number[] = [],
          supportGaps: number[] = [];
        for (const [da, db] of coordinates) {
          const jumpX = fixed.div(
            fixed.fromNumber(da - 0.5 * db),
            fixed.fromNumber(model.hexCover),
          );
          const jumpY = fixed.div(sqrtThreeOverTwo * BigInt(db), fixed.fromNumber(model.hexCover));
          const neighbor = [q[0] - jumpX, q[1] - jumpY];
          const squareDifference =
            neighbor[0] * neighbor[0] + neighbor[1] * neighbor[1] - anchorSquare;
          // Raw squared integers retain a deep edge gap before dividing by s_i.
          squaredGaps.push(bounded(number(squareDifference / localScale)));
          for (const [nx, ny] of normals) {
            const projection = fixed.mul(
              fixed.fromNumber(model.hexCover),
              fixed.mul(nx, neighbor[0]) + fixed.mul(ny, neighbor[1]),
            );
            supportGaps.push(
              scaled(
                fixed.fromNumber(0.5) -
                  projection -
                  fixed.mul(fixed.fromNumber(model.rimWidth), record.rim.value),
              ),
            );
          }
        }
        const tail = fixed.mul(record.weight.value, betas[index]);
        write(row, 0, [number(q[0]), number(q[1]), radius, rim]);
        write(row, 1, [
          work(record.weight.value),
          amplitude * sigma,
          number(localScale),
          radius > 0 ? number(localScale) / radius : 0,
        ]);
        write(row, 2, [
          radius > 0 && index + 1 < records.length ? sigma / (radius * sigmas[index + 1]) : 0,
          work(tail),
          number(heights[index + 1]),
          number(record.base.value),
        ]);
        write(row, 3, squaredGaps.slice(0, 4));
        write(row, 4, [...squaredGaps.slice(4), scaled(one - record.radius.value)]);
        for (let texel = 0; texel < 11; texel++)
          write(row, 5 + texel, supportGaps.slice(texel * 4, texel * 4 + 4));
        const phase = phaseAtScale(localScale);
        const centerSafe =
          radius +
            region * Math.hypot(record.point[0].gradientBound, record.point[1].gradientBound) <
          0.1;
        const exactZeroTail = record.radius.value === zero || record.rim.value === zero;
        write(row, 16, [
          phase[0],
          phase[1],
          record.rank,
          (record.circle ? 1 : 0) + (centerSafe ? 2 : 0) + (exactZeroTail ? 4 : 0),
        ]);
        write(row, 17, [1 / sigma, record.growth, record.remaining, number(heights[index])]);
        write(row, 18, [
          scaled(-record.rim.value),
          scaled(one - record.rim.value),
          scaled(
            one -
              record.radius.value -
              fixed.mul(fixed.fromNumber(model.rimWidth), record.rim.value),
          ),
          number(betas[index]),
        ]);
        write(row, 19, [
          scaled(q[0]),
          scaled(q[1]),
          record.radius.value === zero ? 0 : number(fixed.div(q[0], record.radius.value)),
          record.radius.value === zero ? 0 : number(fixed.div(q[1], record.radius.value)),
        ]);
      });
      orbitHeaders[name] = {
        row: starts[name],
        count: records.length,
        inverseSigma: 1 / (sigmas[0] ?? 1),
      };
    }
    const h4 = fixed.mul(fixed.mul(h.value, h.value), fixed.mul(h.value, h.value));
    const transport = (radius: bigint, inverseSigma: number) =>
      radius === zero ? 0 : number(fixed.div(fixed.fromNumber(inverseSigma), radius));
    residual = {
      width: 20,
      height: tableHeight,
      data,
      anchor: [number(x.value), number(y.value), number(z.value)],
      radial: number(radial.value),
      heightAtAnchor: number(h.value),
      primaryHeight: number(chartH.value),
      amplitude: number(amplitude.value),
      ringRadius: number(residualRing.value),
      diskPoint: [number(residualDisk[0].value), number(residualDisk[1].value)],
      rawSideWork: work(rawSide.value),
      rawBottomWork: work(rawBottom.value),
      bottomUpperWork: work(-one - y.value),
      yMinusOneWork: work(y.value - one),
      viewScale: number(viewScale),
      rootUnit: [
        radial.value === zero ? 0 : number(fixed.div(x.value, radial.value)),
        radial.value === zero ? 0 : number(fixed.div(z.value, radial.value)),
      ],
      radialRatio: radial.value === zero ? 0 : number(fixed.div(viewScale, radial.value)),
      primaryRatio: chartH.value === zero ? 0 : number(fixed.div(viewScale, chartH.value)),
      angleTransports: [
        transport(radial.value, orbitHeaders.side.inverseSigma),
        transport(radial.value, orbitHeaders.ring.inverseSigma),
        transport(radial.value, orbitHeaders.bottom.inverseSigma),
      ],
      sideLogTransport: transport(chartH.value, orbitHeaders.side.inverseSigma),
      amplitudeOffsets: [
        work(fixed.mul(fixed.fromNumber(model.reliefHeight), h.value) - amplitude.value),
        work(
          fixed.mul(
            fixed.fromNumber(model.reliefHeight),
            fixed.div(radial.value, fixed.fromNumber(model.baseRadius)),
          ) - amplitude.value,
        ),
      ],
      deltaOffsets: [
        work(
          radial.value -
            fixed.mul(fixed.fromNumber(model.baseRadius), h.value) -
            primaryDelta.value,
        ),
        work(-primaryDelta.value),
        work(fixed.mul(fixed.fromNumber(model.reliefHeight), h.value) - primaryDelta.value),
      ],
      delta: number(primaryDelta.value),
      shearCoefficient: number(primaryC.value),
      shearOffsets: [
        work(fixed.mul(fixed.fromNumber(shear), one - h4) - primaryC.value),
        work(-primaryC.value),
      ],
      orbits: orbitHeaders as RomanescoResidualData["orbits"],
    };
  }
  return {
    kind: active || !smoothPlane ? "active" : "plane",
    bits,
    fieldFixed: field.value,
    offset: Math.max(-1e30, Math.min(1e30, number(field.value) * scale)),
    gradient: field.gradient,
    error: active ? active.error + 2 * uniformTailBoundWork : error,
    workingRadius,
    features,
    patches,
    active,
    residual,
  };
}

/** Build the complete three-orbit anchor table only when the simpler chart fails. */
export function buildRomanescoResidualData(
  anchor: Fixed3,
  anchorBits: number,
  options: RomanescoSurfaceChartOptions,
): RomanescoResidualData {
  const result = buildRomanescoSurfaceChart(anchor, anchorBits, { ...options, residualData: true });
  if (!result.residual) throw new Error("Romanesco residual anchor table was not produced.");
  return result.residual;
}
