# Visual Context Rescue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser prototype in which a learner clicks a visual region on a slide, sends only that crop and minimal context to Claude Vision, and receives either a grounded explanation or a concrete recovery action.

**Architecture:** A dependency-free Node 24 HTTP server serves a small browser app and owns the Anthropic API key. Pure modules isolate the visual-decision contract, request validation, geometry, and trace redaction so they can be tested with Node's built-in test runner. Evidence mining, golden-set evaluation, and user validation live outside runtime code and generate auditable artifacts.

**Tech Stack:** Node.js 24 ESM, native `node:http`/`fetch`/`node:test`, browser Canvas and DOM APIs, Anthropic Messages API with `claude-sonnet-4-6`, Python 3.13 stdlib for mining, existing Pillow 12.1 for synthetic PNG fixtures.

## Global Constraints

- B, click an image region to ask, is the committed MVP; C is excluded until the final MVP gate passes.
- Keep the central multimodal call real; manually configured image bounds may be declared mocked.
- Supported routes are exactly `VISUAL_GROUNDED`, `NEED_WIDER_REGION`, `NEED_BETTER_IMAGE`, and `INSUFFICIENT`.
- The result object contains exactly `route`, `answer`, `reason`, and `recovery_action`; `answer` must be empty outside `VISUAL_GROUNDED`.
- Vision answers say `Dựa trên vùng hình ở slide N` and never invent a text-retrieval citation.
- Send only the selected PNG crop, question, slide number, and nearby text; never put `ANTHROPIC_API_KEY` in browser code, traces, or git.
- Use only supplied hackathon data or synthetic visuals; do not copy the provided data pack into submission artifacts.
- Quality bar: route correct on at least 18/20 cases, zero unsupported factual claims, at least 4/5 users understand recovery, and at least 3/5 finish with at most one reselection.
- Do not add a framework, database, authentication, OCR, custom detector, RAG, or deployment work.

## File Map

```text
codebase/
├── package.json                    # commands; no runtime dependencies
├── server.mjs                      # HTTP composition and startup
├── README.md                       # setup, real/mock declaration, demo flow
├── public/
│   ├── index.html                  # accessible prototype shell
│   ├── app.js                      # selection, crop, API call, answer rendering
│   ├── styles.css                  # VLearn-like two-column presentation
│   └── assets/
│       ├── ml-vs-dl.svg            # synthetic readable visual
│       └── unreadable.svg          # synthetic low-quality visual
├── src/
│   ├── geometry.mjs                # normalized bounds → image pixels
│   ├── visual-analysis.mjs         # Claude body, response parser, contract
│   ├── http-app.mjs                # static/API boundary and input limits
│   └── trace.mjs                   # append redacted real-call evidence
├── test/
│   ├── geometry.test.mjs
│   ├── visual-analysis.test.mjs
│   ├── http-app.test.mjs
│   └── trace.test.mjs
└── traces/
    └── .gitkeep

evidence/
├── mine_visual_failures.py         # reproducible chatlog coding rule
├── test_mine_visual_failures.py
├── mining-candidates.csv           # IDs and matched markers only
├── mining-audit.csv                # manual true/false-positive decisions
├── mining-method.md                # denominator, rule, counts, limitations
├── survey-protocol.md              # fixed evidence-A questions
└── survey-log.json                 # real responses, initially empty

eval/
├── generate_fixtures.py            # synthetic PNG generator
├── fixtures/*.png                  # generated safe images
├── golden-set.json                 # 20 auditable cases
├── run-eval.mjs                    # real model run
├── check-results.mjs               # quality-bar calculation
└── results/.gitkeep

validation/
├── protocol.md                     # five-user moderated task
├── feedback-log.json               # real observations, initially empty
├── check-validation.mjs            # validation-bar calculation
└── changelog.md                    # decisions caused by feedback
```

---

### Task 1: Geometry and static prototype shell

**Files:**
- Create: `codebase/package.json`
- Create: `codebase/src/geometry.mjs`
- Create: `codebase/test/geometry.test.mjs`
- Create: `codebase/public/index.html`
- Create: `codebase/public/styles.css`
- Create: `codebase/public/assets/ml-vs-dl.svg`
- Create: `codebase/public/assets/unreadable.svg`

**Interfaces:**
- Consumes: normalized region `{ x, y, width, height }`, each value from 0 to 1.
- Produces: `toPixelBounds(region, naturalWidth, naturalHeight) -> { sx, sy, sw, sh }` for Task 4.

- [ ] **Step 1: Add the package commands**

```json
{
  "name": "visual-context-rescue",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "start": "node server.mjs",
    "test": "node --test",
    "eval": "node ../eval/run-eval.mjs"
  }
}
```

- [ ] **Step 2: Write the failing geometry tests**

