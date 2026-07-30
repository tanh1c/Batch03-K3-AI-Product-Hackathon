# Direction C C5 Selection Overlay Implementation Plan

**Goal:** Implement an independent, accessible overlay that renders detected PDF-region candidates as positioned buttons and reports the selected candidate through a callback.

**Package boundary:** C5 consumes the candidate contract documented in `docs/DIRECTION-C-TEAM-GUIDE.md`. It does not import application state, detector code, PDF crop/text code, geometry code, or AI code. C8 will integrate the module into `app.js` later.

## Files

- Create: `codebase/public/selection-overlay.mjs`
- Create: `codebase/public/selection-overlay.css`
- Create: `codebase/test/fixtures/selection-candidates.mjs`
- Create: `codebase/test/selection-overlay.test.mjs`

No changes to `codebase/public/app.js`, `codebase/public/index.html`, or the existing Direction B styles are part of C5.

## Candidate input contract

```js
{
  id: "page-2-image-1",
  kind: "image", // image | text | vector
  bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  label: "Vùng hình 1",
  confidence: 0.8,
}
```

All bounds are normalized to `[0, 1]`. C5 rejects invalid or duplicate candidates before changing the current overlay.

## Public interface

```js
const overlay = createSelectionOverlay({
  container,
  onSelect(candidate) {},
});

overlay.render(candidates);
overlay.setEnabled(true);
overlay.clear();
overlay.destroy();
```

- `render(candidates)` replaces the previous buttons.
- `setEnabled(false)` hides and disables the overlay so it cannot block PDF text selection, Snip, or Circle.
- `clear()` removes rendered candidates without removing the overlay root.
- `destroy()` removes the overlay root and releases the package-owned references.
- `onSelect(candidate)` receives a copy of the original candidate. C5 does not create app selections or mutate app state.

## Accessibility and interaction

- Every candidate is a native `<button type="button">`.
- Buttons remain keyboard reachable when the overlay is enabled.
- Each button has an accessible label, candidate ID, kind, confidence, and percentage positioning.
- The overlay root has `pointer-events: none`; only enabled candidate buttons receive pointer events.
- Hover and `:focus-visible` reveal the candidate label.

## Test-first steps

1. Add a static candidate fixture matching the C3/C4 handoff schema.
2. Add focused tests that initially fail because `selection-overlay.mjs` does not exist.
3. Implement candidate validation and percentage positioning.
4. Implement render, enable/disable, callback, clear, and destroy.
5. Add scoped CSS and assert its pointer/focus safety rules.
6. Run the focused test, then the full codebase suite and syntax checks.

## Verification

```powershell
cd codebase
npm.cmd run check
node --test test/selection-overlay.test.mjs
npm.cmd test
```

Expected handoff:

```text
Package: C5
Produces: createSelectionOverlay({ container, onSelect })
Consumes: C3/C4 candidate contract; static fixture until detector merge
Runtime impact: none until C8 imports the dormant module and stylesheet
Known ceiling: candidate quality belongs to C3/C4; C5 only renders supplied bounds
```
