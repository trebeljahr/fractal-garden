import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const descriptions = new URL("../fractal-descriptions/", import.meta.url);
const articles = readdirSync(descriptions).map((file) => ({
  file,
  text: readFileSync(new URL(file, descriptions), "utf8"),
}));

test("an article links to each outside page once", () => {
  const link = /\]\((https?:\/\/(?:[^()\s]|\([^()]*\))+)\)/g;
  for (const { file, text } of articles) {
    const pages = [...text.matchAll(link)].map(([, url]) => url.split("#")[0].replace(/\/$/, ""));
    const repeats = pages.filter((page, index) => pages.indexOf(page) !== index);
    assert.deepEqual(repeats, [], file);
  }
});

test("further exploring keeps videos apart from reading", () => {
  const video = /\]\(https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)\//;
  const links = (lines) => lines.split("\n").filter((line) => line.startsWith("- "));
  for (const { file, text } of articles) {
    assert.doesNotMatch(text, /further reading/i, file);
    const section = text.split(/^## Further exploring$/m)[1]?.split(/^## /m)[0];
    if (!section) continue;

    const [intro, ...groups] = section.split(/^### /m);
    if (groups.length === 0) {
      assert.equal(new Set(links(intro).map((line) => video.test(line))).size, 1, `${file} mixes kinds`);
      continue;
    }
    assert.deepEqual(groups.map((group) => group.split("\n")[0]), ["Videos", "Reading"], file);
    assert.ok(links(groups[0]).length > 0 && links(groups[0]).every((line) => video.test(line)), `${file} videos`);
    assert.ok(links(groups[1]).length > 0 && !links(groups[1]).some((line) => video.test(line)), `${file} reading`);
  }
});

test("every citation reaches its source and every source returns to its citations", () => {
  for (const { file, text } of articles) {
    const citations = [...text.matchAll(/<a id="([^"]+-ref-\d+)" href="#([^"]+-source-(\d+))">(\d+)<\/a>/g)];
    const sources = [...text.matchAll(/^(\d+)\. <span id="([^"]+-source-\d+)"><\/span>/gm)];
    const returns = [...text.matchAll(/\[Back\]\(#([^)]+-ref-\d+)\)/g)].map((match) => match[1]);

    assert.deepEqual(
      sources.map(([, number]) => Number(number)),
      sources.map((_, index) => index + 1),
      `${file} source numbers`,
    );
    const sourceIds = new Set(sources.map((source) => source[2]));
    for (const [, , target, targetNumber, label] of citations) {
      assert.ok(sourceIds.has(target), `${file} cites missing ${target}`);
      assert.equal(label, targetNumber, `${file} label for ${target}`);
    }
    const citationIds = citations.map((citation) => citation[1]);
    assert.deepEqual([...returns].sort(), [...citationIds].sort(), `${file} return links`);
  }
});