```js
// codebase/test/geometry.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { toPixelBounds } from "../src/geometry.mjs";

test("converts normalized bounds to image pixels", () => {
  assert.deepEqual(
    toPixelBounds({ x: 0.25, y: 0.1, width: 0.5, height: 0.8 }, 1200, 800),
    { sx: 300, sy: 80, sw: 600, sh: 640 },
  );
});

test("rejects a region outside the image", () => {
  assert.throws(
    () => toPixelBounds({ x: 0.8, y: 0, width: 0.3, height: 1 }, 1200, 800),
    /inside the image/,
  );
});
```

- [ ] **Step 3: Run the tests and confirm the missing-module failure**

Run: `node --test codebase/test/geometry.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `geometry.mjs`.

- [ ] **Step 4: Add the minimal geometry implementation**

```js
// codebase/src/geometry.mjs
export function toPixelBounds(region, naturalWidth, naturalHeight) {
  const values = [region.x, region.y, region.width, region.height];
  if (
    !values.every(Number.isFinite) ||
    region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 ||
    region.x + region.width > 1 || region.y + region.height > 1
  ) {
    throw new TypeError("Region must be inside the image");
  }
  return {
    sx: Math.round(region.x * naturalWidth),
    sy: Math.round(region.y * naturalHeight),
    sw: Math.round(region.width * naturalWidth),
    sh: Math.round(region.height * naturalHeight),
  };
}
```

- [ ] **Step 5: Run the geometry tests**

Run: `node --test codebase/test/geometry.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 6: Create the static HTML shell**

Create `codebase/public/index.html` with a Vietnamese interface containing:

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Visual Context Rescue</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="layout">
    <section class="lesson" aria-labelledby="slide-title">
      <p class="eyebrow">VLearn · Slide 18</p>
      <h1 id="slide-title">Machine Learning và Deep Learning</h1>
      <p id="nearby-text">So sánh cách hai phương pháp xử lý đặc trưng trước khi dự đoán.</p>
      <div class="visual-stage">
        <img id="slide-visual" src="/assets/ml-vs-dl.svg" alt="Sơ đồ so sánh Machine Learning và Deep Learning">
        <div id="region-layer" aria-label="Các vùng hình có thể hỏi"></div>
      </div>
      <button id="select-whole" type="button">Chọn toàn bộ hình</button>
    </section>
    <aside class="tutor" aria-labelledby="tutor-title">
      <h2 id="tutor-title">AI Tutor</h2>
      <label for="scenario">Ca demo</label>
      <select id="scenario">
        <option value="grounded">Hình đầy đủ</option>
        <option value="missing-context">Thiếu nhãn</option>
        <option value="unreadable">Ảnh không đọc được</option>
        <option value="outside">Ngoài căn cứ</option>
      </select>
      <p id="selection-status" role="status">Hãy click vào vùng hình muốn hỏi.</p>
      <form id="question-form">
        <label for="question">Câu hỏi</label>
        <textarea id="question" maxlength="1000" required>Giải thích sự khác nhau trong sơ đồ này.</textarea>
        <button type="submit">Hỏi từ vùng đã chọn</button>
      </form>
      <section id="answer" aria-live="polite" hidden></section>
    </aside>
  </main>
  <canvas id="crop-canvas" hidden></canvas>
  <script type="module" src="/app.js"></script>
</body>
</html>
```

Style it in `styles.css` as a responsive two-column layout, preserve visible keyboard focus, use `<button>` overlays instead of clickable `<div>` elements, and collapse to one column below 800px. Keep the file under 180 lines.

- [ ] **Step 7: Add two synthetic SVG assets**

`ml-vs-dl.svg` must contain a title plus two labeled flows: `Raw data → Hand-crafted features → ML model` and `Raw data → Neural network → Prediction`. `unreadable.svg` must contain the same structure at tiny size under an SVG blur filter. Do not copy a real course slide.

- [ ] **Step 8: Run the tests and commit**

Run: `npm --prefix codebase test`

Expected: 2 tests PASS.

```bash
git add codebase/package.json codebase/src/geometry.mjs codebase/test/geometry.test.mjs codebase/public/index.html codebase/public/styles.css codebase/public/assets/ml-vs-dl.svg codebase/public/assets/unreadable.svg
git commit -m "feat: add visual selection shell"
```

---

### Task 2: Multimodal decision contract

**Files:**
- Create: `codebase/src/visual-analysis.mjs`
- Create: `codebase/test/visual-analysis.test.mjs`

**Interfaces:**
- Consumes: `analyzeVisual({ imageData, mediaType, question, slideNumber, nearbyText }, options)`.
- Produces: `{ route, answer, reason, recovery_action }` with the four exact routes.
- Calls: `POST https://api.anthropic.com/v1/messages` with forced tool `emit_visual_result`.

- [ ] **Step 1: Write contract and request-body tests**

Tests must assert all of the following:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnthropicBody,
  parseAnthropicResult,
  validateResult,
} from "../src/visual-analysis.mjs";

const input = {
  imageData: "aGVsbG8=",
  mediaType: "image/png",
  question: "Giải thích hình này",
  slideNumber: 18,
  nearbyText: "Machine Learning và Deep Learning",
};

