# Direction C C1 Snip Implementation Plan

**Goal:** Turn a pointer drag over one PDF page into the shared normalized selection contract without owning application state.

## Interface

```js
createSnipSelection({ pageNumber, start, end, pageRect, minSize, label })
// -> selection | null

createSnipTool({ surface, pageNumber, onSelection, onPreview, onInvalid })
// -> { setEnabled, cancel, destroy }
```

- `start`, `end`, and `pageRect` are viewport pixels.
- `minSize` is normalized; a smaller drag returns `null`.
- Invalid/tiny drags do not replace the previous app selection.
- The tool does not crop, call AI, or import app state.

## Files and test-first sequence

1. Add `codebase/test/snip-selection.test.mjs` and verify missing-module RED.
2. Add `codebase/public/snip-selection.mjs`.
3. Test forward/reverse drag, page clipping, tiny drag, enable/disable, pointer cancel, and cleanup.
4. Integrate only in C8.

## Verification and handoff

```powershell
node --test codebase/test/snip-selection.test.mjs
npm --prefix codebase test
```

Produces a valid `source: "snip"` selection and pointer callbacks. Consumes C0 only.
