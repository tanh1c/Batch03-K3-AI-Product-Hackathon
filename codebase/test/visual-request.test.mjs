import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVisualRequest,
  formatSelectionProvenance,
} from "../src/visual-request.mjs";

const selection = {
  pageNumber: 2,
  source: "snip",
  bounds: { x: 0.1, y: 0.2, width: 0.4, height: 0.5 },
  label: "Vùng tự chọn",
  text: "",
  needsOcr: false,
};

const textContext = {
  imageData: "Y3JvcA==",
  mediaType: "image/png",
  text: "Nội dung chỉ nằm trong vùng chọn",
  needsOcr: false,
  pixelBounds: { x: 100, y: 200, width: 400, height: 500 },
};

test("packages bounded C2 text into the exact Direction C request", () => {
  assert.deepEqual(
    buildVisualRequest({
      selection,
      context: textContext,
      question: "  Giải thích vùng này  ",
    }),
    {
      imageData: "Y3JvcA==",
      mediaType: "image/png",
      question: "Giải thích vùng này",
      slideNumber: 2,
      nearbyText: "Nội dung chỉ nằm trong vùng chọn",
      needsOcr: false,
      selectionSource: "snip",
      selectedAreaRatio: 0.2,
      hasTextLayer: true,
    },
  );
});

test("packages a no-text C2 result for OCR in the same multimodal call", () => {
  const request = buildVisualRequest({
    selection,
    context: { ...textContext, text: "", needsOcr: true },
    question: "Đọc nội dung này",
  });

  assert.equal(request.nearbyText, "");
  assert.equal(request.needsOcr, true);
  assert.equal(request.hasTextLayer, false);
});

test("rejects invalid questions and C2 payloads", () => {
  assert.throws(
    () => buildVisualRequest({ selection, context: textContext, question: " " }),
    /question/i,
  );
  assert.throws(
    () => buildVisualRequest({ selection, context: textContext, question: "x".repeat(1001) }),
    /question/i,
  );
  assert.throws(
    () => buildVisualRequest({
      selection,
      context: { ...textContext, mediaType: "image/jpeg" },
      question: "Giải thích",
    }),
    /mediaType/i,
  );
  assert.throws(
    () => buildVisualRequest({
      selection,
      context: { ...textContext, imageData: "not base64!" },
      question: "Giải thích",
    }),
    /imageData/i,
  );
  assert.throws(
    () => buildVisualRequest({
      selection,
      context: { ...textContext, pixelBounds: { x: 0, y: 0, width: 0, height: 10 } },
      question: "Giải thích",
    }),
    /pixelBounds/i,
  );
});

test("rejects inconsistent OCR state and invalid C0 selections", () => {
  assert.throws(
    () => buildVisualRequest({
      selection,
      context: { ...textContext, needsOcr: true },
      question: "Giải thích",
    }),
    /needsOcr/i,
  );
  assert.throws(
    () => buildVisualRequest({
      selection: { ...selection, source: "unknown" },
      context: textContext,
      question: "Giải thích",
    }),
    /source/i,
  );
});

test("formats provenance for every Direction C selection source", () => {
  const expected = {
    snip: "Vùng cắt",
    circle: "Vùng khoanh",
    "detected-image": "Vùng hình được gợi ý",
    "detected-text": "Vùng chữ được gợi ý",
  };

  for (const [source, label] of Object.entries(expected)) {
    assert.equal(
      formatSelectionProvenance({ ...selection, source }),
      `Dựa trên vùng đã chọn ở slide 2 · ${label}`,
    );
  }
  assert.throws(
    () => formatSelectionProvenance({ ...selection, source: "unknown" }),
    /source/i,
  );
});
