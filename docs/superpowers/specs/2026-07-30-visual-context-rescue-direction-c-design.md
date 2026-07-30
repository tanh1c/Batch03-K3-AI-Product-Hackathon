# Visual Context Rescue — Direction C Design

## 1. Product decision

Direction B remains the stable baseline: a learner selects a configured visual region, the browser crops it, and the existing multimodal pipeline returns one of four validated routes.

Direction C extends the same product flow to every uploaded PDF through three gated capabilities:

1. freeform Snip and Circle selection;
2. PDF-native text/image region suggestions with clickable overlays;
3. OCR-like reading by the existing multimodal model only for the crop the learner selected.

All three capabilities are in scope, but they integrate in gates so each intermediate state remains runnable. Direction C does not replace B and must not weaken its route contract, privacy guarantees, or recovery behavior.

## 2. User experience

1. The learner opens an uploaded PDF.
2. The learner may:
   - drag a rectangular Snip region;
   - draw a Circle around content;
   - click a suggested image or text region detected from the PDF;
   - continue using the configured Direction B regions on the demo slide.
3. The UI outlines the exact region that will be sent and pre-fills a short suggested question.
4. The learner may adjust the selection or question before sending.
5. The browser crops only the selected rectangle from the rendered PDF canvas and extracts only text-layer items intersecting that rectangle.
6. If the crop has no usable text layer, the same multimodal request asks the model to read visible text from the crop before explaining it.
7. The existing four-route decision returns a grounded answer or a concrete recovery action.
8. Provenance identifies the slide and selection source. A failed detector never blocks manual Snip or Circle selection.

The system never scans a whole course or sends a whole slide automatically. Detection runs locally and AI is called only after an explicit learner action.

## 3. Shared selection contract

Every interaction source produces the same normalized object:

```js
{
  pageNumber: 2,
  source: "snip", // "snip" | "circle" | "detected-image" | "detected-text"
  bounds: { x: 0.12, y: 0.18, width: 0.46, height: 0.35 },
  label: "Vùng tự chọn",
  text: "",
  needsOcr: false,
}
```

Rules:

- `pageNumber` is a positive PDF page number.
- `bounds` are normalized to the page-paper coordinate space, each edge clamped to `[0, 1]`, with positive width and height.
- `source` is one of the four exact values above.
- `text` is populated only by the context extraction stage.
- `needsOcr` is `true` only when the selected crop has no usable intersecting text-layer content.
- Direction B may adapt its configured regions to this contract internally, but its current UI and behavior remain valid.

This contract is the only object exchanged between selection UI, detection, crop/context extraction, and request orchestration.

## 4. Architecture and module boundaries

### `src/selection-geometry.mjs`

Pure geometry only:

- `circlePointsToBounds(points, padding) -> bounds`
- `rectToNormalizedBounds(start, end, pageRect) -> bounds`
- `intersectionRatio(a, b) -> number`
- `clampBounds(bounds) -> bounds`

It has no DOM, PDF.js, canvas, or AI dependency.

### `public/pdf-context.mjs`

Owns context extraction from a rendered page:

- maps normalized selection bounds to source canvas pixels;
- waits for the page render task when necessary;
- crops `.pdf-canvas`, never `.annotation-canvas`;
- limits the output dimensions before PNG encoding;
- returns text items whose rectangles intersect the selection;
- returns `{ imageData, mediaType, text, needsOcr, pixelBounds }`.

It does not call AI or render overlays.

### `public/pdf-regions.mjs`

Owns local candidate detection:

- text candidates come from PDF.js text item bounds and are merged into nearby blocks;
- image candidates come from PDF operator-list image paint operations and their transforms;
- vector/chart candidates use a conservative heuristic based on grouped drawing density with limited text;
- candidates are filtered by minimum area, page-sized bounds, near-duplicate overlap, and invalid geometry;
- returns `Array<{ id, kind, bounds, label, confidence }>` where `kind` is `image`, `text`, or `vector`.

It does not create DOM, call AI, or decide whether a candidate is semantically meaningful.

### `public/selection-overlay.mjs`

Owns interaction rendering:

- renders accessible buttons for detected candidates;
- renders Snip preview and current selection outline;
- exposes callbacks instead of importing app state;
- supports keyboard focus and visible focus state;
- keeps overlays from blocking existing text selection when detection mode is off.

### `public/app.js`

Remains the composition root:

- switches tools/modes;
- stores the current selection contract;
- connects selection, context extraction, overlays, and existing `/api/analyze` request;
- renders the existing answer/provenance/recovery UI;
- contains no geometry or detection algorithm.

### Existing server and AI modules

