import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { recordTrace } from "../src/trace.mjs";

test("stores only visual-call metadata and a question hash", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "visual-trace-"));
  const file = path.join(directory, "calls.jsonl");
  const input = {
    imageData: "aGVsbG8=",
    question: "raw private question",
    slideNumber: 18,
  };

  await recordTrace({
    file,
    provider: "openai",
    model: "gpt-5.6-terra",
    input,
    result: { route: "VISUAL_GROUNDED" },
    now: new Date("2026-07-30T10:00:00Z"),
  });

  const raw = await readFile(file, "utf8");
  const entry = JSON.parse(raw);
  assert.equal(entry.provider, "openai");
  assert.equal(entry.questionHash.length, 64);
  assert.equal(entry.imageBytes, 5);
  assert.equal(entry.route, "VISUAL_GROUNDED");
  assert.equal(entry.slideNumber, 18);
  assert.equal(raw.includes(input.question), false);
  assert.equal(raw.includes(input.imageData), false);
  assert.equal(raw.includes("secret"), false);
});
