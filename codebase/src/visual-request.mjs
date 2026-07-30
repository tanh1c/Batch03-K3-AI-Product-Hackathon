import { createSelection } from "./selection-geometry.mjs";

const SOURCE_LABELS = Object.freeze({
  snip: "Vùng cắt",
  circle: "Vùng khoanh",
  "detected-image": "Vùng hình được gợi ý",
  "detected-text": "Vùng chữ được gợi ý",
});

export function buildVisualRequest({ selection, context, question } = {}) {
  const validatedSelection = createSelection(selection || {});
  validateContext(context);

  if (typeof question !== "string" || !question.trim() || question.length > 1000) {
    throw new TypeError("question must contain between 1 and 1000 characters");
  }
  if (context.needsOcr !== !context.text.trim()) {
    throw new TypeError("needsOcr must be true exactly when bounded text is empty");
  }

  return {
    imageData: context.imageData,
    mediaType: context.mediaType,
    question: question.trim(),
    slideNumber: validatedSelection.pageNumber,
    nearbyText: context.text,
    needsOcr: context.needsOcr,
    selectionSource: validatedSelection.source,
    selectedAreaRatio: validatedSelection.bounds.width * validatedSelection.bounds.height,
    hasTextLayer: !context.needsOcr,
  };
}

export function formatSelectionProvenance(selection) {
  const validatedSelection = createSelection(selection || {});
  return `Dựa trên vùng đã chọn ở slide ${validatedSelection.pageNumber} · ${SOURCE_LABELS[validatedSelection.source]}`;
}

function validateContext(context) {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    throw new TypeError("context must be a C2 result object");
  }
  if (
    typeof context.imageData !== "string"
    || !context.imageData
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(context.imageData)
  ) {
    throw new TypeError("imageData must be non-empty base64");
  }
  if (context.mediaType !== "image/png") {
    throw new TypeError("mediaType must be image/png");
  }
  if (typeof context.text !== "string" || context.text.length > 4000) {
    throw new TypeError("bounded text must be a string of at most 4000 characters");
  }
  if (typeof context.needsOcr !== "boolean") {
    throw new TypeError("needsOcr must be a boolean");
  }

  const bounds = context.pixelBounds;
  const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height];
  if (
    !values.every(Number.isInteger)
    || bounds.x < 0
    || bounds.y < 0
    || bounds.width <= 0
    || bounds.height <= 0
  ) {
    throw new TypeError("pixelBounds must contain non-negative integer coordinates and positive dimensions");
  }
}