`src/visual-analysis.mjs`, `src/visual-route.mjs`, provider adapters, trace redaction, and the exact four-route output contract remain authoritative. Direction C adds bounded selection metadata and OCR instructions without adding a second AI endpoint or a second result schema.

## 5. Detailed data flow

### Snip

1. Pointer down records a page-relative start point.
2. Pointer movement shows a rectangular preview.
3. Pointer up converts the rectangle to normalized bounds.
4. Regions below the minimum size are discarded without changing selection.
5. A valid selection is outlined and may be sent or redrawn.

### Circle

1. The current annotation tool records normalized points.
2. On completion, geometry computes the smallest containing rectangle plus bounded padding.
3. The original circle annotation remains visible.
4. The computed rectangle becomes the AI selection; the freehand stroke itself is never included in the crop.

### Detected region

1. After a page is parsed, local detection emits candidates.
2. The overlay renders candidate buttons only when visual-region suggestions are enabled.
3. Clicking a candidate converts it to the shared selection contract.
4. A wrong or missing candidate does not trigger an error; the learner uses Snip or Circle.

### Crop and text extraction

1. The context extractor waits until the requested page canvas has completed rendering.
2. Normalized bounds are mapped to the canvas source pixels, independent of current CSS zoom.
3. Only the source pixels inside the bounds are copied to an offscreen canvas.
4. Text item rectangles are intersected with the same normalized bounds.
5. Intersecting text is ordered and compacted. Empty text sets `needsOcr: true`.
6. The request sends only PNG base64, the learner question, slide number, and selected text context.

### AI behavior

- With extracted text, the model uses both the crop and that bounded text.
- With `needsOcr: true`, the model reads visible text directly from the crop as part of the same multimodal decision call.
- `VISUAL_GROUNDED` is allowed only when claims are supported by the crop and bounded text.
- Missing labels or title produce `NEED_WIDER_REGION`.
- Unreadable pixels produce `NEED_BETTER_IMAGE`.
- Unsupported questions produce `INSUFFICIENT`.
- The system never silently sends the whole page as a recovery fallback.

## 6. Detection heuristics and ceilings

Detection is deliberately conservative:

- merge adjacent text items into line/block candidates using vertical overlap and bounded horizontal/vertical gaps;
- derive bitmap candidates from PDF image paint operations and current transformation matrices;
- emit vector candidates only for sufficiently large grouped drawing bounds with limited overlapping text;
- reject candidates below the minimum visible area;
- reject near-page-sized backgrounds;
- merge near-duplicates with high intersection-over-union;
- cap the number of overlays per page to prevent visual clutter.

The detector is a suggestion system, not a semantic segmenter. It is not expected to identify every chart, formula, grouped vector, or background image. Manual Snip and Circle are the explicit upgrade path when heuristics fail.

## 7. Error handling and recovery

- Page not rendered: wait for the existing render promise; do not crop a blank canvas.
- Selection too small: keep the previous valid selection and ask the learner to select a larger region.
- Invalid/out-of-page geometry: reject locally before encoding or calling AI.
- No text layer: set `needsOcr`, do not show a PDF error.
- Detection yields no candidates: hide suggestions and leave Snip/Circle available.
- Detection throws for one page: report no candidates for that page; PDF reading continues.
- Crop encoding fails: show a local retry message without sending a request.
- AI cannot read the crop: preserve `NEED_BETTER_IMAGE` or `NEED_WIDER_REGION`; do not fall back to an unbounded page request.
- Switching documents/pages: clear transient selection/overlay state and cancel stale detection work.

## 8. Privacy, provenance, and trace

- Raw crops, OCR text, questions, and PDF files are not persisted by the server.
- No automatic whole-slide upload occurs.
- The model receives only the selected crop and bounded context after explicit submit.
- Trace metadata may add `selectionSource`, crop byte count, selected-area ratio, `hasTextLayer`, and route.
- Trace never stores raw image, extracted/OCR text, raw question, API key, or upstream body.
- Provenance is `Dựa trên vùng đã chọn ở slide N` plus a source label such as `Vùng khoanh`, `Vùng cắt`, or `Vùng hình được gợi ý`.
- OCR-derived text is not displayed as a fabricated PDF citation.

## 9. Parallel work packages

