# Direction C C3/C4 PDF Regions Implementation Plan

**Goal:** Suggest conservative bitmap, vector, and merged text-block candidates from PDF.js page data without making AI calls.

## Interface

```js
detectPdfRegions(page, { pageNumber, textContent, ops })
mergeTextItemsToCandidates({ pageNumber, textItems })
detectGraphicCandidates({ pageNumber, operatorList, viewport, ops })
filterRegionCandidates(candidates)
```

Candidates use `{ id, kind, bounds, label, confidence }`, with normalized bounds and `kind` in `image | text | vector`.

## Heuristics

- Merge nearby text items into readable blocks.
- Track PDF graphics transforms for image paint operations.
- Group painted path bounds conservatively for vector candidates.
- Reject tiny, page-sized, invalid, duplicate, and excessive candidates.
- Empty detection is a valid result.

## Files and test-first sequence

1. Add `codebase/test/pdf-regions.test.mjs` and fixture-like operator lists; verify RED.
2. Add `codebase/public/pdf-regions.mjs`.
3. Cover text merge, bitmap, vector, tiny/background rejection, duplicate filtering, and capped output.
4. Integrate only in C8.

## Verification

```powershell
node --test codebase/test/pdf-regions.test.mjs
npm --prefix codebase test
```
