import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestUrl = new URL("../../eval/direction-c-golden-set.json", import.meta.url);

test("freezes the required 12-case Direction C distribution and gate", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  assert.equal(manifest.cases.length, 12);
  const counts = Object.groupBy(manifest.cases, (item) => item.cohort);
  assert.equal(counts.mixed.length, 4);
  assert.equal(counts.scanned.length, 3);
  assert.equal(counts.recovery.length, 3);
  assert.equal(counts.detectorFallback.length, 2);
  assert.equal(manifest.qualityBar.minimumPassCount, 10);
  assert.equal(manifest.qualityBar.maximumUnsupportedGrounded, 0);
  assert.equal(manifest.qualityBar.maximumWrongPageCrops, 0);
});

test("every case has bounded selection metadata and an available fixture", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  for (const item of manifest.cases) {
    assert.match(item.id, /^C\d{2}$/);
    assert.equal(Number.isInteger(item.pageNumber), true);
    assert.ok(["snip", "circle", "detected-image", "detected-text"].includes(item.selection.source));
    assert.equal(typeof item.selection.needsOcr, "boolean");
    assert.equal(typeof item.expectedRoute, "string");
    await assert.doesNotReject(() => readFile(new URL(`../../eval/fixtures/${item.fixture}`, import.meta.url)));
  }
});

test("detector failures explicitly retain a manual fallback", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const fallbackCases = manifest.cases.filter((item) => item.cohort === "detectorFallback");
  assert.equal(fallbackCases.every((item) => ["snip", "circle"].includes(item.manualFallback)), true);
});
