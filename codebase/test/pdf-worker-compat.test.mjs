import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverSource = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

test("serves the PDF.js legacy main and worker builds together", () => {
  assert.match(serverSource, /pdfjs-dist[\\/]legacy[\\/]build/);
  assert.match(appSource, /workerSrc = "\/vendor\/pdf\.worker\.mjs"/);
});
