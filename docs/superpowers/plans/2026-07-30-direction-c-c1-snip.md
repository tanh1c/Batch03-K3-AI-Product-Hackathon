# Direction C C1 Snip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rectangular Snip tool that lets a learner drag on any rendered page and produces the exact shared C0 selection contract without cropping or calling AI.

**Architecture:** Add one DOM-free `src/snip.mjs` policy module that clips the drag to the page, rejects regions smaller than 12 CSS pixels, and delegates normalized geometry/shape creation to C0. `public/app.js` remains the composition root: it owns pointer capture, in-memory current selection, and one percentage-based DOM outline. Express exposes the two tested source modules explicitly; C1 does not add crop, text extraction, persistence, detection, Circle integration, or request orchestration.

**Tech Stack:** Node.js 24 ESM, JavaScript, `node:test`, `node:assert/strict`, Express 5, native Pointer Events and CSS; no new dependency.

## Global Constraints

- Direction B remains unchanged and all existing tests must keep passing.
- Consume C0 from `codebase/src/selection-geometry.mjs`; do not duplicate or modify its contract.
- C1 produces `{ pageNumber, source: "snip", bounds, label: "Vùng tự chọn", text: "", needsOcr: false }` or `null` for a too-small drag.
- Bounds are normalized page coordinates, independent of canvas pixels, device pixel ratio, and CSS zoom.
- Measure the minimum size after clipping the drag to the visible page rectangle.
- A rejected or cancelled drag preserves the previous valid Snip selection.
- A valid Snip replaces the previous Snip selection and clears only the old Direction B visual-region selection.
- Snip state is in memory only and is cleared when switching documents.
- C1 does not crop pixels, extract text, call `/api/analyze` or `/api/tutor`, persist selection, detect regions, or modify Circle behavior.
- Do not add dependencies or copy source modules into `public/`.
- Do not commit or push during execution unless the user explicitly requests it.

## File Map

```text
codebase/
├── public/
│   ├── app.js                         # pointer composition and outline state
│   ├── index.html                     # visible Snip mode button
│   └── styles.css                     # crosshair and selection outline
├── src/
│   └── snip.mjs                       # pure minimum-size and selection policy
├── test/
│   ├── snip.test.mjs                  # pure behavior tests
│   └── snip-wiring.test.mjs           # browser-module route/UI wiring regression
└── server.mjs                         # explicit source-module routes
```

## Public Interface

```js
export const MIN_SNIP_SIZE_PX = 12;

export function createSnipSelection({
  pageNumber,
  start,
  end,
  pageRect,
  minimumSize = MIN_SNIP_SIZE_PX,
})
// -> exact C0 selection object | null
```

---

### Task 1: Pure Snip selection policy

**Files:**
- Create: `codebase/src/snip.mjs`
- Create: `codebase/test/snip.test.mjs`

**Interfaces:**
- Consumes: `createSelection(options)` and `rectToNormalizedBounds(start, end, pageRect)` from C0.
- Produces: `MIN_SNIP_SIZE_PX` and `createSnipSelection(options)` for browser composition and later C2/C8 integration.

- [ ] **Step 1: Write the failing tests**

Create `codebase/test/snip.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { MIN_SNIP_SIZE_PX, createSnipSelection } from "../src/snip.mjs";

const pageRect = { left: 100, top: 50, width: 800, height: 500 };

test("creates the exact C0 Snip selection from a reverse drag", () => {
  assert.deepEqual(
    createSnipSelection({
      pageNumber: 2,
      start: { x: 500, y: 350 },
      end: { x: 200, y: 150 },
      pageRect,
    }),
    {
      pageNumber: 2,
      source: "snip",
      bounds: { x: 0.125, y: 0.2, width: 0.375, height: 0.4 },
      label: "Vùng tự chọn",
      text: "",
      needsOcr: false,
    },
  );
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
  assert.deepEqual(createSnipSelection({
    pageNumber: 1,
    start: { x: 0, y: 0 },
    end: { x: 120, y: 100 },
    pageRect,
  })?.bounds, { x: 0, y: 0, width: 0.025, height: 0.1 });
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
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test codebase/test/snip.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `codebase/src/snip.mjs`.

- [ ] **Step 3: Implement the minimal pure module**

Create `codebase/src/snip.mjs`:

```js
import { createSelection, rectToNormalizedBounds } from "./selection-geometry.mjs";

export const MIN_SNIP_SIZE_PX = 12;

