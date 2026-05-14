import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const SITE_URL = "https://fractal.garden";
const PAGES_DIR = join(process.cwd(), "pages");
const PAGE_SEO_PATH = join(process.cwd(), "utils", "pageSeo.ts");
const SITEMAP_PATH = join(process.cwd(), "public", "sitemap.xml");

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function routeFromPage(filePath) {
  const path = relative(PAGES_DIR, filePath)
    .split(sep)
    .join("/")
    .replace(/\.tsx$/, "")
    .replace(/\/index$/, "");

  return path === "index" ? "/" : `/${path}`;
}

async function discoverPageRoutes(dir = PAGES_DIR) {
  const entries = await readdir(dir, { withFileTypes: true });
  const routes = await Promise.all(
    entries.flatMap(async (entry) => {
      const filePath = join(dir, entry.name);

      if (entry.isDirectory()) {
        return discoverPageRoutes(filePath);
      }

      if (!entry.isFile() || !entry.name.endsWith(".tsx") || entry.name.startsWith("_")) {
        return [];
      }

      return [{ path: routeFromPage(filePath), filePath }];
    }),
  );

  return routes.flat().sort((a, b) => a.path.localeCompare(b.path));
}

async function pageSeoPaths() {
  const source = await readFile(PAGE_SEO_PATH, "utf8");
  const [, seoObject = ""] = source.match(/PAGE_SEO: Record<string, SeoEntry> = \{([\s\S]*?)\n\};/) ?? [];
  const paths = [...seoObject.matchAll(/"([^"]+)":\s*\{/g)].map((match) => match[1]);

  if (paths.length === 0) {
    throw new Error("No PAGE_SEO routes found in utils/pageSeo.ts");
  }

  return paths;
}

function routeQuality(path) {
  if (path === "/") {
    return { changeFrequency: "weekly", priority: 1 };
  }

  if (path === "/imprint") {
    return { changeFrequency: "yearly", priority: 0.3 };
  }

  return { changeFrequency: "monthly", priority: path.startsWith("/l-system/") ? 0.7 : 0.8 };
}

function renderSitemap(entries) {
  const urls = entries
    .map(
      ({ path, lastModified, changeFrequency, priority }) => `  <url>
    <loc>${escapeXml(new URL(path, SITE_URL).toString())}</loc>
    <lastmod>${lastModified.toISOString()}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

const [routes, seoPaths] = await Promise.all([discoverPageRoutes(), pageSeoPaths()]);
const routeMap = new Map(routes.map((route) => [route.path, route.filePath]));
const missingSeo = routes.map((route) => route.path).filter((path) => !seoPaths.includes(path));
const missingPages = seoPaths.filter((path) => !routeMap.has(path));

if (missingSeo.length > 0 || missingPages.length > 0) {
  throw new Error(
    [
      missingSeo.length > 0 ? `Missing PAGE_SEO entries: ${missingSeo.join(", ")}` : "",
      missingPages.length > 0 ? `Missing page files: ${missingPages.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

const entries = await Promise.all(
  seoPaths.map(async (path) => {
    const filePath = routeMap.get(path);
    const stats = await stat(filePath);

    return {
      path,
      lastModified: stats.mtime,
      ...routeQuality(path),
    };
  }),
);

await writeFile(SITEMAP_PATH, renderSitemap(entries), "utf8");
console.log(`Wrote ${entries.length} URLs to public/sitemap.xml`);
