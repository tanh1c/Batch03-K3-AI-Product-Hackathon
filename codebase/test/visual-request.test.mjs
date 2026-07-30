import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVisualRequest,
  validateSelectionMetadata,
} from "../src/visual-request.mjs";

const selection = {
  pageNumber: 2,
  source: "snip",
  bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  label: "Vùng cắt",
  text: "",
  needsOcr: false,
};

const context = {
  imageData: "Y3JvcA==",
  mediaType: "image/png",
  text: "  Nội dung được chọn  ",
  needsOcr: false,
  pixelBounds: { sx: 100, sy: 100, sw: 300, sh: 200 },
};

test("builds the existing visual payload plus bounded selection metadata", () => {
  assert.deepEqual(buildVisualRequest({
    selection,
    context,
    question: "  Giải thích vùng này  ",
  }), {
    imageData: "Y3JvcA==",
    mediaType: "image/png",
    question: "Giải thích vùng này",
    slideNumber: 2,
    nearbyText: "Nội dung được chọn",
    selection: {
      source: "snip",
      bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      label: "Vùng cắt",
      needsOcr: false,
    },
  });
});

test("uses context truth for OCR metadata without mutating inputs", () => {
  const originalSelection = structuredClone(selection);
  const request = buildVisualRequest({
    selection,
    context: { ...context, text: "", needsOcr: true },
    question: "Đọc hình",
  });
  assert.equal(request.selection.needsOcr, true);
  assert.equal(request.nearbyText, "");
  assert.deepEqual(selection, originalSelection);
  assert.equal("text" in request.selection, false);
  assert.equal("imageData" in request.selection, false);
});

test("validates exact safe selection metadata", () => {
  assert.deepEqual(validateSelectionMetadata({
    source: "circle",
    bounds: { x: 0, y: 0, width: 0.5, height: 0.5 },
    label: "Vùng khoanh",
    needsOcr: true,
  }), {
    source: "circle",
    bounds: { x: 0, y: 0, width: 0.5, height: 0.5 },
    label: "Vùng khoanh",
    needsOcr: true,
  });
  assert.throws(() => validateSelectionMetadata({
    source: "unknown",
    bounds: selection.bounds,
    label: "Vùng",
    needsOcr: false,
  }), /source/);
  assert.throws(() => validateSelectionMetadata({
    source: "snip",
    bounds: selection.bounds,
    label: "Vùng",
    needsOcr: false,
    rawText: "private",
  }), /unexpected/);
});

test("rejects invalid question or image context before a request", () => {
  assert.throws(() => buildVisualRequest({ selection, context, question: " " }), /question/);
  assert.throws(() => buildVisualRequest({
    selection,
    context: { ...context, imageData: "" },
    question: "Hỏi",
  }), /imageData/);
});
