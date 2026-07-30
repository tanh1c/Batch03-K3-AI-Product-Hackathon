# Direction C C8 Integration Implementation Plan

**Goal:** Compose C1–C7 into the existing reader so uploaded PDFs support Snip, Circle, detected regions, bounded crop/text, AI submit, provenance and recovery while Direction B remains usable.

## Integration surface

- `server.mjs` serves the shared browser-safe source modules.
- `index.html` adds Snip and suggestion controls plus the overlay stylesheet.
- `app.js` owns only mode, current selection, per-page package instances and orchestration.
- `styles.css` adds scoped mode/selection states.

## Required paths

1. Snip emits a selection and pre-fills a question.
2. Circle keeps its annotation and emits a padded selection.
3. Candidate click emits detected-image/detected-text selection.
4. Submit waits for page rendering, extracts bounded context and calls `/api/analyze`.
5. Provenance names page and source; recovery returns the learner to manual Snip.
6. Document/page rebuild destroys stale overlays and never triggers AI automatically.
7. Existing configured demo regions continue through the Direction B path.

## Test-first and manual verification

1. Add static integration assertions for imports, controls, endpoint reuse and no automatic AI call.
2. Implement wiring.
3. Run syntax and full tests.
4. In a browser upload a real PDF and check page/zoom/Snip/Circle/detection/recovery.

## Verification

```powershell
npm --prefix codebase run check
npm --prefix codebase test
```
