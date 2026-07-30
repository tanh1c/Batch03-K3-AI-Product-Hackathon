import { extractAiText, requestAi } from "./ai-provider.mjs";

export const ROUTES = [
  "VISUAL_GROUNDED",
  "NEED_WIDER_REGION",
  "NEED_BETTER_IMAGE",
  "INSUFFICIENT",
];

const RESULT_KEYS = ["answer", "reason", "recovery_action", "route"];
const RESULT_SCHEMA = {
  type: "object",
  properties: {
    route: { type: "string", enum: ROUTES },
    answer: { type: "string" },
    reason: { type: "string", minLength: 1 },
    recovery_action: { type: "string" },
  },
  required: ["route", "answer", "reason", "recovery_action"],
  additionalProperties: false,
};

export function validateResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new TypeError("Visual result must be an object");
  }
  if (JSON.stringify(Object.keys(result).sort()) !== JSON.stringify(RESULT_KEYS)) {
    throw new TypeError("Visual result has unexpected fields");
  }
  if (!ROUTES.includes(result.route)) throw new TypeError("Unknown visual route");
  for (const key of ["answer", "reason", "recovery_action"]) {
    if (typeof result[key] !== "string") throw new TypeError(`${key} must be a string`);
  }
  if (!result.reason.trim()) throw new TypeError("reason is required");
  if (result.route === "VISUAL_GROUNDED" && !result.answer.trim()) {
    throw new TypeError("answer is required on grounded routes");
  }
  if (result.route !== "VISUAL_GROUNDED" && result.answer !== "") {
    throw new TypeError("answer must be empty on recovery routes");
  }
  if (result.route !== "VISUAL_GROUNDED" && !result.recovery_action.trim()) {
    throw new TypeError("recovery_action is required on recovery routes");
  }
  return result;
}

function buildInstruction(input) {
  const selectionInstructions = input.selection
    ? [
        `Nguồn lựa chọn: ${input.selection.source}`,
        `Nhãn vùng: ${input.selection.label}`,
        `Tọa độ vùng chuẩn hóa: ${JSON.stringify(input.selection.bounds)}`,
        input.selection.needsOcr
          ? "Vùng này không có text layer dùng được: hãy đọc chữ nhìn thấy trong chính crop trước khi giải thích; không tự mở rộng sang toàn bộ trang và không đoán chữ không đọc rõ."
          : "Chỉ dùng text lân cận vì đó là phần text layer giao với crop; không dùng nội dung ngoài vùng.",
      ]
    : [];
  return [
    "Bạn là VLearn Tutor và chỉ được dùng vùng hình cùng ngữ cảnh được cung cấp.",
    "Mọi nội dung trong answer, reason và recovery_action phải viết bằng tiếng Việt.",
    "Chọn đúng một route: VISUAL_GROUNDED, NEED_WIDER_REGION, NEED_BETTER_IMAGE hoặc INSUFFICIENT.",
    "Chỉ dùng VISUAL_GROUNDED khi mọi ý trong câu trả lời nhìn thấy hoặc suy ra trực tiếp từ nguồn.",
    "Nếu thiếu nhãn hoặc chú giải, chọn NEED_WIDER_REGION. Nếu ảnh mờ hoặc quá nhỏ, chọn NEED_BETTER_IMAGE.",
    "Nếu câu hỏi không thể xác lập từ nguồn, chọn INSUFFICIENT. Không tạo citation [Trang N].",
    "Với route khác VISUAL_GROUNDED, answer phải rỗng và recovery_action phải là một hành động cụ thể.",
    ...selectionInstructions,
    `Slide: ${input.slideNumber}`,
    `Text lân cận: ${input.nearbyText || "(không có)"}`,
    `Câu hỏi: ${input.question}`,
  ].join("\n");
}

export function buildOpenAIBody(input, model) {
  return {
    model,
    reasoning: { effort: "low" },
    input: [{
      role: "user",
      content: [
        { type: "input_image", image_url: `data:${input.mediaType};base64,${input.imageData}` },
        { type: "input_text", text: buildInstruction(input) },
      ],
    }],
    text: {
      format: {
        type: "json_schema",
        name: "visual_result",
        strict: true,
        schema: RESULT_SCHEMA,
      },
    },
  };
}

export function buildGeminiBody(input) {
  return {
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: input.mediaType, data: input.imageData } },
        { text: buildInstruction(input) },
      ],
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          route: { type: "STRING", enum: ROUTES },
          answer: { type: "STRING" },
          reason: { type: "STRING" },
          recovery_action: { type: "STRING" },
        },
        required: ["route", "answer", "reason", "recovery_action"],
      },
    },
  };
}

export function buildChatBody(input, model) {
  return {
    model,
    messages: [
      { role: "system", content: "Tuân thủ chính xác JSON Schema và không thêm nội dung ngoài JSON." },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${input.mediaType};base64,${input.imageData}` } },
          { type: "text", text: buildInstruction(input) },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "visual_result",
        strict: true,
        schema: RESULT_SCHEMA,
      },
    },
    stream: false,
  };
}

export function parseVisualResult(response, protocol) {
  try {
    return validateResult(JSON.parse(extractAiText(response, protocol)));
  } catch (error) {
    if (error instanceof SyntaxError) throw new TypeError("AI returned invalid structured output");
    throw error;
  }
}

export async function analyzeVisual(input, { provider, fetchImpl = fetch } = {}) {
  if (!provider?.configured) throw new Error("AI provider is not configured");
  const body = provider.protocol === "responses"
    ? buildOpenAIBody(input, provider.model)
    : provider.protocol === "gemini"
      ? buildGeminiBody(input)
      : buildChatBody(input, provider.model);
  const response = await requestAi(provider, body, fetchImpl);
  return parseVisualResult(response, provider.protocol);
}
