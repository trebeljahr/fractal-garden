/** Camera coordinates retain all bits needed to distinguish neighbouring pixels. */
export const MAX_DEPTH_BITS = 16384;
export const GUARD_BITS = 128;
export const MAX_PRECISION_BITS = MAX_DEPTH_BITS + GUARD_BITS;
export const MAX_VIEW_COORDINATE = 1_000_000;

export type FloatExp = [mantissa: number, exponent: number];
export type DeepViewport = {
  x: bigint;
  y: bigint;
  bits: number;
  /** log2 of the half-span: smaller values mean a closer view. */
  logZoom: number;
};
export type SerializedViewport = {
  kind: "deep-zoom";
  x: string;
  y: string;
  bits: number;
  logZoom: number;
};

const ZERO = BigInt(0);
const ONE = BigInt(1);
const floatBytes = new DataView(new ArrayBuffer(8));

function finite(value: number) {
  if (!Number.isFinite(value)) throw new Error("Invalid view coordinate.");
  return value;
}

export function precisionForZoom(logZoom: number) {
  finite(logZoom);
  if (logZoom < -MAX_DEPTH_BITS || logZoom > 20)
    throw new Error("Zoom exceeds the supported range.");
  return Math.max(GUARD_BITS, Math.ceil(-logZoom) + GUARD_BITS);
}

export function rescaleFixed(value: bigint, fromBits: number, toBits: number) {
  const shift = toBits - fromBits;
  if (shift >= 0) return value << BigInt(shift);
  // Truncate symmetrically: signed BigInt shifts otherwise round towards -infinity.
  return value < ZERO ? -(-value >> BigInt(-shift)) : value >> BigInt(-shift);
}

/** Exact conversion of a finite binary64 input, truncated only beyond `bits`. */
export function fixedFromNumber(value: number, bits: number): bigint {
  finite(value);
  if (value === 0) return ZERO;
  floatBytes.setFloat64(0, value);
  const high = floatBytes.getUint32(0);
  const low = floatBytes.getUint32(4);
  const exponent = (high >>> 20) & 0x7ff;
  let mantissa = (BigInt(high & 0xfffff) << BigInt(32)) | BigInt(low);
  let power = -1074;
  if (exponent !== 0) {
    mantissa |= ONE << BigInt(52);
    power = exponent - 1075;
  }
  const shift = bits + power;
  const result = shift >= 0 ? mantissa << BigInt(shift) : mantissa >> BigInt(-shift);
  return high >>> 31 ? -result : result;
}

function powerOfTen(exponent: number) {
  let result = ONE;
  let base = BigInt(10);
  for (let n = exponent; n > 0; n = Math.floor(n / 2)) {
    if (n % 2) result *= base;
    base *= base;
  }
  return result;
}

/** Decimal strings go directly to integers; they never pass through Number. */
export function fixedFromDecimal(value: string, bits: number): bigint {
  if (value.length > 6000) throw new Error("View coordinate is too long.");
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d{1,5}))?$/.exec(value);
  if (!match) throw new Error("Invalid view coordinate.");
  const fraction = match[3] ?? "";
  const power = Number(match[4] ?? 0) - fraction.length;
  if (Math.abs(power) > 6000) throw new Error("View coordinate exceeds the supported range.");
  const digits = BigInt(match[2] + fraction);
  const scale = ONE << BigInt(bits);
  const magnitude =
    power >= 0 ? digits * powerOfTen(power) * scale : (digits * scale) / powerOfTen(-power);
  return match[1] === "-" ? -magnitude : magnitude;
}

function bitLength(value: bigint) {
  const hex = value.toString(16);
  return (hex.length - 1) * 4 + Math.floor(Math.log2(Number.parseInt(hex[0], 16))) + 1;
}

/** An independent exponent for each component prevents small imaginary parts vanishing. */
export function fixedToFloatExp(value: bigint, bits: number): FloatExp {
  if (value === ZERO) return [0, 0];
  const negative = value < ZERO;
  const magnitude = negative ? -value : value;
  const length = bitLength(magnitude);
  const drop = Math.max(0, length - 53);
  const top = Number(magnitude >> BigInt(drop));
  let mantissa = Math.fround(top / 2 ** (length - drop - 1));
  let exponent = length - 1 - bits;
  if (mantissa === 2) {
    mantissa = 1;
    exponent += 1;
  }
  return [negative ? -mantissa : mantissa, exponent];
}

export function numberToFloatExp(value: number): FloatExp {
  finite(value);
  if (value === 0) return [0, 0];
  const exponent = Math.min(1023, Math.floor(Math.log2(Math.abs(value))));
  let mantissa = Math.fround(value / 2 ** exponent);
  if (Math.abs(mantissa) >= 2) {
    mantissa /= 2;
    return [mantissa, exponent + 1];
  }
  return [mantissa, exponent];
}

export function scaleToFloatExp(logZoom: number): FloatExp {
  finite(logZoom);
  const exponent = Math.floor(logZoom);
  const mantissa = Math.fround(2 ** (logZoom - exponent));
  return mantissa === 2 ? [1, exponent + 1] : [mantissa, exponent];
}

