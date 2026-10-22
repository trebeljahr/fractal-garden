export const SHARE_VERSION = 1;
export const MAX_SHARE_LENGTH = 24000;
export const CAPTURE_VIEW = "garden:capture-view";
export type CaptureRequest = { parts: Record<string, unknown>; pending: Promise<void>[] };

export type SharedView = {
  version: number;
  path: string;
  parts: Record<string, unknown>;
};

export type ControlRule = {
  path: string;
  kind: "number" | "color" | "select" | "boolean";
  min?: number;
  max?: number;
  options?: readonly string[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function finite(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function encodeView(path: string, parts: Record<string, unknown>) {
  const json = JSON.stringify({ version: SHARE_VERSION, path, parts });
  const bytes = new TextEncoder().encode(json);
  const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  if (encoded.length > MAX_SHARE_LENGTH) throw new Error("This view is too large to share.");
  return `#view=${encoded}`;
}

export function decodeView(hash: string, path: string): SharedView | null {
  if (!hash.startsWith("#view=")) return null;
  const encoded = hash.slice(6);
  if (!encoded || encoded.length > MAX_SHARE_LENGTH || !/^[\w-]+$/.test(encoded)) {
    throw new Error("This view link could not be read.");
  }
  const raw = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  const value: unknown = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(raw, (char) => char.charCodeAt(0)),
    ),
  );
  if (
    !isRecord(value) ||
    value.version !== SHARE_VERSION ||
    value.path !== path ||
    !isRecord(value.parts)
  ) {
    throw new Error("This view link is not supported on this page.");
  }
  return value as SharedView;
}

function readPath(data: unknown, path: string) {
  return path
    .split(".")
    .reduce<unknown>((value, key) => (isRecord(value) ? value[key] : undefined), data);
}

function writePath(data: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let parent = data;
  for (const key of keys.slice(0, -1)) {
    parent[key] = { ...(isRecord(parent[key]) ? parent[key] : {}) };
    parent = parent[key] as Record<string, unknown>;
  }
  parent[keys[keys.length - 1]] = value;
}

// Only values exposed by the page's own controls may come back from a URL.
// Functions, geometry and rules stay local, including nested L-system setup.
export function restoreConfig<T>(current: T, saved: unknown, rules: ControlRule[]): T {
  if (!isRecord(current) || !isRecord(saved)) throw new Error("Invalid view settings.");
  const next: Record<string, unknown> = { ...current };
  for (const rule of rules) {
    const value = readPath(saved, rule.path);
    if (value === undefined) continue;
    const valid =
      rule.kind === "number"
        ? finite(value, rule.min ?? -1000000, rule.max ?? 1000000)
        : rule.kind === "color"
          ? typeof value === "string" && /^#[\da-f]{6}$/i.test(value)
          : rule.kind === "boolean"
            ? typeof value === "boolean"
            : typeof value === "string" && Boolean(rule.options?.includes(value));
    if (!valid) throw new Error("Some settings in this view link are invalid.");
    writePath(next, rule.path, value);
  }
  // A shared drawing opens still, at the generation and pose that was saved.
  for (const key of ["animateIterations", "autoRotate", "animateTrail", "animateAngle"]) {
    if (typeof next[key] === "boolean") next[key] = false;
  }
  if (saved.grab !== undefined) {
    if (
      !Array.isArray(saved.grab) ||
      saved.grab.length !== 9 ||
      !saved.grab.every((v) => finite(v, -1.00001, 1.00001))
    ) {
      throw new Error("Invalid view orientation.");
    }
    next.grab = saved.grab;
  }
  return next as T;
}

export function snapshotConfig(data: unknown, rules: ControlRule[]) {
  const result: Record<string, unknown> = {};
  for (const rule of rules) {
    let value = readPath(data, rule.path);
    if (
      rule.path === "rotationY" &&
      typeof value === "number" &&
      rule.min === -180 &&
      rule.max === 180
    ) {
      value = ((((value + 180) % 360) + 360) % 360) - 180;
    }
    if (value !== undefined) writePath(result, rule.path, value);
  }
  if (isRecord(data) && Array.isArray(data.grab)) result.grab = data.grab;
  return result;
}

export function readViewport(value: unknown, min: number, max: number) {
  if (
    !isRecord(value) ||
    !Array.isArray(value.center) ||
    value.center.length !== 2 ||
    !value.center.every((n) => finite(n, -1000000, 1000000)) ||
    !finite(value.zoomSize, min, max)
  ) {
    throw new Error("Invalid zoom position.");
  }
  return { center: [...value.center] as [number, number], zoomSize: value.zoomSize };
}