export function createSnipSelection({
  pageNumber,
  start,
  end,
  pageRect,
  minimumSize = MIN_SNIP_SIZE_PX,
}) {
  if (!Number.isFinite(minimumSize) || minimumSize <= 0) {
    throw new TypeError("minimumSize must be a positive finite number");
  }
  const pointValues = [start?.x, start?.y, end?.x, end?.y];
  if (!pointValues.every(Number.isFinite)) {
    throw new TypeError("points must contain finite coordinates");
  }
  const rectValues = [pageRect?.left, pageRect?.top, pageRect?.width, pageRect?.height];
  if (!rectValues.every(Number.isFinite) || pageRect.width <= 0 || pageRect.height <= 0) {
    throw new TypeError("pageRect must contain finite positive geometry");
  }

  const left = Math.max(pageRect.left, Math.min(start.x, end.x));
  const top = Math.max(pageRect.top, Math.min(start.y, end.y));
  const right = Math.min(pageRect.left + pageRect.width, Math.max(start.x, end.x));
  const bottom = Math.min(pageRect.top + pageRect.height, Math.max(start.y, end.y));
  if (right - left < minimumSize || bottom - top < minimumSize) return null;

  return createSelection({
    pageNumber,
    source: "snip",
    bounds: rectToNormalizedBounds(start, end, pageRect),
    label: "Vùng tự chọn",
  });
}
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node --test codebase/test/snip.test.mjs
```

Expected: 6 tests pass, 0 fail.

---

### Task 2: Browser module delivery and UI wiring contract

**Files:**
- Modify: `codebase/server.mjs:21-25`
- Modify: `codebase/public/index.html:51-56`
- Modify: `codebase/public/styles.css:158-168`
- Modify: `codebase/public/app.js:1-4,40-70,75-108,284-418,488-577,1023-1049`
- Create: `codebase/test/snip-wiring.test.mjs`

**Interfaces:**
- Consumes: `/snip.mjs` and its relative `/selection-geometry.mjs` import chain.
- Produces: visible `data-mode="snip"`, pointer drag preview, and one in-memory `state.snipSelection` matching C0.

- [ ] **Step 1: Write the failing wiring regression**

Create `codebase/test/snip-wiring.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverSource = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

