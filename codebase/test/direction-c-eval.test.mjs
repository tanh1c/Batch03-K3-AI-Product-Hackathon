import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const setUrl = new URL("../../eval/direction-c-golden-set.json", import.meta.url);
const runnerSource = await readFile(new URL("../../eval/run-eval.mjs", import.meta.url), "utf8");

const ROUTES = new Set([
  "VISUAL_GROUNDED",
  "NEED_WIDER_REGION",
  "NEED_BETTER_IMAGE",
  "INSUFFICIENT",
]);
const SOURCES = new Set(["snip", "circle", "detected-image", "detected-text"]);

async function loadSet() {
  return JSON.parse(await readFile(setUrl, "utf8"));
}

test("freezes twelve ordered Direction C cases with the required split", async () => {
  const golden = await loadSet();
  assert.equal(golden.setId, "direction-c-v1");
  assert.equal(golden.version, 1);
  assert.equal(golden.cases.length, 12);
  assert.deepEqual(golden.cases.map((item) => item.id), Array.from({ length: 12 }, (_, index) => `C${String(index + 1).padStart(2, "0")}`));
  assert.equal(new Set(golden.cases.map((item) => item.id)).size, 12);
  assert.deepEqual(
    Object.fromEntries(["mixed", "scanned", "recovery", "detector-fallback"].map((category) => [category, golden.cases.filter((item) => item.category === category).length])),
    { mixed: 4, scanned: 3, recovery: 3, "detector-fallback": 2 },
  );
});

test("uses valid C0 selections, four routes, coherent C2 metadata, and PNG fixtures", async () => {
  const golden = await loadSet();
  for (const item of golden.cases) {
    assert.ok(SOURCES.has(item.selection.source), `${item.id} source`);
    assert.equal(item.selection.pageNumber, item.page, `${item.id} page`);
    assert.equal(typeof item.selection.label, "string", `${item.id} label`);
    assert.ok(item.selection.label.trim(), `${item.id} label`);
    const { x, y, width, height } = item.selection.bounds;
    assert.ok([x, y, width, height].every(Number.isFinite), `${item.id} bounds`);
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0, `${item.id} positive bounds`);
    assert.ok(x + width <= 1 && y + height <= 1, `${item.id} normalized bounds`);
    assert.ok(width * height < 0.9, `${item.id} must not select a full page`);
    assert.ok(ROUTES.has(item.expectedRoute), `${item.id} route`);
    assert.equal(item.needsOcr, !item.boundedText.trim(), `${item.id} OCR state`);
    assert.ok(item.question.trim(), `${item.id} question`);
    const fixtureUrl = new URL(`../../eval/fixtures/${item.fixture}`, import.meta.url);
    await access(fixtureUrl);
    const signature = (await readFile(fixtureUrl)).subarray(0, 8);
    assert.deepEqual([...signature], [137, 80, 78, 71, 13, 10, 26, 10], `${item.id} PNG`);
    assert.match(golden.fixtures[item.fixture], /^[a-f0-9]{64}$/, `${item.id} fixture hash`);
  }
});

test("freezes detector failure recovery and vector source mapping", async () => {
  const golden = await loadSet();
  const fallback = golden.cases.filter((item) => item.category === "detector-fallback");
  assert.deepEqual(fallback.map((item) => item.detectorOutcome), ["miss", "false-positive"]);
  assert.deepEqual(new Set(fallback.map((item) => item.manualFallback)), new Set(["snip", "circle"]));
  const vector = golden.cases.find((item) => item.detectedKind === "vector");
  assert.equal(vector?.selection.source, "detected-image");
});

test("freezes the complete Direction C quality bar", async () => {
  const { qualityBar } = await loadSet();
  assert.equal(qualityBar.minimumPassed, 10);
  assert.equal(qualityBar.totalCases, 12);
  assert.equal(qualityBar.maximumUnsupportedGrounded, 0);
  assert.equal(qualityBar.maximumWrongPageCrops, 0);
  assert.deepEqual(new Set(qualityBar.requiredManualFallbacks), new Set(["snip", "circle"]));
});

test("runner validates offline and creates explicit real-run outputs exclusively", () => {
  assert.match(runnerSource, /--validate/);
  assert.match(runnerSource, /--run/);
  assert.match(runnerSource, /--set/);
  assert.match(runnerSource, /--results/);
  assert.match(runnerSource, /--trace/);
  assert.match(runnerSource, /open\(path, "wx"\)/);
  const providerResolution = runnerSource.indexOf("resolveAiProvider()");
  const validateExit = runnerSource.indexOf("Validation passed");
  assert.ok(validateExit >= 0 && providerResolution > validateExit, "validation must finish before provider resolution");
  assert.doesNotMatch(runnerSource, /writeFile\(new URL\("(?:run-01-results|real-call-trace)\.json"/);
});

test("runner reserves both outputs before provider calls and removes partial artifacts", () => {
  const reservation = runnerSource.indexOf("const outputFiles = await reserveOutputs");
  const providerCall = runnerSource.indexOf("await analyzeVisual");
  assert.ok(reservation >= 0 && reservation < providerCall, "both paths must be reserved before network calls");
  assert.match(runnerSource, /Promise\.all\(\[outputFiles\.results\.writeFile/);
  assert.match(runnerSource, /rm\(path, \{ force: true \}\)/);
});

test("runner labels automated scoring as requiring manual grounding review", () => {
  assert.match(runnerSource, /manualGroundingReviewRequired:\s*true/);
  assert.match(runnerSource, /providerGateMet:\s*null/);
});
