import test from "node:test";
import assert from "node:assert/strict";
import { findExactQuoteRects, mergeHighlightRects, toPixelBounds } from "../src/geometry.mjs";

test("converts normalized bounds to image pixels", () => {
  assert.deepEqual(
    toPixelBounds({ x: 0.25, y: 0.1, width: 0.5, height: 0.8 }, 1200, 800),
    { sx: 300, sy: 80, sw: 600, sh: 640 },
  );
});

test("rejects a region outside the image", () => {
  assert.throws(
    () => toPixelBounds({ x: 0.8, y: 0, width: 0.3, height: 1 }, 1200, 800),
    /inside the image/,
  );
});

test("finds an exact quote across ordered text fragments", () => {
  const fragments = [
    { text: "AI cần được", x: 0.1, y: 0.1, width: 0.2, height: 0.03 },
    { text: "kiểm tra", x: 0.31, y: 0.1, width: 0.12, height: 0.03 },
    { text: "bằng dữ liệu.", x: 0.1, y: 0.15, width: 0.22, height: 0.03 },
  ];
  assert.deepEqual(
    findExactQuoteRects(fragments, "ai  CẦN được kiểm tra bằng dữ liệu."),
    [
      { x: 0.1, y: 0.1, width: 0.33, height: 0.03 },
      { x: 0.1, y: 0.15, width: 0.22, height: 0.03 },
    ],
  );
});

test("does not highlight non-contiguous words", () => {
  const fragments = [
    { text: "AI cần được", x: 0.1, y: 0.1, width: 0.2, height: 0.03 },
    { text: "kiểm tra bằng dữ liệu.", x: 0.31, y: 0.1, width: 0.3, height: 0.03 },
  ];
  assert.deepEqual(findExactQuoteRects(fragments, "AI kiểm tra dữ liệu"), []);
});

test("merges adjacent rectangles only on the same line", () => {
  assert.deepEqual(mergeHighlightRects([
    { x: 0.1, y: 0.1, width: 0.1, height: 0.03 },
    { x: 0.205, y: 0.1, width: 0.1, height: 0.03 },
    { x: 0.1, y: 0.2, width: 0.1, height: 0.03 },
  ]), [
    { x: 0.1, y: 0.1, width: 0.205, height: 0.03 },
    { x: 0.1, y: 0.2, width: 0.1, height: 0.03 },
  ]);
});
