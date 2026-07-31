import assert from "node:assert/strict";
import test from "node:test";

import { resolveSlideContext } from "../public/slide-context.mjs";

test("resolves explicit slide and trang references", () => {
  assert.deepEqual(resolveSlideContext("Ở slide 5 có hình gì?", 2, 49), {
    pageNumber: 5,
    explicit: true,
    valid: true,
  });
  assert.deepEqual(resolveSlideContext("Giải thích TRANG 12", 2, 49), {
    pageNumber: 12,
    explicit: true,
    valid: true,
  });
});

test("uses the current page when no page reference exists", () => {
  assert.deepEqual(resolveSlideContext("Giải thích 4 thành phần trong hình", 7, 49), {
    pageNumber: 7,
    explicit: false,
    valid: true,
  });
});

test("rejects explicit pages outside the document", () => {
  assert.deepEqual(resolveSlideContext("slide 0 nói gì?", 3, 49), {
    pageNumber: 0,
    explicit: true,
    valid: false,
  });
  assert.deepEqual(resolveSlideContext("trang 50 nói gì?", 3, 49), {
    pageNumber: 50,
    explicit: true,
    valid: false,
  });
});
