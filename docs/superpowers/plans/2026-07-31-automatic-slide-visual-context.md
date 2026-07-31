# Automatic Slide Visual Context Implementation Plan

> **For agentic workers:** Implement inline with strict RED → GREEN checks. Do not commit or push.

**Goal:** Let ordinary Tutor questions inspect one uploaded-PDF slide without requiring candidate, Snip, or Circle selection.

**Architecture:** Add one pure page-reference resolver and compose it into the existing Tutor form. Explicit PDF/demo selections retain precedence; otherwise an enabled whole-slide draft context sends the resolved page through the existing PDF canvas extractor and `/api/analyze` legacy visual body. Reuse the current composer context, render ownership epoch, abort controller, 10 MB payload limit, four-route renderer, and persistence allowlist.

**Tech Stack:** Vanilla ESM, PDF.js canvas/text layer, Node `node:test`, existing Express `/api/analyze`.

## Global Constraints

- Uploaded PDFs only; Direction B and existing selection flows remain unchanged.
- Resolve explicit `slide N` or `trang N`; otherwise use the current page.
- Reject an explicit page outside `1..totalPages`; never fall back silently.
- Send exactly one slide only after explicit submit.
- Show `AI sẽ xem toàn bộ slide N` before submit and allow `×` to disable it for that draft.
- Do not add dependencies, endpoints, C0 sources, persistence, or application-level provider fallback.
- Do not send annotation pixels, the full PDF, raw chat history, or more than the existing 10 MB payload limit.

---

### Task 1: Resolve the target slide

**Files:**
- Create: `codebase/public/slide-context.mjs`
- Create: `codebase/test/slide-context.test.mjs`

**Interface:**

```js
resolveSlideContext(question, currentPage, totalPages)
// => { pageNumber, explicit: boolean, valid: boolean }
```

- [ ] Write tests for `slide 5`, `trang 5`, case-insensitive matching, current-page fallback, unrelated numbers, and explicit pages `0`/`totalPages + 1`.
- [ ] Run `node --test codebase/test/slide-context.test.mjs`; expect `ERR_MODULE_NOT_FOUND`.
- [ ] Implement the smallest pure resolver. Match only the words `slide` or `trang` followed by an integer.
- [ ] Re-run the focused test; expect all cases to pass.

### Task 2: Freeze composition behavior

**Files:**
- Modify: `codebase/test/direction-c-integration.test.mjs`
- Modify: `codebase/public/index.html`
- Modify: `codebase/public/app.js`

- [ ] Add source-wiring assertions that require:
  - importing `resolveSlideContext`;
  - input-driven whole-slide context refresh with explicit selection precedence;
  - removable context through the existing clear button;
  - `sendQuestion` validation before appending chat or consuming quota;
  - whole-slide submit through `sendPdfWholeSlideQuestion` and `/api/analyze`, never `/api/tutor`;
  - legacy visual body without C7 selection metadata;
  - provenance `Dựa trên toàn bộ slide N`;
  - no whole-slide context in `persistState()`.
- [ ] Run the focused integration test and observe the expected RED failures.
- [ ] Generalize the clear button accessibility label in `index.html` to `Bỏ ngữ cảnh hình ảnh`; add no new markup or CSS.

### Task 3: Add transient composer context

**Files:**
- Modify: `codebase/public/app.js`

- [ ] Add non-persisted state for the current whole-slide draft and whether the learner disabled it for the current input.
- [ ] On input, resolve whole-slide context only when the document is an uploaded PDF and neither explicit selection exists.
- [ ] Show `AI sẽ xem toàn bộ slide N`; make `×` disable it and preserve the typed question for text-only submit.
- [ ] Reset/recompute transient context when the input changes, the current page changes, a selection is created/cleared, a document changes, or submit completes.
- [ ] For invalid explicit pages, show composer error state via the existing toast on submit; do not append the user message, call an API, or consume quota.
- [ ] Keep explicit candidate/Snip/Circle selection as the first routing choice.

### Task 4: Submit one whole slide through Visual Tutor

**Files:**
- Modify: `codebase/public/app.js`

- [ ] Implement `sendPdfWholeSlideQuestion(question, pageNumber)` by snapshotting document ID, page state, and `pdfWorkEpoch`.
- [ ] Abort prior extraction, await `renderPdfPage(pageNumber)`, then call `extractPdfContext` with normalized full-page bounds `{ x: 0, y: 0, width: 1, height: 1 }`.
- [ ] Recheck controller, document, page-state, and epoch ownership before fetch.
- [ ] POST one legacy body:

```js
{
  imageData: context.imageData,
  mediaType: "image/png",
  question,
  slideNumber: pageNumber,
  nearbyText: context.text.slice(0, 4000),
}
```

- [ ] Reject JSON larger than 10 MB before fetch.
- [ ] Store only structured result fields and `Dựa trên toàn bộ slide N`; recovery must remain manual and must not trigger another upload.
- [ ] Re-run focused resolver/integration tests until GREEN.

### Task 5: Verify regression and browser behavior

**Files:**
- Modify only if a verified defect requires the minimum correction.

- [ ] Run:

```bash
node --test codebase/test/slide-context.test.mjs
node --test codebase/test/direction-c-integration.test.mjs
npm --prefix codebase run check
npm --prefix codebase test
git diff --check
```

- [ ] Start the real app, upload `C:\Users\LG\Downloads\01 - 4-day02-lecture-slides-v2.pdf`, and verify with DOM/network/storage assertions:
  - `Ở slide 5 có hình gì?` shows the slide-5 chip and makes zero analyze requests before submit;
  - submit makes exactly one `/api/analyze` request for slide 5 and renders whole-slide provenance;
  - no number uses the current page;
  - `slide 50` makes no request and shows an error;
  - `×` sends through `/api/tutor` only;
  - explicit candidate/Snip/Circle still wins;
  - zoom/document changes reject stale extraction;
  - localStorage contains no question, image, extracted text, selection, or whole-slide context.
- [ ] Update `DEMO-GUIDE.md` only with behavior actually verified.
