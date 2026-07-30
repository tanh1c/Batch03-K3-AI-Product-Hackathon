import assert from "node:assert/strict";
import test from "node:test";
import express from "express";

import { registerVisualRoute, visualErrorHandler } from "../src/visual-route.mjs";

const grounded = {
  route: "VISUAL_GROUNDED",
  answer: "Nội dung được hỗ trợ bởi vùng chọn.",
  reason: "Vùng chọn đọc được.",
  recovery_action: "",
};

const legacyInput = {
  imageData: "aGVsbG8=",
  mediaType: "image/png",
  question: "Giải thích hình này",
  slideNumber: 18,
  nearbyText: "Machine Learning và Deep Learning",
};

const directionCInput = {
  ...legacyInput,
  nearbyText: "Văn bản giới hạn trong vùng chọn",
  needsOcr: false,
  selectionSource: "snip",
  selectedAreaRatio: 0.2,
  hasTextLayer: true,
};

async function startServer({ analyze, recordTrace = async () => {} }) {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  registerVisualRoute(app, {
    analyze,
    recordTrace,
    provider: {
      name: "9router",
      protocol: "chat",
      endpoint: "http://localhost:20128/v1/chat/completions",
      apiKey: "",
      model: "gc/gemini-2.5-flash",
      configured: true,
    },
    traceFile: "unused.jsonl",
  });
  app.use(visualErrorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function post(baseUrl, body) {
  return fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("accepts and allowlists a complete Direction C metadata group", async (t) => {
  const calls = [];
  const traces = [];
  const { server, baseUrl } = await startServer({
    analyze: async (input) => { calls.push(input); return grounded; },
    recordTrace: async (entry) => traces.push(entry),
  });
  t.after(() => server.close());

  const response = await post(baseUrl, { ...directionCInput, untrusted: "drop me" });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [directionCInput]);
  assert.deepEqual(traces[0].input, directionCInput);
  assert.equal("untrusted" in calls[0], false);
});

test("keeps the legacy Direction B request shape backward compatible", async (t) => {
  const calls = [];
  const { server, baseUrl } = await startServer({
    analyze: async (input) => { calls.push(input); return grounded; },
  });
  t.after(() => server.close());

  const response = await post(baseUrl, legacyInput);
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [legacyInput]);
});

test("rejects incomplete or invalid Direction C metadata", async (t) => {
  let calls = 0;
  const { server, baseUrl } = await startServer({
    analyze: async () => { calls += 1; return grounded; },
  });
  t.after(() => server.close());

  const invalidBodies = [
    { ...legacyInput, needsOcr: false },
    { ...directionCInput, selectionSource: "unknown" },
    { ...directionCInput, selectedAreaRatio: 0 },
    { ...directionCInput, selectedAreaRatio: Number.NaN },
    { ...directionCInput, hasTextLayer: false },
    { ...directionCInput, needsOcr: "false" },
    {
      ...directionCInput,
      nearbyText: "model should not OCR this",
      needsOcr: true,
      hasTextLayer: false,
    },
  ];

  for (const body of invalidBodies) {
    const response = await post(baseUrl, body);
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test("accepts a consistent OCR request with empty bounded text", async (t) => {
  const calls = [];
  const { server, baseUrl } = await startServer({
    analyze: async (input) => { calls.push(input); return grounded; },
  });
  t.after(() => server.close());

  const input = {
    ...directionCInput,
    nearbyText: "",
    needsOcr: true,
    hasTextLayer: false,
  };
  const response = await post(baseUrl, input);
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [input]);
});
