// Captures the README and marketing screenshots from a static build of the
// site. Every image is the real app in headless Chromium, never a mock-up.
//
//   pnpm build                      # writes the static site to out/
//   pnpm marketing:screenshots      # serves out/ and writes docs/marketing/screenshots/
//
// Options:
//   --base-url=<url>   capture a running site instead of serving out/
//   --only=a,b         capture only the named shots
//
// Playwright is not a project dependency. The script loads it from the
// project, then from the global npm root (`npm i -g playwright`). Set
// CHROMIUM_PATH to use a Chromium build other than Playwright's default.
// WebGL pages need a GPU: on macOS the script asks Chromium for ANGLE Metal.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT_DIR = join(ROOT, "docs", "marketing", "screenshots");
const MANIFEST = join(ROOT, "docs", "marketing", "manifest.json");
const SITE_DIR = join(ROOT, "out");

const DESKTOP = { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 };
const MOBILE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

// Each shot opens one page, optionally picks a place from "Places to explore",
// optionally hides the interface with the page's own Hide UI button, and waits
// for the renderer to settle. `quality` is the WebP quality of the saved file.
const SHOTS = [
  {
    name: "mandelbrot-double-spiral",
    purpose: "README hero: the Mandelbrot explorer with its controls, zoomed into a spiral",
    path: "/mandelbrot",
    place: "Double spiral",
    settle: 5000,
  },
  {
    name: "home",
    purpose: "Home page: title and the first row of the fractal grid",
    path: "/",
    loadLazyImages: true,
    settle: 1500,
  },
  {
    name: "mandelbrot-article",
    purpose: "The article under the Mandelbrot explorer, with its first interactive demo",
    path: "/mandelbrot",
    scrollTo: "text=Where the point goes for each c",
    scrollOffset: -420,
    settle: 2500,
  },
  {
    name: "l-system-explorer",
    purpose: "L-system explorer: write rules, see the curve",
    path: "/l-system/explorer",
    settle: 3500,
  },
  {
    name: "gallery-mandelbrot-seahorse-valley",
    purpose: "Gallery: Mandelbrot set, Seahorse Valley, interface hidden",
    path: "/mandelbrot",
    place: "Seahorse Valley",
    hideUi: true,
    quality: 74,
    settle: 5000,
  },
  {
    name: "gallery-julia-sea-spiral",
    purpose: "Gallery: Julia set, Sea spiral, interface hidden",
    path: "/julia-set",
    place: "Sea spiral",
    hideUi: true,
    quality: 74,
    settle: 5000,
  },
  {
    name: "gallery-burning-ship-little-ship",
    purpose: "Gallery: Burning Ship, Little ship, interface hidden",
    path: "/burning-ship",
    place: "Little ship",
    hideUi: true,
    quality: 74,
    settle: 5000,
  },
  {
    name: "gallery-mandelbulb",
    purpose: "Gallery: Mandelbulb, default view, interface hidden",
    path: "/mandelbulb",
    hideUi: true,
    quality: 74,
    settle: 6000,
  },
  {
    name: "gallery-dragon-curve",
    purpose: "Gallery: Dragon curve L-system, interface hidden",
    path: "/l-system/dragon-curve",
    hideUi: true,
    quality: 74,
    settle: 3000,
  },
  {
    name: "gallery-barnsley-fern",
    purpose: "Gallery: Barnsley fern, interface hidden",
    path: "/barnsley-fern",
    hideUi: true,
    quality: 74,
    settle: 4000,
  },
  {
    name: "mobile-mandelbrot",
    purpose: "Phone width: the Mandelbrot explorer",
    path: "/mandelbrot",
    device: "mobile",
    settle: 5000,
  },
];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

async function fileAt(path) {
  try {
    return (await stat(path)).isFile() ? path : null;
  } catch {
    return null;
  }
}

// Serves out/ the way the Cloudflare assets binding does: /mandelbrot reads
// mandelbrot.html, unknown paths get 404.html.
function serveStaticExport() {
  const server = createServer(async (req, res) => {
    const pathname = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    const base = join(SITE_DIR, pathname.replace(/^(\.\.[/\\])+/, ""));
    const file =
      (await fileAt(base)) ||
      (await fileAt(`${base}.html`)) ||
      (await fileAt(join(base, "index.html")));
    if (!file) {
      res.writeHead(404, { "content-type": "text/html" });
      res.end(await readFile(join(SITE_DIR, "404.html")).catch(() => "Not found"));
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  });
  return new Promise((resolve) => {
    // Port 0 lets the OS pick a free port, so this never takes a dev server's port.
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const globalRoot = execSync("npm root -g").toString().trim();
    return createRequire(`${globalRoot}/`)("playwright");
  }
}

async function loadLazyImages(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      Array.from(document.images)
        .filter((image) => !image.complete)
        .map((image) => new Promise((resolve) => image.addEventListener("load", resolve))),
    );
  });
}

async function capture(browser, baseUrl, shot) {
  const context = await browser.newContext(shot.device === "mobile" ? MOBILE : DESKTOP);
  const page = await context.newPage();
  await page.goto(new URL(shot.path, baseUrl).href, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  if (shot.place) {
    await page.locator("[data-fractal-places] > summary").click();
    await page.locator("[data-fractal-places] button", { hasText: shot.place }).first().click();
  }
  if (shot.loadLazyImages) await loadLazyImages(page);
  if (shot.scrollTo) {
    await page
      .locator(shot.scrollTo)
      .first()
      .evaluate((element) => element.scrollIntoView());
    await page.evaluate((offset) => window.scrollBy(0, offset), shot.scrollOffset ?? 0);
  }
  if (shot.hideUi) {
    await page.getByRole("button", { name: "Hide UI" }).click();
    // Hide UI leaves one small "Show UI" button in the corner. A clean render
    // should not show it, so it is made invisible for the capture only.
    await page.addStyleTag({ content: '[aria-label="Show UI"] { opacity: 0 !important; }' });
  }
  // Keep the pointer off the canvas so no hover state or cursor shows.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(shot.settle);

  const png = await page.screenshot({ type: "png" });
  await context.close();

  const file = join(OUT_DIR, `${shot.name}.webp`);
  const info = await sharp(png)
    .webp({ quality: shot.quality ?? 80 })
    .toFile(file);
  return {
    file: `docs/marketing/screenshots/${shot.name}.webp`,
    purpose: shot.purpose,
    width: info.width,
    height: info.height,
    bytes: info.size,
    sha256: createHash("sha256")
      .update(await readFile(file))
      .digest("hex"),
    source: shot.place ? `${shot.path} (Places to explore: ${shot.place})` : shot.path,
    interface: shot.hideUi
      ? "hidden with the page's Hide UI button; its Show UI button made transparent"
      : "visible",
  };
}

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);
const only = args.only ? new Set(args.only.split(",")) : null;
const server = args["base-url"] ? null : await serveStaticExport();
const baseUrl = args["base-url"] ?? `http://127.0.0.1:${server.address().port}`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});

const commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "{}"));
manifest.screenshots ??= {};
try {
  for (const shot of SHOTS) {
    if (only && !only.has(shot.name)) continue;
    const entry = await capture(browser, baseUrl, shot);
    manifest.screenshots[shot.name] = {
      ...entry,
      captured: new Date().toISOString().slice(0, 10),
      commit,
    };
    console.log(`Wrote ${entry.file} (${entry.width}x${entry.height}, ${entry.bytes} bytes)`);
  }
} finally {
  await browser.close();
  server?.close();
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
