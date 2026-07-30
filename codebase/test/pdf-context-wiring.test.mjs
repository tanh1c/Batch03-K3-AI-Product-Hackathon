import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverSource = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
const moduleSource = await readFile(new URL("../public/pdf-context.mjs", import.meta.url), "utf8");

test("serves the C2 browser module explicitly", () => {
  assert.match(serverSource, /app\.get\("\/pdf-context\.mjs"/);
});

test("keeps C2 independent from annotations, AI, network, and storage", () => {
  assert.doesNotMatch(moduleSource, /annotation-canvas/);
  assert.doesNotMatch(moduleSource, /fetch\(|\/api\/|localStorage|sessionStorage/);
});
