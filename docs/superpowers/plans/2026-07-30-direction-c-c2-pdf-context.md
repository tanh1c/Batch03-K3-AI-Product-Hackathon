# Direction C C2 PDF Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement each task test-first.

**Goal:** Produce a browser module that waits for a rendered PDF page, crops only the normalized selected source pixels, and returns only intersecting PDF text.

**Architecture:** `extractPdfContext(page, selection)` consumes a C0 selection and a small browser page adapter containing `pageNumber`, `.pdf-canvas`, optional `.pdf-text-layer`, optional `renderPromise`, optional `signal`, and an injectable `createCanvas` for tests. It returns `{ imageData, mediaType, text, needsOcr, pixelBounds }` without app state, AI calls, logging, or persistence.

**Tech Stack:** Browser Canvas API, DOM rectangles, native promises and AbortSignal, Node `node:test` with fakes, existing Express static delivery.

## Global Constraints

- No new dependency, SDK, OCR engine, endpoint, provider fallback, or AI call.
- Crop `.pdf-canvas`, never `.annotation-canvas`.
- Normalized C0 bounds map to bitmap source pixels, independent of CSS zoom and device pixel ratio.
- Output PNG dimensions are capped at 1400 pixels on the longest edge.
- Text comes only from leaf text-layer spans with positive intersection against the selection, in DOM order, compacted to whitespace-separated text.
- Empty usable text returns `text: ""` and `needsOcr: true`; C2 does not perform OCR.
- Raw crops and extracted text are never logged or persisted.
- Abort before or after render waiting rejects with `AbortError` so stale page work cannot emit context.

---

### Task 1: Pure PDF context extraction

**Files:**
- Create: `codebase/public/pdf-context.mjs`
- Create: `codebase/test/pdf-context.test.mjs`

**Interface:**

```js
extractPdfContext({
  pageNumber,
  canvas,
  textLayer,
  renderPromise,
  signal,
  createCanvas,
}, selection)
// -> Promise<{ imageData, mediaType: "image/png", text, needsOcr, pixelBounds }>
```

- [ ] Write tests for source-pixel mapping and crop arguments, 1400-pixel output cap, CSS-zoom-independent text intersection, partial/full/no text overlap, render waiting, page mismatch, blank canvas, encoding failure, and stale cancellation.
- [ ] Run `node --test codebase/test/pdf-context.test.mjs`; expect `ERR_MODULE_NOT_FOUND`.
- [ ] Implement the minimum browser-native module.
- [ ] Rerun the focused test; expect all cases to pass.

### Task 2: Browser module delivery

**Files:**
- Modify: `codebase/server.mjs`
- Create: `codebase/test/pdf-context-wiring.test.mjs`

- [ ] Write a failing source regression requiring `GET /pdf-context.mjs` and forbidding AI, storage, annotation-canvas, and network calls in the module.
- [ ] Run the focused wiring test and observe the missing route failure.
- [ ] Add the one explicit `sendFile` route beside the existing C0/C1 module routes.
- [ ] Rerun the focused wiring test and full suite.

### Task 3: Real browser verification

- [ ] Start the app and upload `C:\Users\LG\Downloads\01 - 4-day02-lecture-slides-v2.pdf`.
- [ ] Dynamically import `/pdf-context.mjs` and extract the same normalized region from page 1 at 60%, 90%, and 150% zoom.
- [ ] Verify equivalent normalized source bounds, non-empty PNG payloads, and stable bounded text across zoom values; absolute bitmap bounds may scale when PDF.js rerenders at a new zoom.
- [ ] Verify a region with no intersecting text sets `needsOcr: true`.
- [ ] Confirm no `/api/tutor` or `/api/analyze` POST and no crop/text added to localStorage.
- [ ] Run `npm --prefix codebase run check`, `npm --prefix codebase test`, and `git diff --check`.
