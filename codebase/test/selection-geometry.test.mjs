import assert from "node:assert/strict";
import test from "node:test";

import {
  SELECTION_SOURCES,
  circlePointsToBounds,
  clampBounds,
  createSelection,
  intersectionRatio,
  rectToNormalizedBounds,
} from "../src/selection-geometry.mjs";

function assertBounds(actual, expected) {
  for (const key of ["x", "y", "width", "height"]) {
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-12, `${key}: ${actual[key]}`);
  }
}

test("creates the exact shared selection shape", () => {
  assert.deepEqual(
    createSelection({
      pageNumber: 2,
      source: "snip",
      bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4, ignored: true },
      label: "  Vùng tự chọn  ",
    }),
    {
      pageNumber: 2,
      source: "snip",
      bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      label: "Vùng tự chọn",
      text: "",
      needsOcr: false,
    },
  );
  assert.deepEqual(SELECTION_SOURCES, [
    "snip",
    "circle",
    "detected-image",
    "detected-text",
  ]);
});

test("rejects invalid selection metadata", () => {
  const bounds = { x: 0, y: 0, width: 1, height: 1 };
  assert.throws(
    () => createSelection({ pageNumber: 0, source: "snip", bounds, label: "Vùng" }),
    /pageNumber/,
  );
  assert.throws(
    () => createSelection({ pageNumber: 1, source: "unknown", bounds, label: "Vùng" }),
    /source/,
  );
  assert.throws(
    () => createSelection({ pageNumber: 1, source: "snip", bounds, label: " " }),
    /label/,
  );
});

test("clamps bounds to the normalized page", () => {
  assertBounds(
    clampBounds({ x: -0.1, y: 0.8, width: 0.5, height: 0.4 }),
    { x: 0, y: 0.8, width: 0.4, height: 0.2 },
  );
});

test("rejects non-finite or collapsed bounds", () => {
  assert.throws(
    () => clampBounds({ x: Number.NaN, y: 0, width: 1, height: 1 }),
    /finite/,
  );
  assert.throws(
    () => clampBounds({ x: 1.2, y: 0, width: 0.2, height: 0.2 }),
    /positive area/,
  );
});

test("normalizes a reverse drag inside the page", () => {
  assertBounds(
    rectToNormalizedBounds(
      { x: 500, y: 350 },
      { x: 200, y: 150 },
      { left: 100, top: 50, width: 800, height: 500 },
    ),
    { x: 0.125, y: 0.2, width: 0.375, height: 0.4 },
  );
});

test("clips a drag that starts outside the page", () => {
  assertBounds(
    rectToNormalizedBounds(
      { x: 50, y: 0 },
      { x: 300, y: 250 },
      { left: 100, top: 50, width: 800, height: 500 },
    ),
    { x: 0, y: 0, width: 0.25, height: 0.4 },
  );
});

test("adds padding around circle points and clamps page edges", () => {
  assertBounds(
    circlePointsToBounds([
      { x: 0.01, y: 0.1 },
      { x: 0.2, y: 0.4 },
      { x: 0.1, y: 0.3 },
    ], 0.02),
    { x: 0, y: 0.08, width: 0.22, height: 0.34 },
  );
});

test("rejects invalid circle points and padding", () => {
  assert.throws(() => circlePointsToBounds([], 0.02), /points/);
  assert.throws(
    () => circlePointsToBounds([{ x: 0.2, y: 0.2 }], -0.01),
    /padding/,
  );
});

test("computes intersection over union", () => {
  assert.equal(
    intersectionRatio(
      { x: 0, y: 0, width: 0.5, height: 0.5 },
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
    ),
    1 / 7,
  );
  assert.equal(
    intersectionRatio(
      { x: 0, y: 0, width: 0.1, height: 0.1 },
      { x: 0.9, y: 0.9, width: 0.1, height: 0.1 },
    ),
    0,
  );
});
