import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAiText, getAiHealth, requestAi, resolveAiProvider } from "./src/ai-provider.mjs";
import { buildFallbackLessonSummary, generateLessonSummary } from "./src/lesson-summary.mjs";
import { analyzeVisual } from "./src/visual-analysis.mjs";
import { registerVisualRoute, visualErrorHandler } from "./src/visual-route.mjs";
import { recordTrace } from "./src/trace.mjs";
import { buildTutorPrompt } from "./src/tutor-grounding.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const provider = resolveAiProvider();

app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));
app.use("/vendor", express.static(path.join(__dirname, "node_modules/pdfjs-dist/build"), {
  immutable: true,
  maxAge: "7d",
}));
app.get("/vendor/html2canvas.esm.js", (_request, response) => {
  response.sendFile(path.join(__dirname, "node_modules/html2canvas/dist/html2canvas.esm.js"));
});
app.get("/geometry.mjs", (_request, response) => {
  response.sendFile(path.join(__dirname, "src/geometry.mjs"));
});
app.get("/favicon.ico", (_request, response) => response.sendStatus(204));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_request, response) => {
  const health = getAiHealth(provider);
  response.json({
    ok: true,
    aiConfigured: health.configured,
    provider: health.provider,
    model: health.configured ? health.model : null,
  });
});

registerVisualRoute(app, {
  analyze: analyzeVisual,
  recordTrace,
  provider,
  traceFile: path.join(__dirname, "traces/visual-calls.jsonl"),
});

app.post("/api/tutor", async (request, response) => {
  const question = cleanText(request.body?.question, 2_000);
  const documentName = cleanText(request.body?.documentName, 200) || "Tài liệu";
  const currentPage = clampNumber(request.body?.currentPage, 1, 10_000, 1);
  const selectedText = cleanText(request.body?.selectedText, 4_000);
  const selectedPage = clampNumber(request.body?.selectedPage, 1, 10_000, currentPage);
  const contextPages = Array.isArray(request.body?.contextPages)
    ? request.body.contextPages.slice(0, 5).map((item) => ({
        page: clampNumber(item?.page, 1, 10_000, currentPage),
        text: cleanText(item?.text, 10_000),
      })).filter((item) => item.text)
    : [];

  if (!question) {
    return response.status(400).json({ error: "Câu hỏi không được để trống." });
  }

  const citationByPage = new Map();
  if (selectedText) citationByPage.set(selectedPage, compactExcerpt(selectedText));
  contextPages.forEach((item) => {
    if (!citationByPage.has(item.page)) citationByPage.set(item.page, compactExcerpt(item.text));
  });
  const citations = [...citationByPage].map(([page, excerpt]) => ({ page, excerpt }));

  if (!provider.configured) {
    return response.json({
      mode: "demo",
      answer: buildDemoAnswer({ question, contextPages, currentPage, documentName, selectedText, selectedPage }),
      citations,
      confidence: contextPages.length || selectedText ? 78 : 48,
    });
  }

  const { instructions, input } = buildTutorPrompt({
    documentName,
    currentPage,
    contextPages,
    question,
    selectedText,
    selectedPage,
  });
  const body = provider.protocol === "responses"
    ? { model: provider.model, reasoning: { effort: "low" }, instructions, input }
    : provider.protocol === "gemini"
      ? {
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: "user", parts: [{ text: input }] }],
        }
      : {
          model: provider.model,
          messages: [
            { role: "system", content: instructions },
            { role: "user", content: input },
          ],
          stream: false,
        };

  try {
    const payload = await requestAi(provider, body);
    const answer = extractAiText(payload, provider.protocol);
    response.json({
      mode: "live",
      answer,
      citations,
      confidence: estimateConfidence(answer, contextPages, selectedText),
    });
  } catch (error) {
    console.error("Tutor request failed:", error.message);
    response.status(502).json({
      error: "Tutor chưa thể kết nối mô hình AI.",
      fallback: buildDemoAnswer({ question, contextPages, currentPage, documentName, selectedText, selectedPage }),
      citations,
    });
  }
});

app.post("/api/summary", async (request, response) => {
  const documentName = cleanText(request.body?.documentName, 200) || "Tài liệu";
  const pages = Array.isArray(request.body?.pages)
    ? request.body.pages.slice(0, 80).map((item, index) => ({
        page: clampNumber(item?.page, 1, 10_000, index + 1),
        text: cleanText(item?.text, 5_000),
      })).filter((item) => item.text)
    : [];
  if (!pages.length) return response.status(400).json({ error: "Không có văn bản để tóm tắt." });

  try {
    const result = await generateLessonSummary({ documentName, pages }, { provider });
    if (!result.key_points.length) result.key_points = buildFallbackLessonSummary(pages).key_points;
    return response.json({ ...result, mode: provider.configured ? "live" : "fallback" });
  } catch (error) {
    console.error("Lesson summary failed:", error.message);
    return response.json({ ...buildFallbackLessonSummary(pages), mode: "fallback" });
  }
});

app.get("*splat", (_request, response) => {
  response.sendFile(path.join(__dirname, "public/index.html"));
});

app.use(visualErrorHandler);

app.listen(port, () => {
  console.log(`VLearn prototype: http://localhost:${port}`);
  console.log(provider.configured
    ? `Tutor: live (${provider.name}/${provider.model})`
    : `Tutor: demo mode (${provider.name} is not configured)`);
});

function cleanText(value, maxLength) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maxLength)
    : "";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}

function compactExcerpt(text) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 150 ? `${oneLine.slice(0, 147)}…` : oneLine;
}

function estimateConfidence(answer, contextPages, selectedText = "") {
  if (!contextPages.length && !selectedText) return 45;
  const cites = (answer.match(/\[Trang\s+\d+\]/gi) || []).length;
  return Math.min(95, 76 + Math.min(15, cites * 5));
}

function buildDemoAnswer({ question, contextPages, currentPage, documentName, selectedText = "", selectedPage = currentPage }) {
  if (!contextPages.length && !selectedText) {
    return `Mình chưa lấy được phần văn bản có thể tìm kiếm từ “${documentName}”. Bạn có thể thử hỏi về nội dung đang nhìn thấy ở trang ${currentPage}, hoặc tải một PDF có lớp văn bản.`;
  }

  const primary = selectedText
    ? { page: selectedPage, text: selectedText }
    : contextPages[0];
  const excerpt = compactExcerpt(primary.text);
  const normalizedQuestion = question.toLocaleLowerCase("vi");
  const intent = normalizedQuestion.includes("tóm tắt")
    ? "Tóm tắt phần liên quan"
    : normalizedQuestion.includes("ví dụ")
      ? "Cách hiểu kèm ví dụ"
      : "Phần tài liệu liên quan";

  return `${intent}: ${excerpt} [Trang ${primary.page}]\n\nĐây là phản hồi demo được tạo trực tiếp từ nội dung PDF. Khi cấu hình provider AI đã chọn, Tutor sẽ diễn giải sâu hơn và tổng hợp giữa nhiều trang.`;
}
