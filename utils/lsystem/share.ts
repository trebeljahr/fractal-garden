import { compactSpec, type LSystemSpec, normalizeSpec, slugify } from "./spec";

const REPO = "trebeljahr/fractal-garden";
export const PRESET_DIR = "lsystem-presets";

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSpec(spec: LSystemSpec) {
  return toBase64Url(JSON.stringify(compactSpec(spec)));
}

export function decodeSpec(value: string) {
  try {
    return normalizeSpec(JSON.parse(fromBase64Url(value)));
  } catch {
    return null;
  }
}

export function explorerHref(spec: LSystemSpec) {
  return `/l-system/explorer#s=${encodeSpec(spec)}`;
}

export function presetJson(spec: LSystemSpec) {
  return `${JSON.stringify(compactSpec(spec), null, 2)}\n`;
}

// GitHub's "create new file" page accepts a filename and initial contents.
// Committing there from an account without write access forks the repo and
// opens a pull request, so contributors need no local setup.
export function githubSubmitUrl(spec: LSystemSpec) {
  const params = new URLSearchParams({
    filename: `${slugify(spec.name)}.json`,
    value: presetJson(spec),
  });
  return `https://github.com/${REPO}/new/main/${PRESET_DIR}?${params.toString()}`;
}
