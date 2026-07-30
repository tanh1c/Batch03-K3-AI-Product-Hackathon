# Direction C C2 PDF Context Implementation Plan

**Goal:** Crop only the selected PDF canvas pixels and extract only intersecting text-layer content, independently of CSS zoom.

## Interface

```js
extractPdfContext(pageContext, selection, options)
// -> { imageData, mediaType, text, needsOcr, pixelBounds }
```

`pageContext` supplies the source `.pdf-canvas`, PDF.js text content and viewport, plus an optional render promise. `options` supplies an abort signal, output-size cap, and injectable canvas factory for tests.

## Rules

- Wait for the render promise before reading pixels.
- Map normalized bounds to source canvas pixels.
- Never crop the annotation canvas.
- Sort and compact only text items intersecting the selection.
- Set `needsOcr: true` only when bounded text is empty.
- Do not persist or call AI.

## Files and test-first sequence

1. Add `codebase/test/pdf-context.test.mjs` and verify RED.
2. Add `codebase/public/pdf-context.mjs`.
3. Cover zoom-independent pixels, partial/no text overlap, render wait, output limiting, wrong canvas, and abort.
4. Integrate only in C8.

## Verification

```powershell
node --test codebase/test/pdf-context.test.mjs
npm --prefix codebase test
```
