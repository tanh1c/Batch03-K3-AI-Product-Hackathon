import test from "node:test";
import assert from "node:assert/strict";
import { toPixelBounds } from "../src/geometry.mjs";

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
