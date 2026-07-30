import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const base = new URL("../", import.meta.url);

test("Direction C controls and scoped overlay stylesheet are present", async () => {
  const html = await readFile(new URL("public/index.html", base), "utf8");
  assert.match(html, /data-mode="snip"/);
  assert.match(html, /data-mode="detect"/);
  assert.match(html, /selection-overlay\.css/);
});

test("app composes every Direction C package while preserving Direction B", async () => {
  const app = await readFile(new URL("public/app.js", base), "utf8");
  for (const moduleName of [
    "snip-selection.mjs",
    "pdf-context.mjs",
    "pdf-regions.mjs",
    "selection-overlay.mjs",
    "circle-selection.mjs",
    "visual-request.mjs",
  ]) {
    assert.match(app, new RegExp(moduleName.replace(".", "\\.")));
  }
  assert.match(app, /async function sendDirectionCQuestion/);
  assert.match(app, /function sendVisualQuestion|async function sendVisualQuestion/);
  assert.match(app, /data-visual-region/);
});

test("detection is local and cannot call the AI endpoint", async () => {
  const app = await readFile(new URL("public/app.js", base), "utf8");
  const detectionSection = app.match(/async function ensurePageDetection[\s\S]*?\n}\n/)?.[0] || "";
  assert.match(detectionSection, /detectPdfRegions/);
  assert.doesNotMatch(detectionSection, /api\/analyze|sendDirectionCQuestion/);
});

test("server exposes browser-safe shared modules without exposing secrets", async () => {
  const server = await readFile(new URL("server.mjs", base), "utf8");
  assert.match(server, /\/src\/selection-geometry\.mjs/);
  assert.match(server, /\/src\/visual-request\.mjs/);
  assert.doesNotMatch(server, /sendFile\([^)]*\.env/);
});
