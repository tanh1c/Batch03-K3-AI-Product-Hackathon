import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const serverSource = await readFile(new URL("../server.mjs", import.meta.url), "utf8");

function section(start, end) {
  const source = appSource.slice(appSource.indexOf(start), appSource.indexOf(end));
  assert.ok(source, `missing ${start}`);
  return source;
}

test("provides an accessible explicit summary prompt", () => {
  assert.match(htmlSource, /id="lessonSummaryPrompt"[^>]*aria-live="polite"[^>]*hidden/);
  assert.match(htmlSource, /data-summary-action="accept"/);
  assert.match(htmlSource, /data-summary-action="dismiss"/);
  assert.match(htmlSource, /văn bản[^<]*không gửi toàn bộ pixel/i);
});

test("detects PDF completion locally without starting a request", () => {
  const source = section("function maybeShowLessonSummaryPrompt", "function dismissLessonSummaryPrompt");
  assert.match(source, /state\.document\.type !== "pdf"/);
  assert.match(source, /scrollTop \+ elements\.readerScroll\.clientHeight/);
  assert.match(source, /scrollHeight - 90/);
  assert.doesNotMatch(source, /fetch\(|sendQuestion|\/api\//);
});

test("dismisses only transient summary state without a request", () => {
  const source = section("function dismissLessonSummaryPrompt", "async function requestLessonSummary");
  assert.match(source, /summaryDismissed/);
  assert.doesNotMatch(source, /fetch\(|persistState/);
});

test("accepts once through the dedicated summary endpoint", () => {
  const source = section("async function requestLessonSummary", "async function applyLessonSummaryHighlights");
  assert.match(source, /state\.summaryLoading \|\| state\.summaryAccepted/);
  assert.match(source, /fetch\("\/api\/summary"/);
  assert.match(source, /state\.pageTexts\.slice\(0, 80\)/);
  assert.match(source, /text\.slice\(0, 5000\)/);
  assert.doesNotMatch(source, /sendQuestion|\/api\/analyze|\/api\/tutor/);
});

test("keeps AI highlights transient and replaces them independently", () => {
  const source = section("async function applyLessonSummaryHighlights", "function getAiHighlights");
  assert.match(source, /state\.aiHighlights = \{\}/);
  assert.match(source, /findExactQuoteRects/);
  assert.match(source, /drawAnnotations/);
  assert.doesNotMatch(source, /getAnnotations\([^)]*\)\.push|persistState/);

  const persistence = section("function persistState", "function normalizeWords");
  assert.doesNotMatch(persistence, /summary|aiHighlights|pageTexts|selectionText|chat|quote/);
});

test("grounds selected text without changing whole-slide precedence", () => {
  const send = section("async function sendQuestion", "async function sendTextQuestion");
  assert.match(send, /const selectedText = state\.selectionText/);
  assert.match(send, /const selectedPage = state\.selectionPage/);
  assert.ok(send.indexOf("pdfSelection") < send.indexOf("sendPdfWholeSlideQuestion"));
  assert.ok(send.indexOf("visualSelection") < send.indexOf("sendPdfWholeSlideQuestion"));
  assert.match(send, /else await sendTextQuestion\(question, selectedText, selectedPage\)/);

  const text = section("async function sendTextQuestion", "async function sendPdfWholeSlideQuestion");
  assert.match(text, /selectedText/);
  assert.match(text, /selectedPage/);
  assert.match(text, /fetch\("\/api\/tutor"/);
});

test("adds summary and selected-text routes without modifying visual registration", () => {
  assert.match(serverSource, /import \{[^}]*generateLessonSummary[^}]*\} from "\.\/src\/lesson-summary\.mjs"/s);
  assert.match(serverSource, /import \{ buildTutorPrompt \} from "\.\/src\/tutor-grounding\.mjs"/);
  assert.match(serverSource, /app\.post\("\/api\/summary"/);
  assert.match(serverSource, /if \(!result\.key_points\.length\) \{\s*return response\.json\(\{ \.\.\.buildFallbackLessonSummary\(pages\), mode: "fallback" \}\);/s);
  assert.match(serverSource, /selectedText/);
  assert.match(serverSource, /selectedPage/);
  assert.match(serverSource, /registerVisualRoute\(app/);
});
