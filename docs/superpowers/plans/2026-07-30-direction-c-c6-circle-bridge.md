# Direction C C6 Circle Bridge Implementation Plan

**Goal:** Convert the existing normalized Circle annotation points into the shared AI selection while preserving the visible stroke.

## Interface

```js
createCircleSelection({ pageNumber, points, padding, label })
// -> selection with source: "circle"
```

- Points are already normalized by the annotation layer.
- The crop uses the padded bounding rectangle, never the annotation canvas.
- The module does not mutate or persist the original stroke.

## Test-first sequence

1. Add `codebase/test/circle-selection.test.mjs` and verify RED.
2. Add `codebase/public/circle-selection.mjs`.
3. Test normal bounds, page-edge clamp, invalid points, and input immutability.
4. Wire the existing Circle completion callback only in C8.

## Verification

```powershell
node --test codebase/test/circle-selection.test.mjs
npm --prefix codebase test
```