/** A small screen-space offset scaled without ever constructing 2^logZoom. */
export function fixedOffset(normalized: number, logZoom: number, bits: number) {
  finite(normalized);
  const exponent = Math.floor(logZoom);
  return fixedFromNumber(normalized * 2 ** (logZoom - exponent), bits + exponent);
}

function checkCoordinates(view: DeepViewport) {
  const limit = BigInt(MAX_VIEW_COORDINATE) << BigInt(view.bits);
  if (view.x < -limit || view.x > limit || view.y < -limit || view.y > limit) {
    throw new Error("View coordinate exceeds the supported range.");
  }
  return view;
}

export function createViewportAtLog(
  center: [number | string, number | string],
  logZoom: number,
): DeepViewport {
  const bits = precisionForZoom(logZoom);
  const convert = (value: number | string) =>
    typeof value === "string" ? fixedFromDecimal(value, bits) : fixedFromNumber(value, bits);
  return checkCoordinates({ x: convert(center[0]), y: convert(center[1]), bits, logZoom });
}

export function createViewport(center: [number | string, number | string], zoomSize: number) {
  if (!Number.isFinite(zoomSize) || zoomSize <= 0) throw new Error("Invalid zoom position.");
  return createViewportAtLog(center, Math.log2(zoomSize));
}

export function cloneViewport(view: DeepViewport): DeepViewport {
  return { ...view };
}

/** Pan by a signed offset measured in viewport half-spans. */
export function moveViewport(view: DeepViewport, dx: number, dy: number): DeepViewport {
  return checkCoordinates({
    ...view,
    x: view.x + fixedOffset(dx, view.logZoom, view.bits),
    y: view.y + fixedOffset(dy, view.logZoom, view.bits),
  });
}

/** Keep the world point beneath the normalized pointer fixed while zooming. */
export function zoomViewport(
  view: DeepViewport,
  nextLogZoom: number,
  anchorX = 0,
  anchorY = 0,
): DeepViewport {
  const bits = Math.max(view.bits, precisionForZoom(nextLogZoom));
  return checkCoordinates({
    x:
      rescaleFixed(view.x, view.bits, bits) +
      fixedOffset(anchorX, view.logZoom, bits) -
      fixedOffset(anchorX, nextLogZoom, bits),
    y:
      rescaleFixed(view.y, view.bits, bits) +
      fixedOffset(anchorY, view.logZoom, bits) -
      fixedOffset(anchorY, nextLogZoom, bits),
    bits,
    logZoom: nextLogZoom,
  });
}

export function serializeViewport(view: DeepViewport): SerializedViewport {
  return {
    kind: "deep-zoom",
    x: view.x.toString(16),
    y: view.y.toString(16),
    bits: view.bits,
    logZoom: view.logZoom,
  };
}

export function deserializeViewport(saved: unknown, maxZoomSize = 4): DeepViewport {
  if (!saved || typeof saved !== "object") throw new Error("Invalid zoom position.");
  const value = saved as Record<string, unknown>;
  if (value.kind === "deep-zoom") {
    const { bits, logZoom, x, y } = value;
    if (
      typeof bits !== "number" ||
      !Number.isInteger(bits) ||
      bits < GUARD_BITS ||
      bits > MAX_PRECISION_BITS ||
      typeof logZoom !== "number" ||
      !Number.isFinite(logZoom) ||
      logZoom < -MAX_DEPTH_BITS ||
      logZoom > Math.log2(maxZoomSize) ||
      bits < precisionForZoom(logZoom) ||
      typeof x !== "string" ||
      typeof y !== "string" ||
      !/^-?[\da-f]+$/i.test(x) ||
      !/^-?[\da-f]+$/i.test(y) ||
      x.length > Math.ceil((bits + 20) / 4) + 1 ||
      y.length > Math.ceil((bits + 20) / 4) + 1
    ) {
      throw new Error("Invalid zoom position.");
    }
    const parse = (hex: string) =>
      hex.startsWith("-") ? -BigInt(`0x${hex.slice(1)}`) : BigInt(`0x${hex}`);
    return checkCoordinates({ x: parse(x), y: parse(y), bits, logZoom });
  }
  if (
    !Array.isArray(value.center) ||
    value.center.length !== 2 ||
    !value.center.every(
      (n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= MAX_VIEW_COORDINATE,
    ) ||
    typeof value.zoomSize !== "number" ||
    !Number.isFinite(value.zoomSize) ||
    value.zoomSize <= 0 ||
    value.zoomSize > maxZoomSize
  ) {
    throw new Error("Invalid zoom position.");
  }
  return createViewport(value.center as [number, number], value.zoomSize);
}

export function viewportDelta(view: DeepViewport, reference: DeepViewport) {
  const bits = Math.max(view.bits, reference.bits);
  return {
    x: fixedToFloatExp(
      rescaleFixed(view.x, view.bits, bits) - rescaleFixed(reference.x, reference.bits, bits),
      bits,
    ),
    y: fixedToFloatExp(
      rescaleFixed(view.y, view.bits, bits) - rescaleFixed(reference.y, reference.bits, bits),
      bits,
    ),
    scale: scaleToFloatExp(view.logZoom),
  };
}
