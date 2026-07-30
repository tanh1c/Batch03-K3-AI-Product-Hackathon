# Direction C C7 OCR/AI Packaging Implementation Plan

**Goal:** Package the bounded C2 crop and text into the existing Visual AI request, add explicit multimodal OCR instructions when the crop has no usable text layer, produce selection-aware provenance for C8, and extend redacted trace metadata without storing learner content.

**Architecture:** Add one dependency-light policy module, `src/visual-request.mjs`, between C0/C2 and the existing `/api/analyze` endpoint. The module validates the C0 selection and C2 context, builds the exact Direction C request body, and formats provenance without DOM or application state. The existing visual route remains the only server endpoint, `visual-analysis.mjs` remains the only multimodal decision pipeline, and `trace.mjs` records only bounded metadata. C8 will later import this module and compose it in `public/app.js`.

**Tech Stack:** Node.js 24 ESM, JavaScript, `node:test`, `node:assert/strict`, Express 5; no new dependency, OCR engine, endpoint, or provider.

## Dependency Gate

C7 starts only from a commit containing:

- C0 `createSelection` and normalized bounds contract;
- C2 `extractPdfContext(page, selection)` returning `{ imageData, mediaType, text, needsOcr, pixelBounds }`;
- the existing four-route Visual AI pipeline and redacted trace writer.

Verified baseline commit: `69506eb` (`Add bounded PDF context extraction`).

## Global Constraints

- Keep `/api/analyze` as the only visual endpoint and keep the exact four routes: `VISUAL_GROUNDED`, `NEED_WIDER_REGION`, `NEED_BETTER_IMAGE`, and `INSUFFICIENT`.
- Do not add Tesseract, an OCR endpoint, a second result schema, or a provider fallback.
- `needsOcr: true` means only that C2 found no usable intersecting text. OCR-like reading is performed by the existing multimodal model on the selected crop.
- Send only the selected PNG crop, the learner question, the selected page number, and bounded C2 text. Never replace missing context with an automatic whole-page upload.
- `VISUAL_GROUNDED` remains evidence-bounded. Missing labels/title route to `NEED_WIDER_REGION`; unreadable pixels route to `NEED_BETTER_IMAGE`; unsupported questions route to `INSUFFICIENT`.
- Trace may store `selectionSource`, `imageBytes`, `selectedAreaRatio`, `hasTextLayer`, slide number, provider/model, question hash, and route.
- Trace must not store raw crop, bounded/OCR text, raw question, API key, upstream body, or provenance text.
- OCR-derived text must not be presented as a fabricated PDF citation.
- Do not modify C0, C2, provider selection, result schema, or detection modules.
- Do not modify `codebase/public/app.js`, HTML, or CSS in C7. C8 owns browser composition and provenance rendering.
- Preserve the existing Direction B request path. New Direction C metadata is optional at the HTTP boundary but required when using `buildVisualRequest`.
- Do not commit or push during execution unless explicitly requested.

## File Map and Ownership

```text
codebase/
├── src/
│   ├── visual-request.mjs             # new pure C0/C2 request and provenance policy
│   ├── visual-analysis.mjs            # OCR-aware instruction in existing AI pipeline
│   ├── visual-route.mjs               # validate and normalize optional C metadata
│   └── trace.mjs                      # add only approved metadata
├── test/
│   ├── visual-request.test.mjs        # request/provenance policy tests
│   ├── visual-request-wiring.test.mjs # browser delivery and isolation regression
│   ├── visual-analysis.test.mjs       # OCR and non-OCR prompt tests
│   ├── visual-route.test.mjs          # endpoint validation/backward compatibility
│   └── trace.test.mjs                 # metadata and redaction tests
└── server.mjs                         # one explicit browser-module route only
```

Files explicitly excluded from C7: `public/app.js`, `public/index.html`, `public/styles.css`, `public/pdf-context.mjs`, `src/selection-geometry.mjs`, detector/overlay modules, and eval artifacts.

## Public Interfaces

### Browser request builder

```js
export function buildVisualRequest({ selection, context, question })
// selection: exact C0 selection
// context: exact C2 result
// -> {
//   imageData,
//   mediaType: "image/png",
//   question,
//   slideNumber,
//   nearbyText,
//   needsOcr,
//   selectionSource,
//   selectedAreaRatio,
//   hasTextLayer,
// }

export function formatSelectionProvenance(selection)
// -> "Dựa trên vùng đã chọn ở slide N · <source label>"
```

Source labels are fixed:

```js
{
  snip: "Vùng cắt",
  circle: "Vùng khoanh",
  "detected-image": "Vùng hình được gợi ý",
  "detected-text": "Vùng chữ được gợi ý",
}
```

