import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { registerVisualRoute, visualErrorHandler } from "../src/visual-route.mjs";

const grounded = {
  route: "VISUAL_GROUNDED",
  answer: "Nhánh ML dùng đặc trưng được thiết kế trước.",
  reason: "Nhãn đọc được.",
  recovery_action: "",
};

async function startServer({
  analyze = async () => grounded,
  recordTrace = async () => {},
  provider = {
    name: "9router",
    protocol: "chat",
    endpoint: "http://localhost:20128/v1/chat/completions",
    apiKey: "",
    model: "gc/gemini-2.5-flash",
    configured: true,
  },
} = {}) {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  registerVisualRoute(app, {
    analyze,
    recordTrace,
    provider,
    traceFile: "unused.jsonl",
  });
  app.use(visualErrorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

const validInput = {
  imageData: "aGVsbG8=",
  mediaType: "image/png",
  question: "Giải thích hình này",
  slideNumber: 18,
  nearbyText: "Machine Learning và Deep Learning",
  selectedText: "Raw data · Neural network · Prediction",
  contentKind: "mixed",
  selectionCoverage: 0.72,
};

test("accepts a valid visual request and records one redacted trace", async (t) => {
  const calls = [];
  const traces = [];
  const { server, baseUrl } = await startServer({
    analyze: async (...args) => { calls.push(args); return grounded; },
    recordTrace: async (entry) => traces.push(entry),
  });
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validInput),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), grounded);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].provider.name, "9router");
  assert.equal(calls[0][1].provider.apiKey, "");
  assert.equal(traces.length, 1);
  assert.deepEqual(traces[0].input, validInput);
  assert.equal(traces[0].provider, "9router");
  assert.equal(traces[0].model, "gc/gemini-2.5-flash");
});

test("returns 503 when the selected provider is not configured", async (t) => {
  let calls = 0;
  const { server, baseUrl } = await startServer({
    analyze: async () => { calls += 1; return grounded; },
    provider: {
      name: "openrouter",
      protocol: "chat",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "",
      model: "openai/gpt-4o-mini",
      configured: false,
    },
  });
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validInput),
  });

  assert.equal(response.status, 503);
  assert.equal(calls, 0);
});

test("rejects a missing image before calling AI", async (t) => {
  let calls = 0;
  const { server, baseUrl } = await startServer({ analyze: async () => { calls += 1; return grounded; } });
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...validInput, imageData: "" }),
  });

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("rejects an invalid selection coverage before calling AI", async (t) => {
  let calls = 0;
  const { server, baseUrl } = await startServer({ analyze: async () => { calls += 1; return grounded; } });
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...validInput, selectionCoverage: 1.1 }),
  });

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("rejects an unknown circled content kind before calling AI", async (t) => {
  let calls = 0;
  const { server, baseUrl } = await startServer({ analyze: async () => { calls += 1; return grounded; } });
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...validInput, contentKind: "photo" }),
  });

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("rejects a body over 10 MiB", async (t) => {
  const { server, baseUrl } = await startServer();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...validInput, imageData: "A".repeat(10 * 1024 * 1024 + 1) }),
  });

  assert.equal(response.status, 413);
});
