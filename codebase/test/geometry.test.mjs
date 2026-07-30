import test from "node:test";
import assert from "node:assert/strict";
import { boundsFromPoints, classifyCircledContent, mergeHighlightRects, selectTextFragmentsByBox, toPixelBounds } from "../src/geometry.mjs";

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

test("turns a freehand loop into a padded normalized crop", () => {
  assert.deepEqual(
    boundsFromPoints([
      { x: 0.2, y: 0.3 },
      { x: 0.6, y: 0.3 },
      { x: 0.6, y: 0.7 },
      { x: 0.2, y: 0.7 },
    ], 0.02),
    { x: 0.18, y: 0.28, width: 0.44, height: 0.44 },
  );
});

test("clamps a circled crop to the page", () => {
  assert.deepEqual(
    boundsFromPoints([
      { x: 0, y: 0 },
      { x: 0.08, y: 0 },
      { x: 0.08, y: 0.08 },
    ], 0.03),
    { x: 0, y: 0, width: 0.11, height: 0.11 },
  );
});

test("distinguishes circled prose from diagrams and mixed regions", () => {
  assert.equal(classifyCircledContent("AI không sai. · Họ giải sai bài toán."), "text");
  assert.equal(classifyCircledContent(""), "visual");
  assert.equal(classifyCircledContent("Input · Model · Output · Error · Retry · Result"), "mixed");
  assert.equal(classifyCircledContent("AI không sai. · Họ giải sai bài toán.", true), "mixed");
});

test("selects text by visual position instead of PDF DOM order", () => {
  const fragments = [
    { text: "cột phải", x: 0.7, y: 0.3, width: 0.1, height: 0.03 },
    { text: "dòng hai", x: 0.1, y: 0.35, width: 0.12, height: 0.03 },
    { text: "cột giữa", x: 0.4, y: 0.3, width: 0.1, height: 0.03 },
    { text: "dòng một", x: 0.1, y: 0.3, width: 0.12, height: 0.03 },
  ];
  assert.deepEqual(
    selectTextFragmentsByBox(fragments, { x: 0.08, y: 0.29 }, { x: 0.24, y: 0.39 }, { paddingX: 0.005, paddingY: 0.005 })
      .map((fragment) => fragment.text),
    ["dòng một", "dòng hai"],
  );
});

test("selects the nearest word on a highlight click", () => {
  const fragments = [
    { text: "gần", x: 0.1, y: 0.2, width: 0.06, height: 0.03 },
    { text: "xa", x: 0.5, y: 0.2, width: 0.05, height: 0.03 },
  ];
  assert.equal(
    selectTextFragmentsByBox(fragments, { x: 0.12, y: 0.215 }, { x: 0.121, y: 0.215 }, { clickTolerance: 0.02 })[0].text,
    "gần",
  );
});

test("merges overlapping PDF glyph rects into one smooth line", () => {
  assert.deepEqual(mergeHighlightRects([
    { x: 0.1, y: 0.2, width: 0.08, height: 0.03 },
    { x: 0.17, y: 0.201, width: 0.07, height: 0.029 },
    { x: 0.245, y: 0.2, width: 0.06, height: 0.03 },
    { x: 0.1, y: 0.25, width: 0.12, height: 0.03 },
  ]), [
    { x: 0.1, y: 0.2, width: 0.205, height: 0.03 },
    { x: 0.1, y: 0.25, width: 0.12, height: 0.03 },
  ]);
});