### Direction C request body

```js
{
  imageData: "<base64 PNG>",
  mediaType: "image/png",
  question: "Giải thích vùng này",
  slideNumber: 2,
  nearbyText: "bounded text returned by C2",
  needsOcr: false,
  selectionSource: "snip",
  selectedAreaRatio: 0.2,
  hasTextLayer: true,
}
```

Invariants:

- `nearbyText === context.text`; never substitute full-page `state.pageTexts`.
- `needsOcr === context.needsOcr`.
- `hasTextLayer === !needsOcr`.
- `needsOcr: true` requires empty bounded text.
- `selectedAreaRatio === selection.bounds.width * selection.bounds.height` and is in `(0, 1]`.
- `selectionSource === selection.source`.
- `slideNumber === selection.pageNumber`.
- Question is trimmed and limited to the existing 1000-character endpoint ceiling.

---

## Task 1: Pure request packaging and provenance

**Files:**

- Create: `codebase/src/visual-request.mjs`
- Create: `codebase/test/visual-request.test.mjs`

### Step 1: Write failing tests

Cover at least:

- packages a C2 text-layer result into the exact request shape;
- packages a no-text result with `needsOcr: true` and `hasTextLayer: false`;
- uses bounded C2 `text`, never any whole-page fallback;
- computes `selectedAreaRatio` from normalized C0 bounds;
- trims the question;
- rejects empty/overlong questions, invalid media type/base64, invalid pixel bounds, mismatched OCR/text state, and invalid C0 selection metadata;
- formats all four exact provenance source labels;
- rejects an unsupported provenance source.

Run and observe RED:

