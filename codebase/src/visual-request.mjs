import {
  SELECTION_SOURCES,
  clampBounds,
  createSelection,
} from "./selection-geometry.mjs";

const METADATA_KEYS = ["bounds", "label", "needsOcr", "source"];

export function buildVisualRequest({
  selection,
  context,
  question,
}) {
  if (!context || typeof context !== "object") {
    throw new TypeError("context is required");
  }
  const normalizedQuestion = typeof question === "string" ? question.trim() : "";
  if (!normalizedQuestion || normalizedQuestion.length > 1000) {
    throw new TypeError("question must contain 1 to 1000 characters");
  }
  if (typeof context.imageData !== "string" || !context.imageData) {
    throw new TypeError("context imageData is required");
  }
  if (context.mediaType !== "image/png") {
    throw new TypeError("context mediaType must be image/png");
  }
  const text = typeof context.text === "string"
    ? context.text.replace(/\s+/g, " ").trim().slice(0, 4000)
    : "";
  if (typeof context.needsOcr !== "boolean" || context.needsOcr !== !text) {
    throw new TypeError("context needsOcr must match bounded text availability");
  }
  const normalizedSelection = createSelection({
    ...selection,
    text,
    needsOcr: context.needsOcr,
  });

  return {
    imageData: context.imageData,
    mediaType: context.mediaType,
    question: normalizedQuestion,
    slideNumber: normalizedSelection.pageNumber,
    nearbyText: text,
    selection: validateSelectionMetadata({
      source: normalizedSelection.source,
      bounds: normalizedSelection.bounds,
      label: normalizedSelection.label,
      needsOcr: normalizedSelection.needsOcr,
    }),
  };
}

export function validateSelectionMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new TypeError("selection metadata must be an object");
  }
  const keys = Object.keys(metadata).sort();
  if (JSON.stringify(keys) !== JSON.stringify(METADATA_KEYS)) {
    throw new TypeError("selection metadata has unexpected fields");
  }
  if (!SELECTION_SOURCES.includes(metadata.source)) {
    throw new TypeError("selection source is not supported");
  }
  if (typeof metadata.label !== "string" || !metadata.label.trim()) {
    throw new TypeError("selection label must be a non-empty string");
  }
  if (typeof metadata.needsOcr !== "boolean") {
    throw new TypeError("selection needsOcr must be a boolean");
  }
  return {
    source: metadata.source,
    bounds: clampBounds(metadata.bounds),
    label: metadata.label.trim(),
    needsOcr: metadata.needsOcr,
  };
}
