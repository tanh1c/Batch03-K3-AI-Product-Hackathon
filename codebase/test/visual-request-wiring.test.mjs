import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverSource = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
const moduleSource = await readFile(new URL("../src/visual-request.mjs", import.meta.url), "utf8");

test("serves the C7 request policy explicitly", () => {
  assert.match(serverSource, /app\.get\("\/visual-request\.mjs"/);
});

test("keeps C7 request policy free of orchestration and persistence", () => {
  assert.doesNotMatch(
    moduleSource,
    /fetch\(|\/api\/analyze|localStorage|sessionStorage|document\.|querySelector|toDataURL|console\./,
  );
});
