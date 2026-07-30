import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { recordTrace } from "../src/trace.mjs";

async function readEntry(input) {
  const directory = await mkdtemp(path.join(tmpdir(), "visual-trace-c7-"));
  const file = path.join(directory, "calls.jsonl");
  await recordTrace({
    file,
    provider: "openai",
    model: "gpt-5.6-terra",
    input,
    result: {
      route: "VISUAL_GROUNDED",
      answer: "upstream raw answer",
      reason: "upstream raw reason",
      recovery_action: "",
    },
    now: new Date("2026-07-30T10:00:00Z"),
  });
  const raw = await readFile(file, "utf8");
  return { raw, entry: JSON.parse(raw) };
}

test("records only approved Direction C selection metadata", async () => {
  const input = {
    imageData: "c2VjcmV0IGNyb3A=",
    mediaType: "image/png",
    question: "raw private question",
    slideNumber: 2,
    nearbyText: "raw bounded or OCR text",
    needsOcr: false,
    selectionSource: "snip",
    selectedAreaRatio: 0.2,
    hasTextLayer: true,
    provenance: "Dựa trên vùng đã chọn ở slide 2 · Vùng cắt",
  };

  const { raw, entry } = await readEntry(input);
  assert.equal(entry.selectionSource, "snip");
  assert.equal(entry.selectedAreaRatio, 0.2);
  assert.equal(entry.hasTextLayer, true);
  assert.equal(entry.imageBytes, 11);
  assert.equal(entry.route, "VISUAL_GROUNDED");
  assert.equal(raw.includes(input.imageData), false);
  assert.equal(raw.includes(input.nearbyText), false);
  assert.equal(raw.includes(input.question), false);
  assert.equal(raw.includes(input.provenance), false);
  assert.equal(raw.includes("upstream raw"), false);
});

test("does not invent Direction C metadata for a legacy Direction B trace", async () => {
  const { entry } = await readEntry({
    imageData: "aGVsbG8=",
    mediaType: "image/png",
    question: "Giải thích hình",
    slideNumber: 18,
    nearbyText: "Ngữ cảnh Direction B",
  });

  assert.equal("selectionSource" in entry, false);
  assert.equal("selectedAreaRatio" in entry, false);
  assert.equal("hasTextLayer" in entry, false);
});
