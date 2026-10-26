import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const {
  CONTACT_FORK,
  CONTACT_SIZE,
  CONTACT_WALK_LIMIT,
  contactExperiment,
  contactSummary,
} = require("../utils/lessons/dlaContacts.ts");
const key = (p) => `${p.x}:${p.y}`;
const adjacent = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;

test("fixed-fork contacts count each stuck particle once without changing the fork", () => {
  const before = JSON.stringify(CONTACT_FORK),
    walks = contactExperiment(false),
    summary = contactSummary(walks);
  assert.equal(JSON.stringify(CONTACT_FORK), before);
  assert.equal(summary.stuck + summary.discarded + summary.unfinished, 800);
  assert.equal(
    summary.counts.reduce((a, b) => a + b, 0),
    summary.stuck,
  );
  assert.ok(summary.stuck > 50);
  for (const walk of walks) {
    assert.ok(walk.steps <= CONTACT_WALK_LIMIT);
    if (walk.status === "stuck") {
      assert.ok(CONTACT_FORK.some((p) => adjacent(p, walk.end)));
      assert.ok(!CONTACT_FORK.some((p) => key(p) === key(walk.end)));
    }
  }
});
test("growth adds exactly one new neighboring cell for each successful walk", () => {
  const occupied = [...CONTACT_FORK],
    keys = new Set(occupied.map(key)),
    walks = contactExperiment(true);
  for (const walk of walks) {
    if (walk.status !== "stuck") continue;
    assert.ok(!keys.has(key(walk.end)));
    assert.ok(occupied.some((p) => adjacent(p, walk.end)));
    assert.ok(
      walk.end.x >= 0 && walk.end.x < CONTACT_SIZE && walk.end.y >= 0 && walk.end.y < CONTACT_SIZE,
    );
    occupied.push(walk.end);
    keys.add(key(walk.end));
  }
  assert.equal(occupied.length, CONTACT_FORK.length + contactSummary(walks).stuck);
});
test("replay is deterministic, prefix-stable and bounded", () => {
  for (const grow of [false, true]) {
    const short = contactExperiment(grow, 100, 127);
    assert.deepEqual(short, contactExperiment(grow, 150, 127).slice(0, 100));
    assert.notDeepEqual(short, contactExperiment(grow, 100, 128));
    assert.equal(contactExperiment(grow, 900).length, 800);
    assert.equal(contactExperiment(grow, -1).length, 0);
  }
});
