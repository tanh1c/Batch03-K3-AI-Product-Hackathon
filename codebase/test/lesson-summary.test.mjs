import test from "node:test";
import assert from "node:assert/strict";
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

test("builds a structured Responses request", () => {
  const body = buildLessonSummaryBody({ documentName: "Bài học", pages }, { protocol: "responses", model: "gpt-5.6-terra" });
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.match(body.input[0].content[0].text, /NGUYÊN VĂN/);
});

test("keeps only quotes that exist on the referenced page", () => {
  const validated = validateLessonSummary({
    ...result,
    key_points: [...result.key_points, { page: 2, quote: "Nội dung không tồn tại", explanation: "Sai" }],
  }, pages);
  assert.deepEqual(validated.key_points, result.key_points);
});

test("parses a chat structured response", () => {
  assert.deepEqual(parseLessonSummary({ choices: [{ message: { content: JSON.stringify(result) } }] }, "chat", pages), result);
});

test("creates a grounded fallback with exact quotes", () => {
  const fallback = buildFallbackLessonSummary(pages);
  assert.equal(fallback.key_points.length, 2);
  fallback.key_points.forEach((item) => assert.ok(pages.find((page) => page.page === item.page).text.includes(item.quote)));
});
