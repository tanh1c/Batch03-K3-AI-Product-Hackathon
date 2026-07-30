# Direction C manual browser checklist

Automated tests do not prove PDF canvas alignment. Record the PDF name, browser and result for every checked row before calling Direction C complete.

| Check | Expected | Result/evidence |
|---|---|---|
| Upload a text-layer PDF | Pages render and Direction B demo remains available after switching back | PASS — `tham-khao/Strategyn_JTBD_Playbook.pdf`, 48 pages rendered in the Codex in-app browser; switching back reset the mode to Read and the Direction B Machine Learning region remained selectable |
| Snip at 60% zoom | Outline and submitted crop match the drag | PASS for normalized outline/crop packaging — the same `31.9778%, 55.9313%, 45.5556%, 27.4678%` bounds survived the zoom change; automated tests cover crop coordinates |
| Snip at 90% zoom | Outline and submitted crop match the drag | PASS for normalized outline/crop packaging — selection created on the real PDF and kept the same normalized bounds |
| Snip at 150% zoom | Outline and submitted crop match the drag | PASS for normalized outline/crop packaging — the same bounds survived canvas resize to the 150% render |
| Reverse/out-of-edge Snip | Bounds are normalized/clipped; tiny drag keeps the prior selection | PARTIAL — reverse drag passed manually; clipping and tiny-drag retention pass automated geometry/Snip tests |
| Circle on a PDF page | Stroke remains visible and its padded rectangle becomes the AI selection | PASS — a real page circle produced source `circle`, page 1 and normalized padded bounds |
| Suggested image/text regions | Buttons are focusable and Enter/Space selects the candidate | PARTIAL — seven candidate buttons rendered and mouse selection passed; native-button keyboard behavior is covered by the overlay test but was not completed manually |
| Suggestions disabled | PDF text remains selectable | PASS at DOM/pointer-event level — candidate and drawing overlays were disabled and the PDF text layer was not covered |
| Different page selection | Provenance and crop use the selected page, not the current stale page | Not run |
| Scanned PDF crop | `needsOcr` is true and the same `/api/analyze` call reads only the crop | Not run |
| Detector miss/false positive | Manual Snip/Circle remains usable | PARTIAL — Snip and Circle both remained usable independently; a deliberate detector miss was not simulated in-browser |
| Recovery route | Reselect action returns to Snip without uploading the whole page | Not run |
| Privacy | No raw image/text/question appears in trace or local storage | PARTIAL — automated trace tests pass and the browser stores no crop; the live provider call returned 502 before a successful trace could be inspected |

Use only approved/synthetic PDFs. Do not attach a real private PDF or API key to the artifact.

Manual run: 2026-07-30, Codex in-app browser, local server on port 3013. The live
Snip submission reached the existing `/api/analyze` path, but its configured
Gemini upstream returned 502, so this checklist does not claim a successful AI
answer. The separate Direction C evaluation records provider quality truthfully.
