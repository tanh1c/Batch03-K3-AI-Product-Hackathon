import { extractAiText, requestAi } from "./ai-provider.mjs";

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", minLength: 1 },
    key_points: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1 },
          quote: { type: "string", minLength: 1 },
          explanation: { type: "string", minLength: 1 },
        },
        required: ["page", "quote", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "key_points"],
  additionalProperties: false,
};

function clean(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function buildPrompt(documentName, pages) {
  const source = pages.map((item) => `[Trang ${item.page}]\n${item.text}`).join("\n\n");
  return [
    "Bạn là VLearn Tutor và chỉ được dùng nội dung tài liệu bên dưới.",
    "Viết một bản tóm tắt bài học bằng tiếng Việt, rõ ràng và dễ ôn tập.",
    "Chọn từ 3 đến 8 điểm cần ghi nhớ. Mỗi quote phải là một đoạn NGUYÊN VĂN liên tục, ngắn, xuất hiện chính xác trong trang tương ứng để giao diện có thể bôi đen.",
    "Không tự tạo kiến thức, không sửa chữ trong quote và không dùng dấu ba chấm trong quote.",
    `Tài liệu: ${documentName}`,
    source || "Không có văn bản có thể trích xuất.",
  ].join("\n\n");
}

export function buildLessonSummaryBody({ documentName, pages }, provider) {
  const prompt = buildPrompt(documentName, pages);
  if (provider.protocol === "responses") {
    return {
      model: provider.model,
      reasoning: { effort: "low" },
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      text: { format: { type: "json_schema", name: "lesson_summary", strict: true, schema: SUMMARY_SCHEMA } },
    };
  }
  if (provider.protocol === "gemini") {
    return {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING" },
            key_points: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  page: { type: "INTEGER" },
                  quote: { type: "STRING" },
                  explanation: { type: "STRING" },
                },
                required: ["page", "quote", "explanation"],
              },
            },
          },
          required: ["summary", "key_points"],
        },
      },
    };
  }
  return {
    model: provider.model,
    messages: [
      { role: "system", content: "Chỉ trả về JSON đúng schema, không thêm markdown." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_schema", json_schema: { name: "lesson_summary", strict: true, schema: SUMMARY_SCHEMA } },
    stream: false,
  };
}

export function validateLessonSummary(result, pages) {
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new TypeError("Lesson summary must be an object");
  const summary = clean(result.summary);
  if (!summary || !Array.isArray(result.key_points)) throw new TypeError("Lesson summary is incomplete");
  const pageMap = new Map(pages.map((item) => [item.page, clean(item.text)]));
  const keyPoints = result.key_points.slice(0, 8).map((item) => ({
    page: Number(item?.page),
    quote: clean(item?.quote).slice(0, 300),
    explanation: clean(item?.explanation).slice(0, 500),
  })).filter((item) => {
    const pageText = pageMap.get(item.page);
    return Number.isInteger(item.page)
      && item.quote
      && item.explanation
      && pageText
      && pageText.toLocaleLowerCase("vi").includes(item.quote.toLocaleLowerCase("vi"));
  });
  return { summary: summary.slice(0, 6_000), key_points: keyPoints };
}

export function parseLessonSummary(payload, protocol, pages) {
  try {
    return validateLessonSummary(JSON.parse(extractAiText(payload, protocol)), pages);
  } catch (error) {
    if (error instanceof SyntaxError) throw new TypeError("AI returned invalid lesson-summary JSON");
    throw error;
  }
}

export async function generateLessonSummary(input, { provider, fetchImpl = fetch } = {}) {
  if (!provider?.configured) return buildFallbackLessonSummary(input.pages);
  const body = buildLessonSummaryBody(input, provider);
  const payload = await requestAi(provider, body, fetchImpl);
  return parseLessonSummary(payload, provider.protocol, input.pages);
}

export function buildFallbackLessonSummary(pages) {
  const useful = pages.filter((item) => clean(item.text));
  const keyPoints = useful.slice(0, 6).map((item) => {
    const text = clean(item.text);
    const quote = (text.match(/^.{20,180}?(?=[.!?](?:\s|$))/u)?.[0] || text.slice(0, 150)).trim();
    return { page: item.page, quote, explanation: "Đây là một ý chính xuất hiện trực tiếp trong tài liệu." };
  });
  const summary = keyPoints.length
    ? `Bài học tập trung vào ${keyPoints.map((item) => item.quote).join("; ")}.`
    : "Chưa trích xuất được đủ văn bản để tạo bản tóm tắt bài học.";
  return { summary, key_points: keyPoints };
}
