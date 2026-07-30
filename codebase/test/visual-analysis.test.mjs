import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeVisual,
  buildChatBody,
  buildGeminiBody,
  buildOpenAIBody,
  parseVisualResult,
  validateResult,
} from "../src/visual-analysis.mjs";

const input = {
  imageData: "aGVsbG8=",
  mediaType: "image/png",
  question: "Giải thích hình này",
  slideNumber: 18,
  nearbyText: "Machine Learning và Deep Learning",
};

const grounded = {
  route: "VISUAL_GROUNDED",
  answer: "Hai luồng xử lý đặc trưng khác nhau.",
  reason: "Tiêu đề và hai luồng đều đọc được.",
  recovery_action: "",
};

test("builds an image-first structured-output request", () => {
  const body = buildOpenAIBody(input, "gpt-5.6-terra");
  assert.equal(body.model, "gpt-5.6-terra");
  assert.equal(body.input[0].content[0].type, "input_image");
  assert.equal(body.input[0].content[0].image_url, "data:image/png;base64,aGVsbG8=");
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(body.text.format.schema.required.sort(), ["answer", "reason", "recovery_action", "route"]);
});

test("builds a compatible multimodal chat request", () => {
  const body = buildChatBody(input, "gc/gemini-2.5-flash");
  assert.equal(body.model, "gc/gemini-2.5-flash");
  assert.equal(body.messages[1].content[0].type, "image_url");
  assert.equal(body.messages[1].content[0].image_url.url, "data:image/png;base64,aGVsbG8=");
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(body.response_format.json_schema.strict, true);
});

test("builds a direct Gemini multimodal structured-output request", () => {
  const body = buildGeminiBody(input);
  assert.equal(body.contents[0].parts[0].inlineData.mimeType, "image/png");
  assert.equal(body.contents[0].parts[0].inlineData.data, "aGVsbG8=");
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.deepEqual(body.generationConfig.responseSchema.required.sort(), ["answer", "reason", "recovery_action", "route"]);
  assert.deepEqual(body.generationConfig.responseSchema.properties.route.enum, [
    "VISUAL_GROUNDED",
    "NEED_WIDER_REGION",
    "NEED_BETTER_IMAGE",
    "INSUFFICIENT",
  ]);
});

test("parses and validates structured output text", () => {
  assert.deepEqual(parseVisualResult({
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(grounded) }] }],
  }, "responses"), grounded);
  assert.deepEqual(parseVisualResult({
    choices: [{ message: { content: JSON.stringify(grounded) } }],
  }, "chat"), grounded);
  assert.deepEqual(parseVisualResult({
    candidates: [{ content: { parts: [{ text: JSON.stringify(grounded) }] } }],
  }, "gemini"), grounded);
});

test("enforces non-empty grounded and recovery content", () => {
  assert.throws(() => validateResult({
    ...grounded,
    answer: " ",
  }), /answer is required/);
  assert.throws(() => validateResult({
    route: "NEED_WIDER_REGION",
    answer: "Một phỏng đoán",
    reason: "Thiếu nhãn",
    recovery_action: "Chọn rộng hơn",
  }), /answer must be empty/);
  assert.throws(() => validateResult({
    route: "NEED_WIDER_REGION",
    answer: "",
    reason: " ",
    recovery_action: "Chọn rộng hơn",
  }), /reason is required/);
});

test("calls the fixed endpoint and returns the validated result", async () => {
  let request;
  const result = await analyzeVisual(input, {
    provider: {
      name: "openai",
      protocol: "responses",
      endpoint: "https://api.openai.com/v1/responses",
      apiKey: "secret-key",
      model: "gpt-5.6-terra",
      configured: true,
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({
        output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(grounded) }] }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });

  assert.deepEqual(result, grounded);
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.options.headers.Authorization, "Bearer secret-key");
  assert.equal(JSON.parse(request.options.body).input[0].content[0].type, "input_image");
});

test("calls direct Gemini with API-key auth", async () => {
  let request;
  const result = await analyzeVisual(input, {
    provider: {
      name: "gemini",
      protocol: "gemini",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      apiKey: "gemini-key",
      model: "gemini-2.5-flash",
      configured: true,
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(grounded) }] } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });

  assert.deepEqual(result, grounded);
  assert.equal(request.options.headers["x-goog-api-key"], "gemini-key");
  assert.equal(JSON.parse(request.options.body).contents[0].parts[0].inlineData.mimeType, "image/png");
});

test("calls compatible providers with optional authorization", async () => {
  for (const provider of [
    {
      name: "openrouter",
      protocol: "chat",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "router-key",
      model: "openai/gpt-4o-mini",
      configured: true,
    },
    {
      name: "9router",
      protocol: "chat",
      endpoint: "http://localhost:20128/v1/chat/completions",
      apiKey: "",
      model: "gc/gemini-2.5-flash",
      configured: true,
    },
  ]) {
    let request;
    const result = await analyzeVisual(input, {
      provider,
      fetchImpl: async (url, options) => {
        request = { url, options };
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(grounded) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });
    assert.deepEqual(result, grounded);
    assert.equal(request.url, provider.endpoint);
    assert.equal("Authorization" in request.options.headers, Boolean(provider.apiKey));
    assert.equal(JSON.parse(request.options.body).messages[1].content[0].type, "image_url");
  }
});

test("reports upstream status without exposing the API key", async () => {
  await assert.rejects(
    () => analyzeVisual(input, {
      provider: {
        name: "openai",
        protocol: "responses",
        endpoint: "https://api.openai.com/v1/responses",
        apiKey: "secret-key",
        model: "gpt-5.6-terra",
        configured: true,
      },
      fetchImpl: async () => new Response("unauthorized", { status: 401 }),
    }),
    (error) => error.message === "openai API error 401" && !error.message.includes("secret-key"),
  );
});