```bash
node --test codebase/test/visual-request.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for `src/visual-request.mjs`.

### Step 2: Implement the minimum pure module

- Import and reuse `createSelection` from `selection-geometry.mjs`; do not duplicate the C0 source enum or normalized-bounds validation.
- Validate the C2 result without mutating either input object.
- Return a new plain request object containing only the fields in the public interface.
- Keep the module free of DOM, canvas operations, fetch, storage, logging, provider logic, and app state.

### Step 3: Verify GREEN

```bash
node --test codebase/test/visual-request.test.mjs
```

---

## Task 2: Serve the request policy for later C8 composition

**Files:**

- Modify: `codebase/server.mjs`
- Create: `codebase/test/visual-request-wiring.test.mjs`

### Step 1: Write the route/isolation regression

Require:

- an explicit `GET /visual-request.mjs` route serving `src/visual-request.mjs`;
- no `/api/analyze` call, `fetch`, local/session storage, DOM query, crop encoding, or logging in the policy module;
- no `app.js` modification in the C7 diff.

### Step 2: Add only the delivery route

Add the route beside `/selection-geometry.mjs`, `/snip.mjs`, and `/pdf-context.mjs`. Do not add a new API endpoint.

### Step 3: Verify

```bash
node --test codebase/test/visual-request-wiring.test.mjs
```

---

## Task 3: Validate and normalize Direction C metadata at `/api/analyze`

**Files:**

- Modify: `codebase/src/visual-route.mjs`
- Modify: `codebase/test/visual-route.test.mjs`

### Step 1: Add failing endpoint tests

Add cases proving:

- a complete Direction C body reaches `analyze` and `recordTrace` unchanged after safe normalization;
- `selectionSource` accepts only the four C0 sources;
- `selectedAreaRatio` must be finite and in `(0, 1]`;
- `needsOcr` and `hasTextLayer` must be booleans when supplied and must be logical opposites;
- `needsOcr: true` rejects non-empty `nearbyText`;
- unknown raw metadata is not copied into the trusted `input` object;
- the existing Direction B body without new metadata remains accepted and produces the old normalized input shape.

### Step 2: Implement backward-compatible normalization

- Keep existing image, question, page, and bounded-text validation.
- Treat the Direction C metadata group as optional for legacy Direction B.
- If any Direction C metadata field is present, require the complete group: `needsOcr`, `selectionSource`, `selectedAreaRatio`, and `hasTextLayer`.
- Copy only allowlisted validated fields to `input`.
- Keep the same `/api/analyze` handler, provider, error handling, and result schema.

### Step 3: Verify

```bash
node --test codebase/test/visual-route.test.mjs
```

---

## Task 4: Add OCR-aware instructions to the existing multimodal call

**Files:**

- Modify: `codebase/src/visual-analysis.mjs`
- Modify: `codebase/test/visual-analysis.test.mjs`

### Step 1: Add failing prompt tests

Extract/export `buildInstruction(input)` for direct policy testing and prove:

- `needsOcr: false` tells the model to use the selected crop and bounded text together;
- `needsOcr: true` explicitly asks the same multimodal model to read only visible text inside the crop before explaining it;
- the OCR instruction forbids guessing unreadable text and requires `NEED_BETTER_IMAGE` when pixels cannot be read;
- missing labels/title still require `NEED_WIDER_REGION`;
- OCR-derived text must not be emitted as a PDF citation;
- the instruction never asks for the full page or another provider;
- OpenAI Responses, direct Gemini, and compatible chat bodies all receive the same instruction policy;
- the four-route structured result schema remains byte-for-byte equivalent in required fields and route values.

### Step 2: Implement the conditional instruction

Use a small conditional block inside the existing instruction builder. Do not add a preliminary OCR call and do not place read text into the result schema.

### Step 3: Verify

```bash
node --test codebase/test/visual-analysis.test.mjs
```

Because C7 changes the visual prompt, record in the PR handoff that the existing Direction B 20-case golden set must be rerun as a separate run before final acceptance.

---

## Task 5: Extend trace metadata without content leakage

**Files:**

- Modify: `codebase/src/trace.mjs`
- Modify: `codebase/test/trace.test.mjs`

### Step 1: Add failing metadata/redaction tests

For a Direction C input, require exactly these additional trace values:

```js
{
  selectionSource: "snip",
  selectedAreaRatio: 0.2,
  hasTextLayer: true,
}
```

Also assert that the serialized trace does not contain:

- `imageData`;
- `nearbyText` or any simulated OCR text;
- the raw question;
- provenance text or source label;
- API key or upstream response body.

Add a legacy Direction B case proving missing Direction C metadata does not break trace recording and does not invent misleading selection metadata.

### Step 2: Implement allowlisted trace fields

- Preserve timestamp, provider, model, slide number, question hash, image byte count, and route.
- Add the three Direction C fields only when the validated input contains the complete metadata group.
- Never spread `input` or `result` into the trace entry.

### Step 3: Verify

```bash
node --test codebase/test/trace.test.mjs
```

---

## Task 6: C7 regression and handoff gate

### Automated verification

From the repository root:

```bash
node --test codebase/test/visual-request.test.mjs
node --test codebase/test/visual-request-wiring.test.mjs
node --test codebase/test/visual-analysis.test.mjs
node --test codebase/test/visual-route.test.mjs
node --test codebase/test/trace.test.mjs
npm --prefix codebase run check
npm --prefix codebase test
git diff --check
git status --short
```

If dependencies are absent, run `npm ci` in `codebase/` before the full suite. Do not treat `ERR_MODULE_NOT_FOUND: express` as a product-test pass.

### Required review checks

- [ ] C0 and C2 files are unchanged.
- [ ] `public/app.js`, HTML, and CSS are unchanged.
- [ ] No dependency, OCR engine, endpoint, schema, or provider fallback was added.
- [ ] Direction B route tests remain green without Direction C metadata.
- [ ] Direction C metadata validation rejects inconsistent OCR state.
- [ ] All provider request formats carry the same OCR-aware policy.
- [ ] Trace contains only approved metadata and no raw learner/crop/text content.
- [ ] A separate Direction B 20-case rerun is assigned because the prompt changed.

### Handoff to C8

```text
Package: C7
Produces: buildVisualRequest({ selection, context, question }) and formatSelectionProvenance(selection)
Consumes: C0 selection contract and C2 extractPdfContext result
Server: existing POST /api/analyze only
Tests: request policy + route + prompt + trace + full suite
C8 action: import /visual-request.mjs, call it with the C2 result, POST its output, and render formatSelectionProvenance(selection)
Privacy: no raw crop, bounded/OCR text, or raw question persisted
Known boundary: C7 does not wire app state, crop extraction, submit handling, or UI rendering
Evaluation consequence: rerun Direction B 20-case set before final C acceptance
```

## Definition of Done

C7 is complete only when all of the following are true:

- [ ] C2 text and no-text outputs both produce valid Direction C request bodies.
- [ ] A scanned/no-text crop is handled within the existing single multimodal call.
- [ ] Unreadable OCR input is explicitly routed away from grounded guessing.
- [ ] Provenance distinguishes all four selection sources and is ready for C8 rendering.
- [ ] `/api/analyze` remains backward-compatible with Direction B.
- [ ] Trace metadata is useful for evaluation and contains no raw sensitive content.
- [ ] Focused tests, full suite, static check, and diff check pass.
- [ ] The PR handoff states that C8 owns integration and C9 owns the Direction C evaluation artifacts.