test("builds an image-first forced-tool request", () => {
  const body = buildAnthropicBody(input, "claude-sonnet-4-6");
  assert.equal(body.model, "claude-sonnet-4-6");
  assert.equal(body.messages[0].content[0].type, "image");
  assert.equal(body.tools[0].name, "emit_visual_result");
  assert.deepEqual(body.tool_choice, { type: "tool", name: "emit_visual_result" });
});

test("parses the forced tool payload", () => {
  const expected = {
    route: "VISUAL_GROUNDED",
    answer: "Hai luồng xử lý đặc trưng khác nhau.",
    reason: "Tiêu đề và hai luồng đều đọc được.",
    recovery_action: "",
  };
  assert.deepEqual(parseAnthropicResult({
    content: [{ type: "tool_use", name: "emit_visual_result", input: expected }],
  }), expected);
});

test("requires an empty answer on recovery routes", () => {
  assert.throws(() => validateResult({
    route: "NEED_WIDER_REGION",
    answer: "Một phỏng đoán",
    reason: "Thiếu nhãn",
    recovery_action: "Chọn rộng hơn",
  }), /answer must be empty/);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test codebase/test/visual-analysis.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the schema, prompt, parser, and API call**

Create `codebase/src/visual-analysis.mjs`:

```js
export const ROUTES = [
  "VISUAL_GROUNDED",
  "NEED_WIDER_REGION",
  "NEED_BETTER_IMAGE",
  "INSUFFICIENT",
];

const RESULT_KEYS = ["answer", "reason", "recovery_action", "route"];

export function validateResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new TypeError("Visual result must be an object");
  }
  const keys = Object.keys(result).sort();
  if (JSON.stringify(keys) !== JSON.stringify(RESULT_KEYS)) {
    throw new TypeError("Visual result has unexpected fields");
  }
  if (!ROUTES.includes(result.route)) throw new TypeError("Unknown visual route");
  for (const key of ["answer", "reason", "recovery_action"]) {
    if (typeof result[key] !== "string") throw new TypeError(`${key} must be a string`);
  }
  if (result.route !== "VISUAL_GROUNDED" && result.answer !== "") {
    throw new TypeError("answer must be empty on recovery routes");
  }
  if (result.route !== "VISUAL_GROUNDED" && result.recovery_action.trim() === "") {
    throw new TypeError("recovery_action is required on recovery routes");
  }
  return result;
}

export function buildAnthropicBody(input, model) {
  const instruction = [
    "Bạn là AI Tutor chỉ được dùng vùng hình và ngữ cảnh được cung cấp. Chọn đúng một route.",
    "Chỉ dùng VISUAL_GROUNDED khi mọi ý trong câu trả lời nhìn thấy hoặc suy ra trực tiếp từ nguồn.",
    "Nếu thiếu nhãn/chú giải, chọn NEED_WIDER_REGION. Nếu ảnh mờ hoặc quá nhỏ, chọn NEED_BETTER_IMAGE.",
    "Nếu câu hỏi không thể xác lập từ nguồn, chọn INSUFFICIENT. Không tạo citation [trang N].",
    "Với route khác VISUAL_GROUNDED, answer phải là chuỗi rỗng và recovery_action phải là một hành động cụ thể.",
    `Slide: ${input.slideNumber}`,
    `Text lân cận: ${input.nearbyText || "(không có)"}`,
    `Câu hỏi: ${input.question}`,
  ].join("\n");
  return {
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.imageData } },
      { type: "text", text: instruction },
    ] }],
    tools: [{
      name: "emit_visual_result",
      description: "Return the grounded visual decision.",
      input_schema: {
        type: "object",
        properties: {
          route: { type: "string", enum: ROUTES },
          answer: { type: "string" },
          reason: { type: "string" },
          recovery_action: { type: "string" },
        },
        required: ["route", "answer", "reason", "recovery_action"],
        additionalProperties: false,
      },
    }],
    tool_choice: { type: "tool", name: "emit_visual_result" },
  };
}

export function parseAnthropicResult(message) {
  const block = message.content?.find(
    ({ type, name }) => type === "tool_use" && name === "emit_visual_result",
  );
  if (!block) throw new TypeError("Anthropic response omitted emit_visual_result");
  return validateResult(block.input);
}

export async function analyzeVisual(input, {
  apiKey,
  model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  fetchImpl = fetch,
} = {}) {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(buildAnthropicBody(input, model)),
  });
  if (!response.ok) throw new Error(`Anthropic API error ${response.status}`);
  return parseAnthropicResult(await response.json());
}
```

Never log the outbound body.

- [ ] **Step 4: Add a fake-fetch API test**

The fake fetch captures URL/options and returns a `200` response containing a `tool_use`. Assert the fixed endpoint, API-key header, image media type, and parsed result. Add a second test returning `401` and assert `Anthropic API error 401` without including the API key.

- [ ] **Step 5: Run tests and commit**

Run: `node --test codebase/test/visual-analysis.test.mjs`

Expected: all contract/API tests PASS.

```bash
git add codebase/src/visual-analysis.mjs codebase/test/visual-analysis.test.mjs
git commit -m "feat: add grounded vision decision contract"
```

---

### Task 3: HTTP boundary and redacted trace

**Files:**
- Create: `codebase/src/http-app.mjs`
- Create: `codebase/src/trace.mjs`
- Create: `codebase/server.mjs`
- Create: `codebase/test/http-app.test.mjs`
- Create: `codebase/test/trace.test.mjs`
- Create: `codebase/traces/.gitkeep`

**Interfaces:**
- Consumes: `POST /api/analyze` JSON matching Task 2 input.
- Produces: `200` result, `400` boundary error, `413` oversized body, or `502` upstream failure.
- Produces trace line: `{ timestamp, model, slideNumber, questionHash, imageBytes, route }`; no raw question/image/key.

- [ ] **Step 1: Write failing HTTP tests**

Start the app on port `0` with injected `analyze` and `recordTrace`. Test:

1. valid JSON returns the injected result and calls trace once;
2. missing image returns `400` and never calls AI;
3. body over 10 MiB returns `413`;
4. `GET /` returns HTML;
5. `GET /../server.mjs` returns `404`.

Use native `fetch` and close the server in `t.after()`.

- [ ] **Step 2: Write failing trace test**

Use a temporary directory and assert the JSONL line contains a 64-character SHA-256 `questionHash`, decoded `imageBytes`, and route but does not contain the question, image base64, or API key.

- [ ] **Step 3: Run tests and verify missing-module failures**

Run: `node --test codebase/test/http-app.test.mjs codebase/test/trace.test.mjs`

Expected: both files FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 4: Implement the boundary**

`createHttpApp({ analyze, recordTrace, publicDir })` must:

- allow only `/`, `/styles.css`, `/app.js`, `/geometry.mjs`, `/assets/ml-vs-dl.svg`, and `/assets/unreadable.svg` for static files; map `/geometry.mjs` to `codebase/src/geometry.mjs` so browser and Node tests use the same implementation;
- accept only `POST /api/analyze`;
- stop reading after 10 MiB;
- validate `question` as 1–1000 characters, `slideNumber` as integer 1–9999, `nearbyText` as at most 4000 characters, `mediaType` as `image/png`, and base64 `imageData` as non-empty;
- pass `process.env.ANTHROPIC_API_KEY` to `analyze` only on the server;
- return generic upstream errors without sending provider response bodies to the browser.

- [ ] **Step 5: Implement redacted trace append**

```js
export async function recordTrace({ file, model, input, result, now = new Date() }) {
  const entry = {
    timestamp: now.toISOString(),
    model,
    slideNumber: input.slideNumber,
    questionHash: createHash("sha256").update(input.question).digest("hex"),
    imageBytes: Buffer.byteLength(input.imageData, "base64"),
    route: result.route,
  };
  await appendFile(file, `${JSON.stringify(entry)}\n`, "utf8");
}
```

- [ ] **Step 6: Compose and start the server**

`server.mjs` imports `analyzeVisual`, `createHttpApp`, and `recordTrace`, uses `PORT || 3000`, writes traces to `codebase/traces/visual-calls.jsonl`, and prints only `Visual Context Rescue: http://localhost:<port>`.

- [ ] **Step 7: Run all tests and commit**

Run: `npm --prefix codebase test`

Expected: all tests PASS.

```bash
git add codebase/server.mjs codebase/src/http-app.mjs codebase/src/trace.mjs codebase/test/http-app.test.mjs codebase/test/trace.test.mjs codebase/traces/.gitkeep
git commit -m "feat: expose secure visual analysis endpoint"
```

---

### Task 4: Click, crop, answer, and recovery UI

**Files:**
- Create: `codebase/public/app.js`
- Modify: `codebase/public/index.html`
- Modify: `codebase/public/styles.css`
- Create: `codebase/README.md`

**Interfaces:**
- Consumes: `toPixelBounds` and `POST /api/analyze`.
- Produces: PNG crop and accessible result/recovery panel.

- [ ] **Step 1: Define the exact region/scenario data**

```js
const REGIONS = {
  left: { label: "Nhánh Machine Learning", x: 0.02, y: 0.12, width: 0.46, height: 0.82 },
  right: { label: "Nhánh Deep Learning", x: 0.52, y: 0.12, width: 0.46, height: 0.82 },
  whole: { label: "Toàn bộ sơ đồ", x: 0, y: 0, width: 1, height: 1 },
};
const SCENARIOS = {
  grounded: { src: "/assets/ml-vs-dl.svg", region: "whole", question: "Giải thích sự khác nhau trong sơ đồ này." },
  "missing-context": { src: "/assets/ml-vs-dl.svg", region: "left", question: "So sánh hai nhánh trong hình." },
  unreadable: { src: "/assets/unreadable.svg", region: "whole", question: "Đọc và giải thích toàn bộ nhãn trong hình." },
  outside: { src: "/assets/ml-vs-dl.svg", region: "whole", question: "Deadline nộp bài là ngày nào?" },
};
```

- [ ] **Step 2: Implement image-region buttons**

Create two positioned `<button>` overlays for `left` and `right`; `select-whole` selects `whole`. On scenario change, load the matching image/question and select its initial region. A selected region must have visible outline and update `selection-status`.

- [ ] **Step 3: Implement browser cropping**

`cropSelectedRegion()` waits for the image to load, calls `toPixelBounds`, draws only those source pixels to `crop-canvas`, limits the output's longest side to 1568 pixels, and returns `canvas.toDataURL("image/png").split(",")[1]`.

- [ ] **Step 4: Submit minimal context**

Send only:

```js
{
  imageData,
  mediaType: "image/png",
  question: question.value.trim(),
  slideNumber: 18,
  nearbyText: document.querySelector("#nearby-text").textContent,
}
```

Disable submit during the request. Show a concise retry message for network/server failure without exposing provider details.

- [ ] **Step 5: Render all routes**

- `VISUAL_GROUNDED`: answer plus `Dựa trên vùng hình ở slide 18`.
- `NEED_WIDER_REGION`: reason, recovery action, and a `Chọn toàn bộ hình` button.
- `NEED_BETTER_IMAGE`: reason and recovery action.
- `INSUFFICIENT`: limitation and recovery action; no answer text.

Never render model content with `innerHTML`; use `textContent`.

- [ ] **Step 6: Add setup and truthfulness documentation**

`codebase/README.md` must state:

- run with `ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npm start` from `codebase/` after setting the key in the current shell;
- optional `ANTHROPIC_MODEL`, default `claude-sonnet-4-6`;
- prototype level is **Mock**;
- configured SVG region bounds and VLearn shell are mocked;
- browser crop, central Claude Vision call, route, recovery, trace, and evaluation are real;
- no API key or selected image is persisted; trace stores only metadata/hash.

- [ ] **Step 7: Run automated and browser checks**

Run: `npm --prefix codebase test`

Then start: `ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" npm --prefix codebase start`

Open with: `powershell.exe -Command "Start-Process 'http://localhost:3000'"`

Verify with a real key:

1. keyboard can select left/right/whole and submit;
2. full diagram produces a grounded result and provenance label;
3. narrow selection produces either a wider-region recovery or a bounded answer that does not claim unseen content;
4. unreadable asset does not fabricate labels;
5. deadline question returns `INSUFFICIENT`;
6. correction by selecting the whole image succeeds;
7. mobile-width layout remains usable;
8. browser console has no errors and `traces/visual-calls.jsonl` contains no raw question/image/key.

- [ ] **Step 8: Commit**

```bash
git add codebase/public/app.js codebase/public/index.html codebase/public/styles.css codebase/README.md
git commit -m "feat: complete click-to-ask visual flow"
```

> Execution note: after completing this frontend task, invoke the available frontend verification/design skill before browser validation if the execution environment provides one.

---

### Task 5: Reproducible evidence artifacts

**Files:**
- Create: `evidence/mine_visual_failures.py`
- Create: `evidence/test_mine_visual_failures.py`
- Create: `evidence/mining-candidates.csv`
- Create: `evidence/mining-audit.csv`
- Create: `evidence/mining-method.md`
- Create: `evidence/survey-protocol.md`
- Create: `evidence/survey-log.json`

**Interfaces:**
- Consumes: organizer-only chatlog path passed as CLI argument.
- Produces: candidate IDs/markers only; never copies the full chatlog.

- [ ] **Step 1: Write a failing Python unit test**

Build a temporary four-row CSV with `student`/`tutor` pairs. Assert `mine()` matches a visual request plus refusal, rejects a text-only request, and pairs rows by `(conversation_id, turn_id)` regardless of order.

Run: `python -m unittest evidence/test_mine_visual_failures.py`

Expected: FAIL because `mine_visual_failures` does not exist.

- [ ] **Step 2: Implement the coding rule**

Use only Python stdlib. The direct-visual regex is:

```python
VISUAL = re.compile(
    r"(biểu\s*đồ|sơ đồ|hình ảnh|người trong ảnh|trong ảnh|khoanh(?: đỏ| tròn)?|bôi đỏ|nhánh màu)",
    re.I,
)
FAILURE = re.compile(
    r"(không tìm thấy|không thấy|không có thông tin|không có nội dung|không hiển thị|cung cấp thêm|mô tả thêm)",
    re.I,
)
```

Pair `student` and `tutor` rows by IDs. Output only `conversation_id`, `turn_id`, `visual_marker`, and `failure_marker` to avoid republishing messages.

- [ ] **Step 3: Run test and mining command**

```bash
python -m unittest evidence/test_mine_visual_failures.py
python evidence/mine_visual_failures.py data/vlearn-pack/chatlog/chat_history_anonymized_for_hackathon.csv evidence/mining-candidates.csv
```

Expected: tests PASS; script reports `1261 turns; 8 candidates`.

- [ ] **Step 4: Add the manual audit**

`mining-audit.csv` contains the eight candidate IDs and these decisions:

- Confirmed direct visual-access failures: `C0023/T0399`, `C0108/T0816`, `C0346/T0840`, `C0429/T0265`, `C0547/T0135`, `C0568/T0819`.
- Excluded: `C0231/T0588` because the tutor answered an OCR/how-to question; `C0254/T0850` because the selected target is text, not an image.

Include one short verbatim learner quote for each of the six confirmed examples and no full tutor response.

- [ ] **Step 5: Document evidence without overclaiming**

`mining-method.md` records:

- denominator: 1261 paired turns;
- automatic candidates: 8;
- manual confirmed cases: 6, or 0.48% of all turns;
- exact regex and command above;
- limitations: keyword rule misses implicit visual questions, six cases prove existence but not broad impact, and the chatlog lacks screenshots/retrieval traces so it cannot prove the internal technical cause.

- [ ] **Step 6: Prepare and run evidence-A survey**

Use three fixed questions in `survey-protocol.md`:

1. “Trong 30 ngày gần nhất, bạn có từng muốn hỏi AI Tutor về hình/sơ đồ/biểu đồ trên slide nhưng không chọn được vùng hình không?”
2. “Lần gần nhất, bạn đã làm gì tiếp theo và mất khoảng bao nhiêu phút?”
3. “Nếu có thể click hình để hỏi ngay, bạn có sẵn sàng thử prototype trong buổi này không?”

Store every response in `survey-log.json` as `{ respondent_id, answers: [string, string, string], confirms_pain: boolean, willing_to_test: boolean }`. Collect at least 20 people outside the team; do not mark evidence A achieved unless at least 10 confirm the pain. Preserve negative responses.

- [ ] **Step 7: Commit safe evidence artifacts**

Inspect the staged diff to ensure the source chatlog was not duplicated.

```bash
git add evidence/mine_visual_failures.py evidence/test_mine_visual_failures.py evidence/mining-candidates.csv evidence/mining-audit.csv evidence/mining-method.md evidence/survey-protocol.md evidence/survey-log.json
git commit -m "docs: add auditable visual-context evidence"
```

---

### Task 6: Twenty-case real evaluation

**Files:**
- Create: `eval/generate_fixtures.py`
- Create: `eval/fixtures/complete-flow.png`
- Create: `eval/fixtures/cropped-flow.png`
- Create: `eval/fixtures/unreadable-flow.png`
- Create: `eval/fixtures/conflicting-flow.png`
- Create: `eval/fixtures/blank.png`
- Create: `eval/golden-set.json`
- Create: `eval/run-eval.mjs`
- Create: `eval/check-results.mjs`
- Create: `eval/results/.gitkeep`

**Interfaces:**
- Consumes: Task 2 `analyzeVisual` and synthetic PNG files.
- Produces: `eval/results/run-01.json` with all 20 cases, including failures.

- [ ] **Step 1: Generate safe fixtures**

Use existing Pillow to draw five synthetic 1200×700 PNGs:

- complete flow with all labels and arrows;
- center crop without title/legend;
- 120×70 flow upscaled and Gaussian-blurred;
- visual arrows conflicting with nearby text;
- blank white visual.

Run: `python eval/generate_fixtures.py`

Expected: five PNGs exist and none contains course/person data.

- [ ] **Step 2: Create exactly 20 golden cases**

Every object in `golden-set.json` has:

```json
{
  "id": "G01",
  "class": "ordinary",
  "rarity": "common",
  "source_turn_id": "C0023/T0399",
  "image": "fixtures/complete-flow.png",
  "question": "Giải thích hai luồng trong hình.",
  "nearby_text": "So sánh Machine Learning và Deep Learning.",
  "expected_route": "VISUAL_GROUNDED",
  "allowed_facts": ["ML uses hand-crafted features", "DL learns representations through a neural network"],
  "forbidden_claims": ["deadline", "accuracy percentage"]
}
```

Use IDs `G01`–`G20`; include 10 ordinary cases, two source-of-truth cases, two ambiguity/missing-context cases, two out-of-scope cases, two domain-specific cases, and two rare cases. At least ten cases reference one of the six confirmed chatlog IDs; repeated source IDs are allowed only when the question/fixture tests a distinct scenario. Expected routes must cover all four routes.

- [ ] **Step 3: Implement the real runner**

`run-eval.mjs` takes one output path argument, reads each PNG as base64, calls `analyzeVisual`, and writes every result even when a case/API call fails:

```json
{
  "case_id": "G01",
  "expected_route": "VISUAL_GROUNDED",
  "actual": { "route": "VISUAL_GROUNDED", "answer": "Nhánh ML dùng đặc trưng được thiết kế trước; nhánh DL học biểu diễn qua mạng neural.", "reason": "Hai nhánh và các nhãn đều đọc được trong ảnh.", "recovery_action": "" },
  "route_pass": true,
  "unsupported_claims": null,
  "review_note": ""
}
```

Never stop the run on one failed case and never write the API key or image bytes.

- [ ] **Step 4: Implement result checking**

`check-results.mjs` must refuse to score if any `unsupported_claims` is `null`, then print:

```text
Route: <correct>/20 (bar: 18)
Unsupported claims: <sum> (bar: 0)
QUALITY BAR: PASS|FAIL
```

Exit `0` only when both bars pass.

- [ ] **Step 5: Run the full model evaluation**

```bash
ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" node eval/run-eval.mjs eval/results/run-01.json
```

Expected: 20 rows, including unsuccessful routes and API errors.

- [ ] **Step 6: Perform blind claim review**

One teammate who did not write the prompt compares each answer sentence with `allowed_facts` and the visible fixture. Replace `unsupported_claims: null` with an integer and record a concrete `review_note` for every non-zero value. Do not delete or rerun failed cases before preserving `run-01.json`.

- [ ] **Step 7: Check quality and commit**

Run: `node eval/check-results.mjs eval/results/run-01.json`

Expected: a complete honest PASS or FAIL report; a FAIL is retained and analyzed rather than hidden.

```bash
git add eval/generate_fixtures.py eval/fixtures eval/golden-set.json eval/run-eval.mjs eval/check-results.mjs eval/results/run-01.json
git commit -m "test: record visual tutor golden-set run"
```

---

### Task 7: Five-user validation and MVP gate

**Files:**
- Create: `validation/protocol.md`
- Create: `validation/feedback-log.json`
- Create: `validation/check-validation.mjs`
- Create: `validation/changelog.md`
- Modify: `codebase/README.md`

**Interfaces:**
- Consumes: five real moderated sessions outside the team and `eval/results/run-01.json`.
- Produces: an auditable gate deciding whether C may start.

- [ ] **Step 1: Write the fixed validation protocol**

Each participant receives these tasks without coaching:

1. click a visual region and ask what it means;
2. recover from the deliberately narrow selection;
3. identify what source the final answer used.

Ask only after task completion: “Bạn tin phần nào, chưa tin phần nào, và vì sao?” Record direct observation before opinion.

- [ ] **Step 2: Define and test the validation checker**

Each real entry uses:

```json
{
  "participant": "display name allowed by event rules",
  "role": "learner",
  "quote": "verbatim feedback",
  "understood_recovery": true,
  "completed_job": true,
  "reselections": 1,
  "source_understood": true,
  "observation": "what happened without coaching"
}
```

`check-validation.mjs` rejects fewer than five unique participants, then requires at least four `understood_recovery` and at least three entries where `completed_job` is true and `reselections <= 1`.

- [ ] **Step 3: Run five real sessions**

Use at least two willing users named during CP1. Append all five entries, including negative feedback; do not use invented names, quotes, or results.

Run: `node validation/check-validation.mjs validation/feedback-log.json`

Expected: honest PASS or FAIL with both numerator/denominator counts.

- [ ] **Step 4: Apply exactly one evidence-backed decision**

In `changelog.md`, record timestamp, observed issue, participant IDs, change made (or reason for keeping behavior), and affected file. Re-run automated tests, the relevant golden cases, and one confirmation session after changing behavior.

- [ ] **Step 5: Run the complete MVP gate**

```bash
npm --prefix codebase test
node eval/check-results.mjs eval/results/run-01.json
node validation/check-validation.mjs validation/feedback-log.json
git status --short
```

The gate passes only if:

- automated tests pass;
- the prototype was exercised in a browser with a real model call;
- evaluation is complete and honestly compared with the frozen bar;
- validation contains five real participants and an evidence-backed changelog;
- codebase README truthfully marks mocked region detection;
- no API key, raw selected image, or copied data pack is staged.

- [ ] **Step 6: Commit validation artifacts**

```bash
git add validation/protocol.md validation/feedback-log.json validation/check-validation.mjs validation/changelog.md codebase/README.md
git commit -m "docs: record user validation and MVP gate"
```

---

### Task 8: Submission spec and six-slide demo artifact

**Files:**
- Create: `spec.md`
- Create: `README.md` only if adapting the event repository into the team submission repository; otherwise update the team's submission README, not the organizer README
- Create: `demo-slides.pdf`
- Create temporarily, then remove: `demo-slides.html`

**Interfaces:**
- Consumes: evidence, prototype declaration, evaluation, validation, and changelog from Tasks 1–7.
- Produces: rubric-addressable artifacts with no invented team/user data.

- [ ] **Step 1: Create `spec.md` from the official template**

Copy the headings from `03-template-ai-spec.md` and fill them with verified project facts. Required content:

- §1: learner workflow, no-AI problem statement, mining command/counts, survey denominator/confirmation rate, and at least five short audited quotes;
- §2: a numeric impact table for at least three candidates, including rejected candidates and why B won;
- §3: compare current VLearn text selection/confidence and one multimodal document product the team actually inspected; do not claim research that was not done;
- §4: the approved one-sentence slice, at least three non-goals, prototype level Mock, configured bounds mocked, crop/vision/route real, and conditional automation due to cost of error;
- §4b: at least four concrete HAX/PAIR mappings: make clear what the system can do, show context, support efficient correction, and scope services when in doubt; each mapping names an element ID or visible control in the prototype;
- §5: at least eight named scenarios covering the four hard classes;
- §6: grounded, low-context, unreadable/failure, correction, out-of-scope, and domain-error paths;
- §7: 20-case golden set, externally checkable route/unsupported-claim definitions, frozen numeric quality bar, and full run result;
- §8: real names/assignments and at least three real willing users; never invent placeholders;
- §9: feedback-driven change from `validation/changelog.md`.

- [ ] **Step 2: Freeze the quality bar before the deadline**

Before 23:59 day 1, commit this exact bar in `spec.md`:

```text
Đạt khi route đúng ≥18/20 case, tổng unsupported factual claims = 0; trong validation ≥4/5 người hiểu bước phục hồi và ≥3/5 người hoàn thành với tối đa một lần chọn lại.
```

After that commit, update result numbers only; never change this sentence.

- [ ] **Step 3: Create six concise demo slides**

Create `demo-slides.html` with exactly six 16:9 pages:

1. observed pain and verified count;
2. current VLearn behavior versus unresolved visual job;
3. one-sentence slice and click-to-ask flow;
4. live grounded case with region provenance;
5. live failure/correction case;
6. `route accuracy / 20`, unsupported-claim count, quality-bar comparison, five-user result, and honest limitations.

Use only synthetic visual crops or short permitted excerpts. Include no API key, full chatlog, or personal data beyond event-approved names.

- [ ] **Step 4: Export to `demo-slides.pdf`**

Start the static server, then use installed Edge headless printing:

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless --disable-gpu --print-to-pdf="$(pwd)/demo-slides.pdf" "file:///$(pwd)/demo-slides.html"
```

If Edge is installed in `C:/Program Files/Microsoft/Edge`, use that executable instead. Open the PDF and verify six pages, readable percentages, and no clipped content; then remove `demo-slides.html` so only the requested PDF remains.

- [ ] **Step 5: Finalize submission README without damaging organizer materials**

In the actual team submission repo, ensure README names every member/student ID and assigns a real person to spec, evidence, prompt, code, eval, validation, and demo. If implementation is still occurring inside this organizer repo, do not overwrite its existing README; copy the required team structure into a separate submission repo first.

- [ ] **Step 6: Audit rubric coverage and commit**

Check every R1–R7 row in `04-rubric.md` against a concrete file and verify there are no bracket placeholders, invented survey responses, or hidden failed eval cases.

```bash
git add spec.md demo-slides.pdf
git commit -m "docs: finalize visual context rescue submission"
```

Do not stage the organizer README unless this is already the team's submission repository and it intentionally changed.

---

### Task 9: Conditional stretch-goal decision for C

**Files:**
- Read: `eval/results/run-01.json`
- Read: `validation/feedback-log.json`
- Read: `validation/changelog.md`
- Create only after the gate passes: `docs/superpowers/plans/YYYY-MM-DD-pdf-region-detection.md`

**Interfaces:**
- Consumes: the Task 7 gate.
- Produces: a separate reviewed plan, not speculative code mixed into B.

- [ ] **Step 1: Stop if any MVP gate item is incomplete**

If any gate item fails, spend remaining time on the failing B artifact. Do not install PDF.js and do not start C.

- [ ] **Step 2: Verify C is still the highest-value improvement**

Require at least three validation users to have observed difficulty finding/selecting a region. If feedback instead points to answer quality, recovery copy, or provenance, fix that issue rather than building detection.

- [ ] **Step 3: If both gates pass, write the separate C plan**

The C plan may add `pdfjs-dist@6.2.108` and must be limited to:

- load one user-selected PDF locally in the browser;
- render one current page to canvas;
- preserve text content using `getTextContent()`;
- inspect `getOperatorList()` only for native bitmap paint operations;
- show candidate bitmap bounds using viewport transforms;
- fall back to manual region selection for vector charts, formulas, or uncertain bounds;
- reuse Tasks 2–4 unchanged for crop, AI routing, provenance, and recovery.

It must not train a detector, add OCR, index the document, upload the full PDF, or claim perfect text/image segmentation.

- [ ] **Step 4: Request review before implementing C**

Do not implement the C plan until it has been reviewed. If time expires, demo B and declare C unbuilt rather than showing an unreliable detector.

---

## Final Verification

- [ ] `npm --prefix codebase test` passes.
- [ ] Browser golden path, three recovery/failure paths, keyboard use, mobile layout, and console are checked.
- [ ] At least one real Claude Vision call is represented by a redacted trace.
- [ ] `evidence/mining-method.md` reports 8 candidates and 6 manually confirmed direct visual failures without causal overclaiming.
- [ ] Survey evidence has 20 complete responses before claiming evidence A.
- [ ] Golden set has 20 cases and at least 10 chatlog-derived cases.
- [ ] Every eval case remains in the result file; unsupported-claim review is complete.
- [ ] Five real validation entries and one feedback-driven decision exist.
- [ ] `git diff --check` passes and no secret or copied private data is staged.
- [ ] C has no code unless both the MVP and user-value gates pass.
