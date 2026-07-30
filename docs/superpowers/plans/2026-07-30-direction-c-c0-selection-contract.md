# Direction C C0 Selection Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the shared normalized selection contract and pure geometry functions that unblock Direction C packages C1–C7.

**Architecture:** Add one dependency-free ESM module under `codebase/src/` and one Node-native test file. The module knows only numbers and plain objects: no DOM, canvas, PDF.js, application state, or AI behavior. Downstream packages exchange selections only through the factory and exact normalized bounds defined here.

**Tech Stack:** Node.js 24 ESM, JavaScript, `node:test`, `node:assert/strict`; no new dependency.

## Global Constraints

- Direction B remains unchanged and must keep passing all existing tests.
- Selection sources are exactly `snip`, `circle`, `detected-image`, and `detected-text`.
- Bounds use normalized page coordinates `{ x, y, width, height }` in `[0, 1]` with positive width and height.
- `intersectionRatio(a, b)` means intersection-over-union and returns a number from `0` to `1`.
- C0 contains no DOM, PDF.js, canvas, OCR, provider, route, storage, or application-state code.
- Do not modify `codebase/public/app.js`, `codebase/server.mjs`, the existing `geometry.mjs`, or later Direction C modules in this package.
- The current uncommitted PDF.js legacy-build fix must be committed separately before creating parallel C branches; do not stage it with C0.

## File Map

```text
codebase/
├── src/
│   └── selection-geometry.mjs       # shared contract factory and pure geometry
└── test/
    └── selection-geometry.test.mjs  # contract and edge-case regression tests
```

## Public interface

```js
export const SELECTION_SOURCES = [
  "snip",
  "circle",
  "detected-image",
  "detected-text",
];

export function createSelection({
  pageNumber,
  source,
  bounds,
  label,
  text = "",
  needsOcr = false,
})
// -> frozen-shape plain object:
// {
//   pageNumber: integer >= 1,
//   source: one of SELECTION_SOURCES,
//   bounds: normalized valid bounds,
//   label: non-empty trimmed string,
//   text: string,
//   needsOcr: boolean,
// }

export function clampBounds(bounds)
// -> valid normalized bounds; clips overflow, rejects invalid/collapsed input

export function rectToNormalizedBounds(start, end, pageRect)
// start/end: { x, y } in viewport pixels
// pageRect: { left, top, width, height } in viewport pixels
// -> normalized bounds independent of drag direction

export function circlePointsToBounds(points, padding = 0.02)
// points: Array<{ x, y }> already normalized
// padding: normalized non-negative number
// -> padded and page-clamped normalized bounds

export function intersectionRatio(a, b)
// -> intersection-over-union in [0, 1]
```

---

### Task 1: Shared selection contract and geometry

**Files:**
- Create: `codebase/src/selection-geometry.mjs`
- Create: `codebase/test/selection-geometry.test.mjs`

**Interfaces:**
- Consumes: plain numeric points, rectangles, normalized bounds, and selection metadata.
- Produces: the exact public interface above for C1 Snip, C2 context extraction, C3/C4 detection, C5 overlays, C6 Circle integration, and C7 request packaging.

- [ ] **Step 1: Write the failing tests**

Create `codebase/test/selection-geometry.test.mjs`:

```js
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

test("creates the exact shared selection shape", () => {
  assert.deepEqual(
    createSelection({
      pageNumber: 2,
      source: "snip",
      bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
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
  assert.deepEqual(
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
  assert.deepEqual(
    rectToNormalizedBounds(
      { x: 500, y: 350 },
      { x: 200, y: 150 },
      { left: 100, top: 50, width: 800, height: 500 },
    ),
    { x: 0.125, y: 0.2, width: 0.375, height: 0.4 },
  );
});

test("clips a drag that starts outside the page", () => {
  assert.deepEqual(
    rectToNormalizedBounds(
      { x: 50, y: 0 },
      { x: 300, y: 250 },
      { left: 100, top: 50, width: 800, height: 500 },
    ),
    { x: 0, y: 0, width: 0.25, height: 0.4 },
  );
});

test("adds padding around circle points and clamps page edges", () => {
  assert.deepEqual(
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
```

- [ ] **Step 2: Run the test and verify the RED state**

Run:

```bash
node --test codebase/test/selection-geometry.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `codebase/src/selection-geometry.mjs`.

- [ ] **Step 3: Implement the minimal module**

Create `codebase/src/selection-geometry.mjs`:

```js
export const SELECTION_SOURCES = [
  "snip",
  "circle",
  "detected-image",
  "detected-text",
];

