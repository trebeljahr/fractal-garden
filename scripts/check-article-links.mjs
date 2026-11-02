import { readdir, readFile } from "node:fs/promises";
import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import { join } from "node:path";

// Outside links die without anyone noticing, so run this now and then. It needs
// the network, so it stays out of the build. Only dead links fail the run: other
// findings may be a site blocking scripts. Pass article names to check only those.
const ARTICLE_DIR = join(process.cwd(), "fractal-descriptions");
const USER_AGENT = "Mozilla/5.0 (compatible; FractalGardenLinkCheck; +https://fractal.garden)";
const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 2_000;
const LINK = /\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/g;
const YOUTUBE = /^https:\/\/(www\.youtube\.com\/watch|youtu\.be\/)/;
const REPORT = [
  ["dead", "Dead"],
  ["unsure", "Open in a browser: the site blocked this script or failed twice"],
  ["moved", "Moved: point the link at the new address"],
  ["anchor", "Page is up, but the #section is gone"],
];

// Node gives each address 500 ms to connect, then reports a connect timeout. That
// is too short for a distant server, so healthy sites would look broken.
setDefaultAutoSelectFamilyAttemptTimeout(5_000);

const pageKey = (url) => {
  const { hostname, pathname } = new URL(url);
  return `${hostname.replace(/^www\./, "")}${decodeURI(pathname).replace(/\/$/, "")}`;
};

const hasAnchor = (html, fragment) =>
  [fragment, decodeURIComponent(fragment)].some(
    (id) => html.includes(`id="${id}"`) || html.includes(`name="${id}"`),
  );

async function checkVideo(url) {
  // A watch page answers 200 even when the video is deleted. oEmbed does not.
  const response = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  await response.body?.cancel();
  if (response.ok) return { kind: "ok" };
  const gone = response.status === 400 || response.status === 404;
  return { kind: gone ? "dead" : "unsure", detail: `oEmbed ${response.status}` };
}

async function checkPage(url) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const isHtml = response.headers.get("content-type")?.includes("html");
  const fragment = new URL(url).hash.slice(1);
  const html = response.ok && isHtml && fragment ? await response.text() : null;
  if (html === null) await response.body?.cancel();

  if (response.status === 404 || response.status === 410) {
    return { kind: "dead", detail: String(response.status) };
  }
  if (!response.ok) return { kind: "unsure", detail: String(response.status) };
  if (new URL(response.url).pathname === "/" && new URL(url).pathname !== "/") {
    return { kind: "dead", detail: "redirects to the home page" };
  }
  if (pageKey(response.url) !== pageKey(url)) return { kind: "moved", detail: response.url };
  if (html !== null && !hasAnchor(html, fragment)) return { kind: "anchor" };
  return { kind: "ok" };
}

async function check(url) {
  try {
    return await (YOUTUBE.test(url) ? checkVideo(url) : checkPage(url));
  } catch (error) {
    const code = error.cause?.code ?? error.name;
    return { kind: code === "ENOTFOUND" ? "dead" : "unsure", detail: code };
  }
}

async function checkWithRetry(url) {
  const first = await check(url);
  if (first.kind !== "dead" && first.kind !== "unsure") return first;
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return check(url);
}

const wanted = process.argv.slice(2);
const files = (await readdir(ARTICLE_DIR))
  .filter((file) => file.endsWith(".md"))
  .filter((file) => wanted.length === 0 || wanted.includes(file.replace(/\.md$/, "")))
  .sort();

const articlesByLink = new Map();
for (const file of files) {
  const source = await readFile(join(ARTICLE_DIR, file), "utf8");
  for (const [, url] of source.matchAll(LINK)) {
    const articles = articlesByLink.get(url) ?? new Set();
    articles.add(file.replace(/\.md$/, ""));
    articlesByLink.set(url, articles);
  }
}

// One request at a time per host, so a long list stays polite to each site.
const results = new Map();
const linksByHost = Map.groupBy(articlesByLink.keys(), (url) => new URL(url).hostname);
await Promise.all(
  [...linksByHost.values()].map(async (urls) => {
    for (const url of urls) results.set(url, await checkWithRetry(url));
  }),
);

console.log(`Checked ${results.size} links in ${files.length} articles.`);
for (const [kind, heading] of REPORT) {
  const found = [...results].filter(([, result]) => result.kind === kind);
  if (found.length === 0) continue;
  console.log(`\n${heading} (${found.length}):`);
  for (const [url, { detail }] of found) {
    const articles = [...articlesByLink.get(url)].join(", ");
    console.log(`  ${url}${detail ? ` -> ${detail}` : ""}\n    in ${articles}`);
  }
}

if ([...results.values()].some((result) => result.kind === "dead")) process.exitCode = 1;
