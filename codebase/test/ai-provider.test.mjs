import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAiText,
  getAiHealth,
  requestAi,
  resolveAiProvider,
} from "../src/ai-provider.mjs";

test("defaults to keyless local 9router with a vision model", () => {
  const config = resolveAiProvider({});
  assert.equal(config.name, "9router");
  assert.equal(config.protocol, "chat");
  assert.equal(config.endpoint, "http://localhost:20128/v1/chat/completions");
  assert.equal(config.model, "gc/gemini-2.5-flash");
  assert.equal(config.configured, true);
});

test("normalizes a 9router URL that already ends in v1", () => {
  const config = resolveAiProvider({
    AI_PROVIDER: "9router",
    NINEROUTER_URL: "http://localhost:20128/v1/",
  });
  assert.equal(config.endpoint, "http://localhost:20128/v1/chat/completions");
});

test("requires only the selected remote provider key", () => {
  assert.equal(resolveAiProvider({ AI_PROVIDER: "openai" }).configured, false);
  assert.equal(resolveAiProvider({ AI_PROVIDER: "openai", OPENAI_API_KEY: "openai-key" }).configured, true);
  assert.equal(resolveAiProvider({ AI_PROVIDER: "openrouter", OPENAI_API_KEY: "wrong-key" }).configured, false);
  assert.equal(resolveAiProvider({ AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "router-key" }).configured, true);
  assert.equal(resolveAiProvider({ AI_PROVIDER: "gemini", OPENROUTER_API_KEY: "wrong-key" }).configured, false);
  assert.equal(resolveAiProvider({ AI_PROVIDER: "gemini", GEMINI_API_KEY: "gemini-key" }).configured, true);
});

test("configures the direct Gemini generateContent endpoint", () => {
  const config = resolveAiProvider({
    AI_PROVIDER: "gemini",
    GEMINI_API_KEY: "gemini-key",
  });
  assert.equal(config.name, "gemini");
  assert.equal(config.protocol, "gemini");
  assert.equal(config.model, "gemini-2.5-flash");
  assert.equal(config.endpoint, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
});

test("rejects an unknown provider", () => {
  assert.throws(() => resolveAiProvider({ AI_PROVIDER: "other" }), /Unsupported AI_PROVIDER/);
});

test("health metadata contains no endpoint or key", () => {
  const health = getAiHealth(resolveAiProvider({
    AI_PROVIDER: "openrouter",
    OPENROUTER_API_KEY: "private-key",
    OPENROUTER_MODEL: "openai/gpt-4o-mini",
  }));
  assert.deepEqual(health, {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    configured: true,
  });
  assert.equal(JSON.stringify(health).includes("private-key"), false);
  assert.equal(JSON.stringify(health).includes("openrouter.ai"), false);
});

test("omits authorization for keyless 9router and parses JSON", async () => {
  let request;
  const config = resolveAiProvider({});
  const payload = await requestAi(config, { model: config.model, messages: [] }, async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  assert.equal(request.url, "http://localhost:20128/v1/chat/completions");
  assert.equal("Authorization" in request.options.headers, false);
  assert.equal(extractAiText(payload, "chat"), "hello");
});

test("uses optional 9router authorization and generic upstream errors", async () => {
  let request;
  const config = resolveAiProvider({ NINEROUTER_KEY: "secret-key" });
  await assert.rejects(
    () => requestAi(config, {}, async (url, options) => {
      request = { url, options };
      return new Response("private upstream body", { status: 503 });
    }),
    (error) => error.message === "9router API error 503"
      && !error.message.includes("secret-key")
      && !error.message.includes("private upstream body"),
  );
  assert.equal(request.options.headers.Authorization, "Bearer secret-key");
});

test("uses Gemini API-key auth and extracts candidate text", async () => {
  let request;
  const config = resolveAiProvider({ AI_PROVIDER: "gemini", GEMINI_API_KEY: "gemini-key" });
  const payload = await requestAi(config, { contents: [] }, async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "first" }, { text: "second" }] } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.equal(request.options.headers["x-goog-api-key"], "gemini-key");
  assert.equal("Authorization" in request.options.headers, false);
  assert.equal(extractAiText(payload, "gemini"), "first\nsecond");
});

test("extracts OpenAI Responses output text", () => {
  assert.equal(extractAiText({
    output: [{ type: "message", content: [{ type: "output_text", text: "first" }, { type: "output_text", text: "second" }] }],
  }, "responses"), "first\nsecond");
});
