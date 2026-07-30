import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverSource = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

test("serves the C0 and C1 browser modules", () => {
  assert.match(serverSource, /app\.get\("\/selection-geometry\.mjs"/);
  assert.match(serverSource, /app\.get\("\/snip\.mjs"/);
});

test("wires a visible Snip mode and non-interactive outline", () => {
  assert.match(htmlSource, /data-mode="snip"/);
  assert.match(appSource, /import \{ createSnipSelection \} from "\/snip\.mjs"/);
  assert.match(appSource, /snipSelection: null/);
  assert.match(appSource, /class="snip-preview hidden"/);
  assert.match(cssSource, /page-shell\[data-mode="snip"\] \.annotation-canvas/);
  assert.match(cssSource, /\.snip-preview[\s\S]*pointer-events:\s*none/);
});

test("does not wire Snip directly to Tutor requests", () => {
  const snipPointerSection = appSource.slice(
    appSource.indexOf("function setupAnnotationLayer"),
    appSource.indexOf("function resizeAnnotationCanvas"),
  );
  assert.doesNotMatch(snipPointerSection, /fetch\(|sendVisualQuestion|sendTextQuestion|cropSelectedRegion/);
});

test("keeps each Snip drag owned by its initiating pointer", () => {
  const snipPointerSection = appSource.slice(
    appSource.indexOf("function setupAnnotationLayer"),
    appSource.indexOf("function resizeAnnotationCanvas"),
  );

  assert.match(snipPointerSection, /if \(snipDraft\) return;/);
  assert.match(snipPointerSection, /pointerId: event\.pointerId/);
  assert.ok(
    snipPointerSection.match(
      /if \(snipDraft\.pointerId !== event\.pointerId\) return;/g,
    )?.length >= 4,
  );
});
