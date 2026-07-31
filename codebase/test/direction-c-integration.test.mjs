import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../public/styles.css", import.meta.url), "utf8");

function section(start, end) {
  return appSource.slice(appSource.indexOf(start), appSource.indexOf(end));
}

test("composes the existing C2-C7 browser modules", () => {
  assert.match(appSource, /import \{ extractPdfContext \} from "\/pdf-context\.mjs"/);
  assert.match(appSource, /import \{ detectPageRegions \} from "\/pdf-regions\.mjs"/);
  assert.match(appSource, /import \{ createSelectionOverlay \} from "\/selection-overlay\.mjs"/);
  assert.match(appSource, /import \{ buildVisualRequest, formatSelectionProvenance \} from "\/visual-request\.mjs"/);
});

test("provides an explicit accessible region-suggestion toggle", () => {
  assert.match(htmlSource, /href="\/selection-overlay\.css"/);
  assert.match(
    htmlSource,
    /<button[^>]*id="regionSuggestionsButton"[^>]*aria-pressed="false"[^>]*>[\s\S]*Gợi ý vùng[\s\S]*<\/button>/,
  );
});

test("keeps selection and local detection isolated from AI calls", () => {
  for (const [start, end] of [
    ["function setupAnnotationLayer", "function resizeAnnotationCanvas"],
    ["function handleRegionAction", "function wireVisualInteractions"],
    ["function selectDetectedCandidate", "function setPdfSelection"],
    ["async function ensurePdfPageRegions", "function selectDetectedCandidate"],
  ]) {
    const source = section(start, end);
    assert.ok(source, `missing ${start}`);
    assert.doesNotMatch(source, /fetch\(|extractPdfContext|\/api\/analyze/);
  }
});

test("lets learners remove the active visual context from the composer", () => {
  assert.match(
    htmlSource,
    /<button[^>]*id="clearComposerContext"[^>]*aria-label="Bỏ vùng đã chọn"[^>]*hidden[^>]*>/,
  );
  const clearSelection = section("function clearComposerSelection", "function invalidatePdfWork");
  assert.match(clearSelection, /clearPdfSelection\(\)/);
  assert.match(clearSelection, /clearVisualSelection\(\)/);
  assert.match(clearSelection, /chatInput\.value = ""/);
  assert.match(clearSelection, /autoGrowComposer\(\)/);
  assert.match(appSource, /clearComposerContext\.addEventListener\("click", clearComposerSelection\)/);
  assert.match(cssSource, /\.composer-context button\[hidden\]\s*\{[^}]*display:\s*none/s);
});

test("maps vectors to the existing detected-image source", () => {
  const source = section("function selectDetectedCandidate", "function setPdfSelection");
  assert.match(source, /candidate\.kind === "text"\s*\? "detected-text"\s*:\s*"detected-image"/);
  assert.doesNotMatch(source, /detected-vector/);
});

test("submits uploaded PDF selections through C2 and C7 only on form submit", () => {
  const sendQuestion = section("async function sendQuestion", "async function sendTextQuestion");
  assert.match(sendQuestion, /pdfSelection/);
  assert.match(sendQuestion, /sendPdfVisualQuestion\(question, pdfSelection\)/);
  assert.match(sendQuestion, /sendVisualQuestion\(question, visualSelection\)/);

  const pdfSender = section("async function sendPdfVisualQuestion", "async function sendVisualQuestion");
  assert.match(pdfSender, /await extractPdfContext\(/);
  assert.match(pdfSender, /buildVisualRequest\(\{ selection, context, question \}\)/);
  assert.match(pdfSender, /fetch\("\/api\/analyze"/);
  assert.doesNotMatch(pdfSender, /\/api\/tutor|annotation-canvas|pageTexts/);

  const legacySender = section("async function sendVisualQuestion", "function selectContextPages");
  assert.match(legacySender, /cropSelectedRegion\(selection\)/);
  assert.doesNotMatch(legacySender, /buildVisualRequest|selectionSource|needsOcr/);
});

test("reuses an in-flight PDF render until canvas and text are ready", () => {
  const renderPage = section("function renderPdfPage", "async function renderPdfTextLayer");
  assert.ok(
    renderPage.indexOf("pageState.renderPromise") < renderPage.indexOf("pageState.renderedZoom === state.zoom"),
    "in-flight render must win over the rendered zoom fast path",
  );
  assert.match(renderPage, /await renderPdfTextLayer\(/);
});

test("invalidates stale PDF work on document and zoom changes", () => {
  const invalidation = section("function invalidatePdfWork", "function setMode");
  assert.match(invalidation, /pdfWorkEpoch \+= 1/);
  assert.match(invalidation, /pdfExtractionController\?\.abort\(\)/);
  assert.match(invalidation, /overlay\?\.destroy\(\)/);

  assert.match(section("async function activateDocument", "function renderDemoDocument"), /invalidatePdfWork\(/);
  assert.match(section("async function loadPdf", "function setupLazyPdfRendering"), /invalidatePdfWork\(/);
  assert.match(section("function rebuildPdfShells", "function scrollToPage"), /invalidatePdfWork\(/);
});

test("prevents an older concurrent PDF load from replacing the latest document", () => {
  const loadPdf = section("async function loadPdf", "function setupLazyPdfRendering");
  assert.match(loadPdf, /const epoch = state\.pdfWorkEpoch/);
  assert.ok(
    [...loadPdf.matchAll(/epoch !== state\.pdfWorkEpoch/g)].length >= 4,
    "load must recheck ownership across file, document, page, and text awaits",
  );
  assert.match(loadPdf, /if \(epoch === state\.pdfWorkEpoch\) showLoading\(false\)/);
});

test("uses manual Snip recovery for Direction C without whole-page upload", () => {
  const evidence = section("function renderVisualEvidence", "function visualRouteLabel");
  assert.match(evidence, /data-pdf-visual-recovery/);
  assert.match(evidence, /Chọn lại bằng Snip/);
  assert.match(appSource, /function recoverPdfSelectionWithSnip/);
  assert.doesNotMatch(section("function recoverPdfSelectionWithSnip", "function showTyping"), /fetch\(|selectVisualRegion\("whole"/);
});

test("does not persist raw Direction C selection or request data", () => {
  const persistence = section("function persistState", "function normalizeWords");
  assert.doesNotMatch(
    persistence,
    /pdfSelection|visualSelection|imageData|nearbyText|\bquestion\b|\bchat\b|candidates/,
  );
});
