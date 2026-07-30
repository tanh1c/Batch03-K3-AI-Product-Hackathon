import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolveAiProvider } from "../codebase/src/ai-provider.mjs";
import { analyzeVisual } from "../codebase/src/visual-analysis.mjs";

const base = new URL("./", import.meta.url);
const golden = JSON.parse(await readFile(new URL("golden-set.json", base), "utf8"));
const provider = resolveAiProvider();
if (!provider.configured) throw new Error(`Provider ${provider.name} chưa được cấu hình`);

const results = [];
for (const testCase of golden.cases) {
  const imageData = (await readFile(new URL(`fixtures/${testCase.fixture}`, base))).toString("base64");
  const startedAt = Date.now();
  try {
    const output = await analyzeVisual({
      imageData,
      mediaType: "image/png",
      question: testCase.question,
      slideNumber: 2,
      nearbyText: testCase.nearbyText,
    }, { provider });
    const routeCorrect = output.route === testCase.expectedRoute;
    const text = `${output.answer} ${output.reason} ${output.recovery_action}`.toLocaleLowerCase("vi");
    const contentGrounded = !testCase.requiredAny?.length || testCase.requiredAny.some((term) => text.includes(term));
    const vietnamese = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu.test(text)
      || /\b(vùng|hình|sơ đồ|dữ liệu|không|cần|nhánh|được|trả lời)\b/iu.test(text);
    const passed = routeCorrect && contentGrounded && vietnamese;
    results.push({
      id: testCase.id,
      source: testCase.source,
      cohort: testCase.cohort,
      riskClass: testCase.riskClass,
      expectedRoute: testCase.expectedRoute,
      actualRoute: output.route,
      routeCorrect,
      contentGrounded,
      vietnamese,
      passed,
      durationMs: Date.now() - startedAt,
      output,
    });
  } catch (error) {
    results.push({
      id: testCase.id,
      source: testCase.source,
      cohort: testCase.cohort,
      riskClass: testCase.riskClass,
      expectedRoute: testCase.expectedRoute,
      actualRoute: "ERROR",
      routeCorrect: false,
      contentGrounded: false,
      vietnamese: false,
      passed: false,
      durationMs: Date.now() - startedAt,
      error: error.message,
    });
  }
  console.log(`${results.at(-1).passed ? "PASS" : "FAIL"} ${testCase.id}: ${results.at(-1).actualRoute}`);
}

const passed = results.filter((result) => result.passed).length;
const unsupportedGrounded = results.filter((result) => result.expectedRoute !== "VISUAL_GROUNDED" && result.actualRoute === "VISUAL_GROUNDED").length;
const report = {
  timestamp: new Date().toISOString(),
  provider: provider.name,
  model: provider.model,
  total: results.length,
  passed,
  passRate: Number((passed / results.length * 100).toFixed(1)),
  qualityBar: golden.qualityBar,
  unsupportedGrounded,
  meetsQualityBar: passed / results.length * 100 >= golden.qualityBar.minimumPassRate && unsupportedGrounded === 0,
  results,
};
await writeFile(new URL("run-01-results.json", base), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(new URL("real-call-trace.json", base), `${JSON.stringify({
  timestamp: report.timestamp,
  provider: provider.name,
  model: provider.model,
  runId: createHash("sha256").update(`${report.timestamp}:${results.length}`).digest("hex").slice(0, 16),
  caseCount: results.length,
  questionSetHash: createHash("sha256").update(golden.cases.map((item) => item.question).join("\n")).digest("hex"),
  imageBytes: await sumFixtureBytes(golden.cases),
  routes: Object.fromEntries([...new Set(results.map((item) => item.actualRoute))].map((route) => [route, results.filter((item) => item.actualRoute === route).length])),
}, null, 2)}\n`);
console.log(`\n${passed}/${results.length} (${report.passRate}%) · hard failures: ${unsupportedGrounded} · bar: ${report.meetsQualityBar ? "MET" : "NOT MET"}`);

async function sumFixtureBytes(cases) {
  let total = 0;
  for (const testCase of cases) total += (await readFile(new URL(`fixtures/${testCase.fixture}`, base))).byteLength;
  return total;
}