| Package | Suggested owner | Produces | May modify |
|---|---|---|---|
| C0 — Selection geometry and contract | Lê Minh Ngọc | Pure geometry functions and tests | `src/selection-geometry.mjs`, its test |
| C1 — Snipping Tool | Chu Nguyễn Tuấn Anh | Rectangle interaction that emits a selection | Snip UI module and minimal composer wiring |
| C2 — PDF crop and bounded text | Chu Nguyễn Tuấn Anh | `extractPdfContext(page, selection)` | `public/pdf-context.mjs`, its tests |
| C3 — Image/vector detection | Đào Thị Trang | Image/vector candidate list | `public/pdf-regions.mjs`, detector tests/fixtures |
| C4 — Text-block detection | Đào Thị Trang | Merged text candidate list | Same detector module through separate exported function/tests |
| C5 — Clickable overlay UI | Nguyễn Đức Chung | Accessible candidate/selection overlays | `public/selection-overlay.mjs`, `styles.css`, small HTML hooks |
| C6 — Circle-to-AI bridge | Lê Minh Ngọc | Existing circle emits shared selection | Circle integration only after C0 and C2 |
| C7 — OCR/AI packaging | Vũ Tiến Dũng | `needsOcr` prompt/request metadata and provenance | Visual request builder/tests and trace metadata |
| C8 — Integration and regression | Chu Nguyễn Tuấn Anh | Composition in `app.js`; B remains green | `app.js` only after package interfaces merge |
| C9 — Direction C eval and docs | Vũ Tiến Dũng | Fixtures, golden cases, results, README/spec/changelog | `eval/`, docs/artifacts |

Rules for parallel work:

- C0 merges first.
- C1/C2, C3/C4, C5 fixture UI, and C7 may proceed in parallel after the contract is fixed.
- C5 consumes static candidate fixtures before C3/C4 are ready.
- C6 starts after C0 and C2.
- C8 integrates existing interfaces and does not rewrite feature algorithms.
- One branch and pull request per package.
- Only C1, C5, and C8 touch UI orchestration; algorithms stay outside `app.js`.
- Current PDF.js legacy compatibility remains a prerequisite and must be committed before parallel branches start.

## 10. Integration gates

### Gate C1 — Freeform context capture

Required:

- Snip and Circle both emit valid normalized selections.
- Crops match the selected source at 60%, 90%, and 150% CSS zoom.
- Text extraction includes intersecting text and excludes text outside the region.
- Crop + bounded text reaches the existing Visual AI endpoint.
- Direction B regression path remains usable.

### Gate C2 — Suggested regions

Required:

- Bitmap and text-block candidates are detected on fixture PDFs.
- Duplicate/background candidates are filtered.
- Overlay buttons support pointer and keyboard interaction.
- Detection overlays do not block normal text selection when disabled.
- Empty or incorrect detection still leaves Snip/Circle usable.
- Detection never triggers an AI request by itself.

### Gate C3 — OCR-like multimodal fallback

Required:

- A scanned crop with no text layer can be read and explained by the existing multimodal call.
- Blurred/unreadable crops do not produce invented text.
- Crops missing labels request a wider selection.
- No raw crop or read text appears in trace/storage.
- Direction C meets its own golden-set bar before inclusion in the final demo.

## 11. Test and evaluation plan

### Automated tests

Minimum coverage:

- 8 geometry cases: rectangle direction, clamp, circle padding, tiny selection, intersection, page edges.
- 6 crop/text cases: zoom independence, source pixels, partial/full/no text overlap, render wait, stale page cancellation.
- 6 detector cases: bitmap, text block, vector candidate, tiny rejection, background rejection, duplicate merge.
- 4 browser paths: Snip, Circle, detected image, recovery/reselection.
- Existing provider, contract, route, trace, PDF compatibility, and Direction B tests remain green.

### Direction C golden set

Add 12 separate cases:

- 4 mixed text/image PDF selections;
- 3 scanned/image-text selections requiring multimodal reading;
- 3 missing-context or unreadable selections;
- 2 detector false-positive/no-candidate cases that prove manual fallback remains usable.

Proposed bar, frozen before the official C run:

- at least 10/12 end-to-end cases pass;
- zero wrong-page crops;
- zero unsupported `VISUAL_GROUNDED` answers;
- every detector miss/failure retains a working Snip or Circle path;
- Direction B's existing 20-case bar is unchanged.

Changing only local selection/detection UI does not require relabeling the existing Direction B run. Any change to the visual prompt, route rules, or result validation requires rerunning the existing 20 cases as a separate run.

## 12. Delivery and demo policy

Direction C is complete only after Gate C3 and its frozen evaluation bar pass. Before that, artifacts must describe the exact completed gate rather than claim full automatic segmentation.

The final demo should show:

1. Snip or Circle on an uploaded PDF;
2. one detected clickable region;
3. one scanned crop handled by multimodal reading;
4. one detector miss or insufficient crop recovered through manual reselection.

If auto-detection is unstable near submission, retain C1 freeform selection and remove candidate overlays from the demo. Direction B remains the safe baseline at all times.
