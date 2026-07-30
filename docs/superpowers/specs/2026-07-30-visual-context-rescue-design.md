# Visual Context Rescue — Design

## 1. Product decision

Build **B: click an image region to ask the VLearn tutor** as the committed prototype. Treat **C: automatic slide-wide segmentation** as a stretch goal attempted only after B, evaluation, and validation are complete.

VLearn already lets learners select text in a PDF and shows a confidence percentage below each tutor answer. The remaining gap is visual content: a learner can see a diagram or image on the current slide, but cannot select it as tutor context. Confidence does not solve this job because the tutor still cannot explain the visible image.

## 2. Pain and evidence hypothesis

**User:** a learner studying a PDF slide in VLearn.

**Job:** understand a diagram, chart, screenshot, or other non-text visual without leaving the lesson.

**Pain:** only the PDF text layer can be selected, so the learner must describe the image manually or receives a refusal even though the relevant visual is on screen.

**Consequence:** the learner remains blocked, spends time reconstructing context, or receives an answer grounded in incomplete information.

Before CP4, the team must validate this as evidence A and/or B under the hackathon rubric. The observed slide-18 failure is an initial example, not sufficient evidence by itself. Mining counts must have a reproducible coding rule, at least five short verbatim examples, and a manual audit. Survey evidence must retain every response and meet the required sample and confirmation threshold.

## 3. Prototype slice

> Một học viên đang học trên VLearn click vào hình trong slide mà mình không hiểu, AI quyết định vùng hình có đủ căn cứ để giải thích hay cần thêm context, để học viên hiểu hình ngay tại slide mà không phải mô tả lại bằng chữ.

The prototype demonstrates one job, one central AI decision, and one result. It does not rebuild VLearn or its retrieval system.

## 4. User experience

1. The PDF viewer renders the current slide and its existing selectable text.
2. Image regions have a subtle hover overlay. For the committed prototype, regions may come from PDF-native image bounds or explicitly configured bounds on demo slides.
3. The learner clicks one image region and asks a question.
4. The system sends the cropped region, the question, slide number, and nearby text when available to a multimodal model.
5. The model returns one route and, where grounded, an answer.
6. The UI highlights the selected source region and labels the answer `Dựa trên vùng hình ở slide N`.
7. If context is insufficient, the UI gives one concrete recovery action rather than a generic refusal.

The main demo compares the current failure with the prototype on the same visual question, then shows one failure path where the selected crop is insufficient.

## 5. Routing and expected behavior

| Route | Condition | Behavior |
|---|---|---|
| `VISUAL_GROUNDED` | The selected visual contains enough evidence | Explain only what the visual and supplied context support |
| `NEED_WIDER_REGION` | Labels, legend, or surrounding context are cropped out | Ask the learner to widen the selected region |
| `NEED_BETTER_IMAGE` | The visual is too small, blurred, or unreadable | Ask the learner to zoom or provide a clearer crop |
| `INSUFFICIENT` | The answer cannot be established from supplied evidence | State the limitation and do not guess |

The output contract contains `route`, `answer`, `reason`, and `recovery_action`. `answer` is empty for routes that cannot answer safely.

The prototype must distinguish provenance:

- Text-retrieval answers may use the existing page or passage citation.
- Vision answers use the selected-region label and slide number.
- A vision answer must not fabricate a text citation.

## 6. Components and data flow

### PDF interaction layer

Renders the slide, retains text selection, displays image-region overlays, and captures the selected bounds. It contains no AI decision.

### Context packager

Creates the minimum request payload:

- cropped image region;
- learner question;
- slide number;
- nearby slide text when available.

Only the selected crop and necessary context are sent to the model. Provided hackathon data is not uploaded in bulk.

### Multimodal decision call

Makes the required real AI call and returns the structured route. The prompt requires evidence-bounded answers and forbids guessing beyond the image and supplied text.

### Answer panel

Displays the answer or recovery action, confidence if used, provenance label, and selected-region highlight. Confidence is supplementary; it does not replace route-specific recovery.

## 7. Hard cases

The scenario set covers the rubric taxonomy:

1. **Source of truth:** the diagram conflicts with nearby text, a legend is missing, or the model is asked about content outside the crop.
2. **Ambiguity or missing information:** multiple unlabeled objects, a crop excludes the title, or the learner asks “cái này là gì?” with no clear target.
3. **Out of scope or authority:** the learner requests an answer not supported by the slide or asks the tutor to make an academic decision beyond explanation.
4. **Domain-specific error:** reversed arrows, confused categories, unreadable axes, formulas, or a misleading visual interpretation that would teach the concept incorrectly.

The prototype must visibly support four paths: grounded success, low-context recovery, unreadable-image failure, and correction through a second selection.

## 8. Evaluation

Create a golden set of at least 20 cases:

- at least two cases for each of the four hard-case classes;
- 8–10 ordinary cases;
- 2–4 rare cases;
- at least 10 cases developed from permitted chatlog evidence, referenced by anonymized conversation/turn IDs rather than copied wholesale.

Each case records input image reference, question, expected route, allowed answer facts, forbidden claims, actual route, result, and failure analysis.

Proposed quality bar to finalize in `spec.md` before the day-one deadline:

- correct route on at least 18/20 cases;
- zero unsupported factual claims across all 20 cases;
- at least 4/5 validation users understand the next action after a failure;
- at least 3/5 validation users complete the visual-question job with no more than one reselection.

The team runs the full set at least once, records every result including failures, and does not alter the quality bar after the deadline.

## 9. Validation

Test with at least five people outside the team, including at least two willing users named at CP1. Ask each person to:

1. choose a visual they do not understand;
2. use the click-to-ask flow without coaching;
3. recover from one deliberately incomplete crop;
4. state whether the answer and its source are understandable.

Record role/name as allowed by event rules, short verbatim feedback, observed behavior, task completion, and resulting changelog decision. Do not use undisclosed real personal data in the prototype or golden set.

## 10. Scope and implementation order

Committed order:

1. Click-to-ask flow works end to end.
2. Multimodal AI call and trace are real.
3. All four experience paths are demonstrable.
4. Golden set and complete result table exist.
5. Five-user validation and changelog are complete.
6. Only then attempt C.

### Non-goals

- Rebuilding VLearn, authentication, or course-wide RAG.
- Training a custom OCR, detection, or segmentation model.
- Perfect detection of every bitmap, vector, chart, formula, and PDF object.
- Automatically explaining every visual before the learner selects one.
- Replacing the existing text-selection flow.

## 11. Stretch goal C

If all committed work is complete, inspect the current slide and suggest additional selectable text, bitmap, chart, and vector regions. C reuses the same crop, routing, answer, provenance, and evaluation flow; it is not a separate product mode.

Use native PDF object/layout bounds before considering computer vision. If a region cannot be reliably detected, fall back to user selection. C must not reduce B's correctness, response time, or clarity, and it must be removed from the demo if incomplete.

## 12. Prototype truthfulness and data safety

Declare whether the prototype is Sketch, Mock, or Working. If demo region bounds are configured manually, label that detection step as mocked while keeping the image interaction and central multimodal decision real.

Use only supplied hackathon data or synthetic visuals. Keep provided data out of the submission repository, include only short permitted excerpts or anonymized IDs, send minimum context to external APIs, and never commit API keys.
