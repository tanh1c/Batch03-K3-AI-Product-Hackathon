# Direction C C9 Evaluation Implementation Plan

**Goal:** Freeze and run a separate 12-case Direction C evaluation without changing the existing 20-case Direction B record.

## Artifacts

- `eval/direction-c-golden-set.json`: 4 mixed, 3 scanned/OCR, 3 recovery, 2 detector fallback cases.
- `eval/run-direction-c-eval.mjs`: real-provider runner using the same request builder and visual analyzer.
- `eval/direction-c-manual-checklist.md`: page, zoom, selection and fallback browser evidence.
- `codebase/test/direction-c-eval.test.mjs`: manifest distribution and quality-bar guard.

## Frozen gate

- At least 10/12 pass.
- Zero wrong-page submissions.
- Zero unsupported `VISUAL_GROUNDED`.
- Both detector miss/false-positive cases retain manual Snip/Circle fallback.

The runner records all failures. A configured real multimodal provider is required before claiming the gate passed.

## Verification

```powershell
node --test codebase/test/direction-c-eval.test.mjs
node --env-file-if-exists=codebase/.env eval/run-direction-c-eval.mjs
```
