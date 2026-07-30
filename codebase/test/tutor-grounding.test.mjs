import test from "node:test";
import assert from "node:assert/strict";
import { buildTutorPrompt } from "../src/tutor-grounding.mjs";

test("selected slide text is included as direct document evidence", () => {
  const prompt = buildTutorPrompt({
    documentName: "AI Day 1.pdf",
    currentPage: 2,
    selectedPage: 2,
    selectedText: "Machine Learning và Deep Learning",
    contextPages: [{ page: 2, text: "So sánh hai cách học từ dữ liệu." }],
    question: "Hai khái niệm trên là gì?",
  });

  assert.match(prompt.input, /ĐOẠN NGƯỜI HỌC ĐÃ CHỌN TRỰC TIẾP TỪ TÀI LIỆU/);
  assert.match(prompt.input, /Machine Learning và Deep Learning/);
  assert.match(prompt.input, /\[Trang 2\]/);
});

test("prompt permits clearly labelled background knowledge for a term on the slide", () => {
  const prompt = buildTutorPrompt({
    documentName: "AI Day 1.pdf",
    currentPage: 2,
    contextPages: [{ page: 2, text: "Machine Learning và Deep Learning" }],
    question: "Định nghĩa là gì?",
  });

  assert.match(prompt.instructions, /được dùng kiến thức nền ổn định/i);
  assert.match(prompt.instructions, /Kiến thức nền bổ sung:/);
  assert.match(prompt.instructions, /không được nói tài liệu không đề cập/i);
});
