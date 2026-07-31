import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { open, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { resolveAiProvider } from "../codebase/src/ai-provider.mjs";
import { analyzeVisual } from "../codebase/src/visual-analysis.mjs";

const ROUTES = new Set([
  "VISUAL_GROUNDED",
  "NEED_WIDER_REGION",
  "NEED_BETTER_IMAGE",
  "INSUFFICIENT",
]);
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const args = parseArgs(process.argv.slice(2));
const setUrl = pathToFileURL(resolve(args.set));
const setBytes = await readFile(setUrl);
const golden = JSON.parse(setBytes);
const fixturesUrl = new URL("fixtures/", setUrl);

await validateSet(golden, fixturesUrl);
console.log(`Validation passed: ${golden.setId ?? "direction-b-v1"} (${golden.cases.length} cases)`);

if (args.mode === "validate") process.exit(0);

const outputFiles = await reserveOutputs(args.results, args.trace);
let outputsPublished = false;
try {
const provider = resolveAiProvider();
if (!provider.configured) throw new Error(`Provider ${provider.name} chưa được cấu hình`);

const results = [];
for (const testCase of golden.cases) {
  const imageData = (await readFile(new URL(testCase.fixture, fixturesUrl))).toString("base64");
  const startedAt = Date.now();
  try {
    const output = await analyzeVisual({
      imageData,
      mediaType: "image/png",
      question: testCase.question,
      slideNumber: testCase.page ?? 2,
      nearbyText: testCase.boundedText ?? testCase.nearbyText ?? "",
      ...(testCase.selection && {
        needsOcr: testCase.needsOcr,
        selectionSource: testCase.selection.source,
        selectedAreaRatio: testCase.selection.bounds.width * testCase.selection.bounds.height,
        hasTextLayer: !testCase.needsOcr,
      }),
    }, { provider });
    const routeCorrect = output.route === testCase.expectedRoute;
    const text = `${output.answer} ${output.reason} ${output.recovery_action}`.toLocaleLowerCase("vi");
    const requiredFacts = testCase.requiredVisibleFacts ?? testCase.requiredAny ?? [];
    const contentGrounded = !requiredFacts.length || requiredFacts.some((term) => text.includes(term));
    const vietnamese = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu.test(text)
      || /\b(vùng|hình|sơ đồ|dữ liệu|không|cần|nhánh|được|trả lời)\b/iu.test(text);
    results.push({
      id: testCase.id,
      category: testCase.category,
      cohort: testCase.cohort,
      expectedRoute: testCase.expectedRoute,
      actualRoute: output.route,
      routeCorrect,
      contentGrounded,
      vietnamese,
      passed: routeCorrect && contentGrounded && vietnamese,
      durationMs: Date.now() - startedAt,
      output,
    });
  } catch (error) {
    results.push({
      id: testCase.id,
      category: testCase.category,
      cohort: testCase.cohort,
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
const passRate = Number((passed / results.length * 100).toFixed(1));
const automatedGateCandidate = golden.qualityBar.minimumPassed == null
  ? passRate >= golden.qualityBar.minimumPassRate && unsupportedGrounded === 0
  : passed >= golden.qualityBar.minimumPassed && unsupportedGrounded <= golden.qualityBar.maximumUnsupportedGrounded;
const timestamp = new Date().toISOString();
const setSha256 = createHash("sha256").update(setBytes).digest("hex");
const implementationCommit = await currentCommit();
const report = {
  timestamp,
  setId: golden.setId ?? "direction-b-v1",
  setVersion: golden.version,
  setSha256,
  implementationCommit,
  provider: provider.name,
  model: provider.model,
  total: results.length,
  passed,
  passRate,
  qualityBar: golden.qualityBar,
  unsupportedGrounded,
  automatedGateCandidate,
  manualGroundingReviewRequired: true,
  providerGateMet: null,
  ...(golden.setId && { fullDirectionCGate: "requires-browser-and-manual-review" }),
  results,
};
const trace = {
  timestamp,
  setId: report.setId,
  setVersion: report.setVersion,
  setSha256,
  implementationCommit,
  provider: provider.name,
  model: provider.model,
  runId: createHash("sha256").update(`${timestamp}:${setSha256}:${results.length}`).digest("hex").slice(0, 16),
  caseCount: results.length,
  imageBytes: await sumFixtureBytes(golden.cases, fixturesUrl),
  routes: Object.fromEntries([...new Set(results.map((item) => item.actualRoute))].map((route) => [route, results.filter((item) => item.actualRoute === route).length])),
};
await Promise.all([outputFiles.results.writeFile(`${JSON.stringify(report, null, 2)}\n`), outputFiles.trace.writeFile(`${JSON.stringify(trace, null, 2)}\n`)]);
outputsPublished = true;
console.log(`\n${passed}/${results.length} (${passRate}%) · unsupported grounded: ${unsupportedGrounded} · automated candidate: ${automatedGateCandidate ? "MET" : "NOT MET"} · manual grounding review required`);
} finally {
  await Promise.allSettled([outputFiles.results.close(), outputFiles.trace.close()]);
  if (!outputsPublished) await Promise.all(outputFiles.paths.map((path) => rm(path, { force: true })));
}

async function reserveOutputs(resultsPath, tracePath) {
  const paths = [resolve(resultsPath), resolve(tracePath)];
  const handles = [];
  try {
    for (const path of paths) handles.push(await open(path, "wx"));
    return { results: handles[0], trace: handles[1], paths };
  } catch (error) {
    await Promise.allSettled(handles.map((handle) => handle.close()));
    await Promise.all(paths.slice(0, handles.length).map((path) => rm(path, { force: true })));
    throw error;
  }
}

function parseArgs(argv) {
  const mode = argv.includes("--validate") ? "validate" : argv.includes("--run") ? "run" : null;
  if (!mode || (argv.includes("--validate") && argv.includes("--run"))) throw new Error("Dùng đúng một mode: --validate hoặc --run");
  const valueAfter = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : null;
  };
  const set = valueAfter("--set");
  if (!set) throw new Error("Thiếu --set <path>");
  const results = valueAfter("--results");
  const trace = valueAfter("--trace");
  if (mode === "run" && (!results || !trace)) throw new Error("--run yêu cầu --results <new-path> và --trace <new-path>");
  return { mode, set, results, trace };
}

async function validateSet(set, fixtureBase) {
  if (!Number.isInteger(set.version) || !Array.isArray(set.cases) || !set.cases.length) throw new Error("Evaluation set không hợp lệ");
  const ids = new Set();
  for (const testCase of set.cases) {
    if (!testCase.id || ids.has(testCase.id)) throw new Error(`Case ID trùng hoặc thiếu: ${testCase.id ?? "unknown"}`);
    ids.add(testCase.id);
    if (!testCase.fixture || !testCase.question?.trim() || !ROUTES.has(testCase.expectedRoute)) throw new Error(`Case ${testCase.id} thiếu trường bắt buộc`);
    const fixture = await readFile(new URL(testCase.fixture, fixtureBase));
    if (!PNG_SIGNATURE.every((byte, index) => fixture[index] === byte)) throw new Error(`Fixture ${testCase.fixture} không phải PNG`);
    const expectedHash = set.fixtures?.[testCase.fixture];
    if (expectedHash && createHash("sha256").update(fixture).digest("hex") !== expectedHash) throw new Error(`Fixture ${testCase.fixture} sai SHA-256`);
  }
  if (set.setId === "direction-c-v1") {
    if (set.cases.length !== 12 || set.qualityBar?.totalCases !== 12) throw new Error("Direction C v1 phải có đúng 12 case");
    for (const testCase of set.cases) {
      const bounds = testCase.selection?.bounds;
      if (!bounds || testCase.selection.pageNumber !== testCase.page || testCase.needsOcr !== !testCase.boundedText.trim()) throw new Error(`Case ${testCase.id} có C0/C2 metadata không hợp lệ`);
      if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
        || bounds.x < 0 || bounds.y < 0 || bounds.width <= 0 || bounds.height <= 0
        || bounds.x + bounds.width > 1 || bounds.y + bounds.height > 1 || bounds.width * bounds.height >= 0.9) {
        throw new Error(`Case ${testCase.id} có bounds không hợp lệ`);
      }
    }
  }
}

async function sumFixtureBytes(cases, fixtureBase) {
  let total = 0;
  for (const testCase of cases) total += (await readFile(new URL(testCase.fixture, fixtureBase))).byteLength;
  return total;
}

async function currentCommit() {
  try {
    const { stdout } = await promisify(execFile)("git", ["rev-parse", "HEAD"]);
    return stdout.trim();
  } catch {
    return null;
  }
}
