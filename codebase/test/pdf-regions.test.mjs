import assert from "node:assert/strict";
import test from "node:test";

import {
  detectGraphicCandidates,
  filterRegionCandidates,
  mergeTextItemsToCandidates,
} from "../public/pdf-regions.mjs";

const OPS = {
  save: 1,
  restore: 2,
  transform: 3,
  paintImageXObject: 4,
  constructPath: 5,
  fill: 6,
};

const viewport = {
  width: 100,
  height: 100,
  transform: [1, 0, 0, 1, 0, 0],
};

test("merges adjacent text items into one text-block candidate", () => {
  const candidates = mergeTextItemsToCandidates({
    pageNumber: 2,
    textItems: [
      { str: "Machine", bounds: { x: 0.1, y: 0.1, width: 0.12, height: 0.04 } },
      { str: "Learning", bounds: { x: 0.23, y: 0.1, width: 0.14, height: 0.04 } },
      { str: "Deep learning", bounds: { x: 0.1, y: 0.15, width: 0.27, height: 0.04 } },
    ],
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].kind, "text");
  assert.equal(candidates[0].id, "page-2-text-1");
  assert.ok(candidates[0].bounds.width >= 0.27);
});

test("derives a bitmap candidate from the current PDF transform", () => {
  const candidates = detectGraphicCandidates({
    pageNumber: 1,
    viewport,
    ops: OPS,
    operatorList: {
      fnArray: [OPS.save, OPS.transform, OPS.paintImageXObject, OPS.restore],
      argsArray: [[], [40, 0, 0, 30, 10, 10], ["img-1"], []],
    },
  });
  assert.deepEqual(candidates[0], {
    id: "page-1-image-1",
    kind: "image",
    bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.3 },
    label: "Vùng hình 1",
    confidence: 0.82,
  });
});

test("derives a conservative vector candidate from painted path bounds", () => {
  const candidates = detectGraphicCandidates({
    pageNumber: 4,
    viewport,
    ops: OPS,
    operatorList: {
      fnArray: [OPS.constructPath, OPS.fill],
      argsArray: [[[], [], [10, 15, 60, 55]], []],
    },
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].kind, "vector");
  assert.deepEqual(candidates[0].bounds, { x: 0.1, y: 0.15, width: 0.5, height: 0.4 });
});

test("rejects tiny and page-sized background candidates", () => {
  assert.deepEqual(filterRegionCandidates([
    { id: "tiny", kind: "image", bounds: { x: 0, y: 0, width: 0.02, height: 0.02 }, label: "tiny", confidence: 0.9 },
    { id: "background", kind: "image", bounds: { x: 0, y: 0, width: 0.99, height: 0.99 }, label: "background", confidence: 0.9 },
  ]), []);
});

test("removes near-duplicates in favor of higher confidence", () => {
  const candidates = filterRegionCandidates([
    { id: "low", kind: "image", bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 }, label: "low", confidence: 0.6 },
    { id: "high", kind: "vector", bounds: { x: 0.105, y: 0.105, width: 0.4, height: 0.4 }, label: "high", confidence: 0.9 },
  ]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, "high");
});

test("caps candidate overlays to avoid visual clutter", () => {
  const candidates = Array.from({ length: 20 }, (_, index) => ({
    id: `candidate-${index}`,
    kind: "text",
    bounds: { x: (index % 4) * 0.24, y: Math.floor(index / 4) * 0.18, width: 0.18, height: 0.08 },
    label: `Candidate ${index}`,
    confidence: 0.9 - index / 100,
  }));
  assert.equal(filterRegionCandidates(candidates, { maxCandidates: 12 }).length, 12);
});
