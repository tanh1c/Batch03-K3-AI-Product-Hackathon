import assert from "node:assert/strict";
import test from "node:test";

import { MIN_SNIP_SIZE_PX, createSnipSelection } from "../src/snip.mjs";

const pageRect = { left: 100, top: 50, width: 800, height: 500 };

function assertBounds(actual, expected) {
  for (const key of ["x", "y", "width", "height"]) {
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-12, `${key}: ${actual[key]}`);
  }
}

test("creates the exact C0 Snip selection from a reverse drag", () => {
  const selection = createSnipSelection({
    pageNumber: 2,
    start: { x: 500, y: 350 },
    end: { x: 200, y: 150 },
    pageRect,
  });
  assert.deepEqual(
    { ...selection, bounds: undefined },
    {
      pageNumber: 2,
      source: "snip",
      bounds: undefined,
      label: "Vùng tự chọn",
      text: "",
      needsOcr: false,
    },
  );
  assertBounds(selection.bounds, { x: 0.125, y: 0.2, width: 0.375, height: 0.4 });
  assert.equal(MIN_SNIP_SIZE_PX, 12);
});

test("accepts a drag exactly at the minimum size", () => {
  assert.ok(createSnipSelection({
    pageNumber: 1,
    start: { x: 120, y: 70 },
    end: { x: 132, y: 82 },
    pageRect,
  }));
});

test("rejects a drag when either clipped dimension is too small", () => {
  assert.equal(createSnipSelection({
    pageNumber: 1,
    start: { x: 120, y: 70 },
    end: { x: 131, y: 100 },
    pageRect,
  }), null);
  assert.equal(createSnipSelection({
    pageNumber: 1,
    start: { x: 120, y: 70 },
    end: { x: 150, y: 81 },
    pageRect,
  }), null);
});

test("measures a partially outside drag after clipping to the page", () => {
  assert.equal(createSnipSelection({
    pageNumber: 1,
    start: { x: 0, y: 0 },
    end: { x: 110, y: 100 },
    pageRect,
  }), null);
  const selection = createSnipSelection({
    pageNumber: 1,
    start: { x: 0, y: 0 },
    end: { x: 120, y: 100 },
    pageRect,
  });
  assertBounds(selection.bounds, { x: 0, y: 0, width: 0.025, height: 0.1 });
});

test("rejects a drag completely outside the page", () => {
  assert.equal(createSnipSelection({
    pageNumber: 1,
    start: { x: 0, y: 0 },
    end: { x: 50, y: 40 },
    pageRect,
  }), null);
});

test("rejects invalid geometry and minimum size", () => {
  assert.throws(() => createSnipSelection({
    pageNumber: 1,
    start: { x: 120, y: 70 },
    end: { x: 150, y: 100 },
    pageRect: { ...pageRect, width: 0 },
  }), /pageRect/);
  assert.throws(() => createSnipSelection({
    pageNumber: 1,
    start: { x: Number.NaN, y: 70 },
    end: { x: 150, y: 100 },
    pageRect,
  }), /points/);
  assert.throws(() => createSnipSelection({
    pageNumber: 1,
    start: { x: 120, y: 70 },
    end: { x: 150, y: 100 },
    pageRect,
    minimumSize: 0,
  }), /minimumSize/);
});
