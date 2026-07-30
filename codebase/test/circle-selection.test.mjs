import assert from "node:assert/strict";
import test from "node:test";

import { createCircleSelection } from "../public/circle-selection.mjs";

test("creates a padded shared selection without mutating circle points", () => {
  const points = [
    { x: 0.2, y: 0.25 },
    { x: 0.6, y: 0.25 },
    { x: 0.6, y: 0.7 },
    { x: 0.2, y: 0.7 },
  ];
  const before = structuredClone(points);
  assert.deepEqual(createCircleSelection({ pageNumber: 3, points }), {
    pageNumber: 3,
    source: "circle",
    bounds: { x: 0.18, y: 0.23, width: 0.44, height: 0.49 },
    label: "Vùng khoanh",
    text: "",
    needsOcr: false,
  });
  assert.deepEqual(points, before);
});

test("clamps padded circle bounds at page edges", () => {
  const selection = createCircleSelection({
    pageNumber: 1,
    points: [{ x: 0.005, y: 0.01 }, { x: 0.15, y: 0.2 }],
    padding: 0.02,
  });
  assert.deepEqual(selection.bounds, { x: 0, y: 0, width: 0.17, height: 0.22 });
});

test("rejects invalid points through the shared geometry contract", () => {
  assert.throws(() => createCircleSelection({ pageNumber: 1, points: [] }), /points/);
  assert.throws(() => createCircleSelection({
    pageNumber: 1,
    points: [{ x: Number.NaN, y: 0.2 }],
  }), /finite/);
});
