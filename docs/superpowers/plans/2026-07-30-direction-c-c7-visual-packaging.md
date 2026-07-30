# Direction C C7 Visual Packaging Implementation Plan

**Goal:** Package one bounded Direction C selection for the existing `/api/analyze` endpoint and add OCR/provenance metadata without logging private content.

## Interface

```js
buildVisualRequest({ selection, context, question })
// -> existing visual request fields plus bounded selection metadata
```

The selection metadata contains only `source`, `bounds`, `label`, and `needsOcr`. Extracted text stays in the existing bounded `nearbyText` field.

## Rules

- Keep the existing four-route schema and endpoint.
- Add an explicit crop-only OCR instruction when `needsOcr` is true.
- Direction B requests without selection metadata remain valid.
- Trace may store source, area ratio and text-layer presence only.
- Never store raw crop, extracted text, question, API key, or upstream body.

## Test-first sequence

1. Add `codebase/test/visual-request.test.mjs` and extend route, prompt, and trace tests; verify RED.
2. Add `codebase/src/visual-request.mjs`.
3. Extend request validation, AI instruction and redacted trace.
4. Integrate the browser builder only in C8.

## Verification

```powershell
node --test codebase/test/visual-request.test.mjs codebase/test/visual-analysis.test.mjs codebase/test/visual-route.test.mjs codebase/test/trace.test.mjs
npm --prefix codebase test
```
