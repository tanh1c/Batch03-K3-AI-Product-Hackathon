import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChatBody,
  buildGeminiBody,
  buildInstruction,
  buildOpenAIBody,
} from "../src/visual-analysis.mjs";

const baseInput = {
  imageData: "aGVsbG8=",
  mediaType: "image/png",
  question: "Giải thích vùng này",
  slideNumber: 2,
  nearbyText: "Nhãn nằm trong vùng chọn",
  needsOcr: false,
  selectionSource: "snip",
  selectedAreaRatio: 0.2,
  hasTextLayer: true,
};

test("uses the crop and bounded C2 text without requesting OCR", () => {
  const instruction = buildInstruction(baseInput);

  assert.match(instruction, /vùng hình đã chọn/i);
  assert.match(instruction, /văn bản.*trong vùng chọn/i);
  assert.match(instruction, /Nhãn nằm trong vùng chọn/);
  assert.doesNotMatch(instruction, /đọc chữ trực tiếp/i);
});

test("preserves the legacy Direction B nearby-text instruction", () => {
  const { needsOcr, selectionSource, selectedAreaRatio, hasTextLayer, ...legacyInput } = baseInput;
  const instruction = buildInstruction(legacyInput);

  assert.match(instruction, /Text lân cận: Nhãn nằm trong vùng chọn/);
  assert.doesNotMatch(instruction, /văn bản được trích xuất chỉ trong vùng chọn/i);
});

test("asks the same multimodal model to read only the crop when needsOcr is true", () => {
  const instruction = buildInstruction({
    ...baseInput,
    nearbyText: "",
    needsOcr: true,
    hasTextLayer: false,
  });

  assert.match(instruction, /đọc chữ trực tiếp/i);
  assert.match(instruction, /chỉ.*vùng hình đã chọn/i);
  assert.match(instruction, /không.*đoán/i);
  assert.match(instruction, /NEED_BETTER_IMAGE/);
  assert.match(instruction, /NEED_WIDER_REGION/);
  assert.match(instruction, /không.*citation/i);
  assert.doesNotMatch(instruction, /gửi toàn bộ (trang|slide)/i);
});

test("uses one OCR-aware instruction across every provider protocol", () => {
  const input = {
    ...baseInput,
    nearbyText: "",
    needsOcr: true,
    hasTextLayer: false,
  };
  const expected = buildInstruction(input);
  const responses = buildOpenAIBody(input, "gpt-5.6-terra");
  const gemini = buildGeminiBody(input);
  const chat = buildChatBody(input, "gc/gemini-2.5-flash");

  assert.equal(responses.input[0].content[1].text, expected);
  assert.equal(gemini.contents[0].parts[1].text, expected);
  assert.equal(chat.messages[1].content[1].text, expected);
  assert.deepEqual(responses.text.format.schema.properties.route.enum, [
    "VISUAL_GROUNDED",
    "NEED_WIDER_REGION",
    "NEED_BETTER_IMAGE",
    "INSUFFICIENT",
  ]);
  assert.deepEqual(responses.text.format.schema.required, [
    "route",
    "answer",
    "reason",
    "recovery_action",
  ]);
});
