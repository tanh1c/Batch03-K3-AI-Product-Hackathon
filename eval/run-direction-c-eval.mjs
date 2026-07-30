import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { resolveAiProvider } from "../codebase/src/ai-provider.mjs";
import { createSelection } from "../codebase/src/selection-geometry.mjs";
import { analyzeVisual } from "../codebase/src/visual-analysis.mjs";
import { buildVisualRequest } from "../codebase/src/visual-request.mjs";

const base = new URL("./", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("direction-c-golden-set.json", base), "utf8"));
const provider = resolveAiProvider();
if (!provider.configured) throw new Error(`Provider ${provider.name} chưa được cấu hình`);

const results = [];
for (const testCase of manifest.cases) {
  const imageBuffer = await readFile(new URL(`fixtures/${testCase.fixture}`, base));
  const selection = createSelection({
    pageNumber: testCase.pageNumber,
    ...testCase.selection,
  });
  const request = buildVisualRequest({
    selection,
    context: {
      imageData: imageBuffer.toString("base64"),
      mediaType: "image/png",
      text: testCase.nearbyText,
      needsOcr: testCase.selection.needsOcr,
    },
    question: testCase.question,
  });
  const startedAt = Date.now();
  try {
    const output = await analyzeVisual(request, { provider });
    const routeCorrect = output.route === testCase.expectedRoute;
    const combined = `${output.answer} ${output.reason} ${output.recovery_action}`.toLocaleLowerCase("vi");
    const contentGrounded = !testCase.requiredAny.length
      || testCase.requiredAny.some((term) => combined.includes(term));
    const correctPage = request.slideNumber === testCase.pageNumber;
    const fallbackRetained = testCase.cohort !== "detectorFallback"
      || ["snip", "circle"].includes(testCase.manualFallback);
    results.push({
      id: testCase.id,
      cohort: testCase.cohort,
      expectedRoute: testCase.expectedRoute,
      actualRoute: output.route,
      routeCorrect,
      contentGrounded,
      correctPage,
      fallbackRetained,
      passed: routeCorrect && contentGrounded && correctPage && fallbackRetained,
      durationMs: Date.now() - startedAt,
      output,
    });
  } catch (error) {
    results.push({
      id: testCase.id,
      cohort: testCase.cohort,
      expectedRoute: testCase.expectedRoute,
      actualRoute: "ERROR",
      routeCorrect: false,
      contentGrounded: false,
      correctPage: request.slideNumber === testCase.pageNumber,
      fallbackRetained: testCase.cohort !== "detectorFallback"
        || ["snip", "circle"].includes(testCase.manualFallback),
      passed: false,
      durationMs: Date.now() - startedAt,
      error: error.message,
    });
  }
  const latest = results.at(-1);
  console.log(`${latest.passed ? "PASS" : "FAIL"} ${latest.id}: ${latest.actualRoute}`);
}

const passed = results.filter((item) => item.passed).length;
const unsupportedGrounded = results.filter(
  (item) => item.expectedRoute !== "VISUAL_GROUNDED" && item.actualRoute === "VISUAL_GROUNDED",
).length;
const wrongPageCrops = results.filter((item) => !item.correctPage).length;
const report = {
  timestamp: new Date().toISOString(),
  provider: provider.name,
  model: provider.model,
  total: results.length,
  passed,
  unsupportedGrounded,
  wrongPageCrops,
  qualityBar: manifest.qualityBar,
  meetsQualityBar: passed >= manifest.qualityBar.minimumPassCount
    && unsupportedGrounded <= manifest.qualityBar.maximumUnsupportedGrounded
    && wrongPageCrops <= manifest.qualityBar.maximumWrongPageCrops,
  results,
};
await writeFile(
  new URL("direction-c-run-results.json", base),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(
  new URL("direction-c-real-call-trace.json", base),
  `${JSON.stringify({
    timestamp: report.timestamp,
    provider: report.provider,
    model: report.model,
    runId: createHash("sha256")
      .update(`${report.timestamp}:${report.total}`)
      .digest("hex")
      .slice(0, 16),
    caseCount: report.total,
    questionSetHash: createHash("sha256")
      .update(manifest.cases.map((item) => item.question).join("\n"))
      .digest("hex"),
    imageBytes: await sumFixtureBytes(manifest.cases),
    routes: Object.fromEntries(
      [...new Set(results.map((item) => item.actualRoute))]
        .map((route) => [route, results.filter((item) => item.actualRoute === route).length]),
    ),
  }, null, 2)}\n`,
);

console.log(
  `\n${passed}/${report.total} · unsupported grounded: ${unsupportedGrounded}`
  + ` · wrong page: ${wrongPageCrops} · bar: ${report.meetsQualityBar ? "MET" : "NOT MET"}`,
);

async function sumFixtureBytes(cases) {
  let total = 0;
  for (const testCase of cases) {
    total += (await readFile(new URL(`fixtures/${testCase.fixture}`, base))).byteLength;
  }
  return total;
}