test("serves the C0 and C1 browser modules", () => {
  assert.match(serverSource, /app\.get\("\/selection-geometry\.mjs"/);
  assert.match(serverSource, /app\.get\("\/snip\.mjs"/);
});

test("wires a visible Snip mode and non-interactive outline", () => {
  assert.match(htmlSource, /data-mode="snip"/);
  assert.match(appSource, /import \{ createSnipSelection \} from "\/snip\.mjs"/);
  assert.match(appSource, /snipSelection: null/);
  assert.match(appSource, /class="snip-preview hidden"/);
  assert.match(cssSource, /page-shell\[data-mode="snip"\] \.annotation-canvas/);
  assert.match(cssSource, /\.snip-preview[\s\S]*pointer-events:\s*none/);
});

test("does not wire Snip directly to Tutor requests", () => {
  const snipPointerSection = appSource.slice(
    appSource.indexOf("function setupAnnotationLayer"),
    appSource.indexOf("function resizeAnnotationCanvas"),
  );
  assert.doesNotMatch(snipPointerSection, /fetch\(|sendVisualQuestion|sendTextQuestion|cropSelectedRegion/);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test codebase/test/snip-wiring.test.mjs
```

Expected: all three tests fail because C1 routes and UI do not exist.

- [ ] **Step 3: Expose the tested source modules**

In `codebase/server.mjs`, directly after the `/geometry.mjs` route, add:

```js
app.get("/selection-geometry.mjs", (_request, response) => {
  response.sendFile(path.join(__dirname, "src/selection-geometry.mjs"));
});
app.get("/snip.mjs", (_request, response) => {
  response.sendFile(path.join(__dirname, "src/snip.mjs"));
});
```

- [ ] **Step 4: Add the visible mode control**

In `codebase/public/index.html`, add the button after Read:

```html
<button class="tool-button" data-mode="snip"><span data-icon="snip"></span>Snip</button>
```

In the `ICONS` object in `codebase/public/app.js`, add:

```js
snip: '<path d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6"/>',
```

- [ ] **Step 5: Add Snip state and the outline host**

Import the pure policy at the top of `codebase/public/app.js`:

```js
import { createSnipSelection } from "/snip.mjs";
```

Add this state field after `selectionPage`:

```js
snipSelection: null,
```

Add this inside `.page-paper`, before the annotation markers:

```html
<div class="snip-preview hidden" aria-hidden="true"></div>
```

- [ ] **Step 6: Add the minimal outline renderer**

Add after `updatePageModes()`:

```js
function renderSnipSelection(selection = state.snipSelection) {
  elements.pagesHost.querySelectorAll(".snip-preview").forEach((preview) => {
    const selected = selection
      && Number(preview.closest(".page-shell")?.dataset.page) === selection.pageNumber;
    preview.classList.toggle("hidden", !selected);
    if (!selected) return;
    preview.style.left = `${selection.bounds.x * 100}%`;
    preview.style.top = `${selection.bounds.y * 100}%`;
    preview.style.width = `${selection.bounds.width * 100}%`;
    preview.style.height = `${selection.bounds.height * 100}%`;
  });
}

function clearSnipSelection() {
  state.snipSelection = null;
  renderSnipSelection();
}
```

Call `renderSnipSelection()` after page shells are rebuilt in `renderDemoDocument()`, after the PDF shell loop in `loadPdf()`, and at the end of `rebuildPdfShells()`.

Call `clearSnipSelection()` when switching to the demo document and at the start of `loadPdf()`.

- [ ] **Step 7: Add pointer interaction without entering annotation persistence**

In `setupAnnotationLayer()`, add `let snipDraft = null;` beside `drawing`.

At the beginning of `pointerdown`, after the read/highlight guard, add:

```js
if (state.mode === "snip") {
  if (event.button !== 0) return;
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  clearVisualSelection();
  window.getSelection()?.removeAllRanges();
  snipDraft = { x: event.clientX, y: event.clientY };
  return;
}
```

At the beginning of `pointermove`, add:

```js
if (snipDraft) {
  const preview = createSnipSelection({
    pageNumber,
    start: snipDraft,
    end: { x: event.clientX, y: event.clientY },
    pageRect: canvas.getBoundingClientRect(),
    minimumSize: 1,
  });
  renderSnipSelection(preview || state.snipSelection);
  return;
}
```

At the beginning of `pointerup`, add:

```js
if (snipDraft) {
  const selection = createSnipSelection({
    pageNumber,
    start: snipDraft,
    end: { x: event.clientX, y: event.clientY },
    pageRect: canvas.getBoundingClientRect(),
  });
  snipDraft = null;
  if (!selection) {
    renderSnipSelection();
    showToast("Vùng chọn quá nhỏ. Hãy kéo một vùng lớn hơn.");
    return;
  }
  state.snipSelection = selection;
  state.currentPage = pageNumber;
  renderSnipSelection();
  updateCurrentPageClass();
  updateChrome();
  showToast(`Đã chọn vùng trên trang ${pageNumber}.`, "success");
  return;
}
```

Replace the current `pointercancel` listener with:

```js
canvas.addEventListener("pointercancel", () => {
  snipDraft = null;
  drawing = null;
  renderSnipSelection();
  drawAnnotations(pageNumber);
});
canvas.addEventListener("lostpointercapture", () => {
  if (!snipDraft) return;
  snipDraft = null;
  renderSnipSelection();
});
```

- [ ] **Step 8: Add mode copy and CSS**

Extend the existing main-mode panel-closing condition:

```js
if (mode === "read" || mode === "snip" || mode === "pen" || mode === "highlight") hideMoreToolsPanel();
```

Add to `setMode()` messages:

```js
snip: "Giữ và kéo để chọn một vùng hình chữ nhật trên slide.",
```

Add to `codebase/public/styles.css`:

```css
.page-shell[data-mode="snip"] .annotation-canvas { cursor: crosshair; }
.snip-preview { position: absolute; z-index: 4; pointer-events: none; border: 2px solid #075591; border-radius: 5px; background: rgba(13, 114, 184, .12); box-shadow: 0 0 0 2px rgba(255, 255, 255, .8); }
```

- [ ] **Step 9: Verify wiring GREEN**

Run:

```bash
node --test codebase/test/snip-wiring.test.mjs
npm --prefix codebase run check
npm --prefix codebase test
git diff --check
```

Expected: 3 focused wiring tests pass; syntax and all repository tests pass; diff check is silent.

---

### Task 3: Browser verification and handoff

**Files:**
- Verify only; no new file required.

**Interfaces:**
- Confirms C1 emits and retains the exact selection visually without activating C2/C7 behavior.

- [ ] **Step 1: Start the application**

Run:

```bash
npm --prefix codebase start
```

Open `http://localhost:3000` in Edge.

- [ ] **Step 2: Verify the golden path on the demo document**

1. Click **Snip**.
2. Drag a rectangle on page 2.
3. Confirm a blue outline matches the drag.
4. Drag in reverse direction and confirm the same behavior.
5. Confirm the success toast names the correct page.
6. Confirm no Tutor message appears and no `/api/analyze` or `/api/tutor` request occurs.

- [ ] **Step 3: Verify rejection, cancellation, and lifecycle edges**

1. Make a drag smaller than 12 px in either dimension: previous valid outline remains.
2. Start a drag and trigger pointer cancellation from DevTools input simulation: previous outline remains.
3. Change zoom to 60%, 90%, and 150%: outline stays over the same page content.
4. Upload a PDF and Snip a page: outline appears on the correct PDF page.
5. Switch documents: old outline disappears.
6. Switch to Read mode: text selection still works.
7. Switch to Pen/Circle: existing annotation behavior still works.

- [ ] **Step 4: Final repository verification**

Run:

```bash
npm --prefix codebase run check
npm --prefix codebase test
git diff --check
git status --short
```

Expected: checks pass; only C1 files and this plan are modified/untracked.

## C1 Handoff Checklist

C1 is ready for review only when all are true:

- [ ] `createSnipSelection()` returns the exact C0 shape or `null`.
- [ ] Minimum size uses clipped CSS-pixel dimensions.
- [ ] Reverse and out-of-page drags work.
- [ ] Pointer cancellation and tiny drags preserve the prior selection.
- [ ] Outline survives zoom rebuild and clears on document switch.
- [ ] Snip creation triggers no crop, text extraction, AI request, or persistence.
- [ ] Direction B text selection, visual-region selection, Pen, Highlight, Circle, and Eraser remain usable.
- [ ] Focused tests and the complete repository suite pass.