export function createSelection({
  pageNumber,
  source,
  bounds,
  label,
  text = "",
  needsOcr = false,
}) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new TypeError("pageNumber must be a positive integer");
  }
  if (!SELECTION_SOURCES.includes(source)) {
    throw new TypeError("source must be a supported selection source");
  }
  if (typeof label !== "string" || !label.trim()) {
    throw new TypeError("label must be a non-empty string");
  }
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (typeof needsOcr !== "boolean") throw new TypeError("needsOcr must be a boolean");

  return {
    pageNumber,
    source,
    bounds: clampBounds(bounds),
    label: label.trim(),
    text,
    needsOcr,
  };
}

export function clampBounds(bounds) {
  const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height];
  if (!values.every(Number.isFinite)) {
    throw new TypeError("bounds values must be finite numbers");
  }

  const left = Math.max(0, bounds.x);
  const top = Math.max(0, bounds.y);
  const right = Math.min(1, bounds.x + bounds.width);
  const bottom = Math.min(1, bounds.y + bounds.height);

  if (right <= left || bottom <= top) {
    throw new TypeError("bounds must have positive area inside the page");
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function rectToNormalizedBounds(start, end, pageRect) {
  const values = [
    start?.x,
    start?.y,
    end?.x,
    end?.y,
    pageRect?.left,
    pageRect?.top,
    pageRect?.width,
    pageRect?.height,
  ];
  if (!values.every(Number.isFinite) || pageRect.width <= 0 || pageRect.height <= 0) {
    throw new TypeError("points and pageRect must contain finite positive geometry");
  }

  const left = (Math.min(start.x, end.x) - pageRect.left) / pageRect.width;
  const top = (Math.min(start.y, end.y) - pageRect.top) / pageRect.height;
  const right = (Math.max(start.x, end.x) - pageRect.left) / pageRect.width;
  const bottom = (Math.max(start.y, end.y) - pageRect.top) / pageRect.height;

  return clampBounds({ x: left, y: top, width: right - left, height: bottom - top });
}

export function circlePointsToBounds(points, padding = 0.02) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new TypeError("points must be a non-empty array");
  }
  if (!Number.isFinite(padding) || padding < 0) {
    throw new TypeError("padding must be a non-negative finite number");
  }
  if (!points.every((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))) {
    throw new TypeError("points must contain finite coordinates");
  }

  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const left = Math.min(...xs) - padding;
  const top = Math.min(...ys) - padding;
  const right = Math.max(...xs) + padding;
  const bottom = Math.max(...ys) + padding;

  return clampBounds({ x: left, y: top, width: right - left, height: bottom - top });
}

export function intersectionRatio(a, b) {
  const first = clampBounds(a);
  const second = clampBounds(b);
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = first.width * first.height + second.width * second.height - intersection;
  return intersection / union;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test codebase/test/selection-geometry.test.mjs
```

Expected: 9 tests PASS, 0 fail.

- [ ] **Step 5: Run all repository checks**

Run:

```bash
npm --prefix codebase run check
npm --prefix codebase test
git diff --check
```

Expected:

- syntax check exits `0`;
- all existing tests plus 9 C0 tests pass;
- `git diff --check` has no output.

- [ ] **Step 6: Verify the public handoff surface**

Run:

```bash
node --input-type=module -e "import * as c0 from './codebase/src/selection-geometry.mjs'; console.log(Object.keys(c0).sort().join(','))"
```

Expected exact output:

```text
SELECTION_SOURCES,circlePointsToBounds,clampBounds,createSelection,intersectionRatio,rectToNormalizedBounds
```

- [ ] **Step 7: Commit only C0**

First verify unrelated changes remain unstaged:

```bash
git status --short
```

Then stage and commit only:

```bash
git add codebase/src/selection-geometry.mjs codebase/test/selection-geometry.test.mjs
git commit -m "Add Direction C selection contract"
```

Do not stage the PDF.js compatibility fix, Direction C design/plan documents, or any other package.

## C0 handoff checklist

C0 is ready for parallel work only when all are true:

- [ ] The six exact exports are present.
- [ ] All 9 focused tests pass.
- [ ] The full existing test suite remains green.
- [ ] No DOM, PDF.js, canvas, AI, or application-state import exists in the module.
- [ ] Bounds semantics and IoU semantics are recorded in this plan.
- [ ] C1–C7 owners branch from the commit containing C0 and the separately committed PDF.js legacy fix.
