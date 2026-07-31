import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFallbackLessonSummary,
  buildLessonSummaryBody,
  parseLessonSummary,
  validateLessonSummary,
} from "../src/lesson-summary.mjs";

const pages = [
  { page: 1, text: "AI cần được kiểm tra bằng dữ liệu thực tế. Con người vẫn chịu trách nhiệm cuối cùng." },
  { page: 2, text: "Prototype giúp kiểm tra giả thuyết trước khi đầu tư xây dựng sản phẩm." },
];

const result = {
  summary: "Bài học nhấn mạnh kiểm chứng và trách nhiệm.",
  key_points: [{ page: 1, quote: "AI cần được kiểm tra bằng dữ liệu thực tế.", explanation: "Cần có bằng chứng." }],
};

test("builds structured requests for every configured protocol", () => {
  const responses = buildLessonSummaryBody({ documentName: "Bài học", pages }, { protocol: "responses", model: "o4-mini" });
  assert.equal(responses.text.format.type, "json_schema");
  assert.equal(responses.text.format.strict, true);
  assert.match(responses.input[0].content[0].text, /NGUYÊN VĂN/);

  const gemini = buildLessonSummaryBody({ documentName: "Bài học", pages }, { protocol: "gemini", model: "gemini" });
  assert.equal(gemini.generationConfig.responseMimeType, "application/json");
  assert.equal(gemini.generationConfig.responseSchema.type, "OBJECT");

  const chat = buildLessonSummaryBody({ documentName: "Bài học", pages }, { protocol: "chat", model: "model" });
  assert.equal(chat.response_format.type, "json_schema");
  assert.equal(chat.stream, false);
});

test("keeps only grounded key points and caps output", () => {
  const keyPoints = Array.from({ length: 10 }, (_, index) => ({
    page: index === 1 ? 2 : 1,
    quote: index === 1 ? "Nội dung không tồn tại" : "AI cần được kiểm tra bằng dữ liệu thực tế.",
    explanation: "x".repeat(700),
  }));
  const validated = validateLessonSummary({ summary: "s".repeat(7_000), key_points: keyPoints }, pages);
  assert.equal(validated.summary.length, 6_000);
  assert.equal(validated.key_points.length, 7);
  assert.ok(validated.key_points.every((item) => item.explanation.length === 500));
});

test("matches normalized contiguous quotes only on the cited page", () => {
  const validated = validateLessonSummary({
    ...result,
    key_points: [
      { page: 1, quote: "ai   CẦN được kiểm tra bằng dữ liệu thực tế.", explanation: "Khớp." },
      { page: 2, quote: "AI cần được kiểm tra", explanation: "Sai trang." },
      { page: 1, quote: "AI kiểm tra dữ liệu", explanation: "Không liên tục." },
      { page: 99, quote: "AI cần được kiểm tra bằng dữ liệu thực tế.", explanation: "Sai trang." },
    ],
  }, pages);
  assert.deepEqual(validated.key_points, [{
    page: 1,
    quote: "ai CẦN được kiểm tra bằng dữ liệu thực tế.",
    explanation: "Khớp.",
  }]);
});

test("parses structured chat output and rejects malformed JSON", () => {
  assert.deepEqual(parseLessonSummary({ choices: [{ message: { content: JSON.stringify(result) } }] }, "chat", pages), result);
  assert.throws(
    () => parseLessonSummary({ choices: [{ message: { content: "not json" } }] }, "chat", pages),
    /invalid lesson-summary JSON/,
  );
});

test("creates a deterministic fallback with exact source quotes", () => {
  const fallback = buildFallbackLessonSummary(pages);
  assert.equal(fallback.key_points.length, 2);
  fallback.key_points.forEach((item) => {
    assert.ok(pages.find((page) => page.page === item.page).text.includes(item.quote));
  });
});
