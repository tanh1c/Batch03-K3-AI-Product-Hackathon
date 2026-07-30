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
  const coveragePercent = Math.round((input.selectionCoverage || 0) * 100);
  const contentRule = {
    text: "Vùng được nhận diện chủ yếu là văn bản. Hãy gọi đối tượng là đoạn chữ, câu hoặc nội dung; không gọi nó là hình ảnh.",
    visual: "Vùng được nhận diện chủ yếu là hình hoặc sơ đồ. Có thể mô tả bố cục, quan hệ, mũi tên và nhãn.",
    mixed: "Vùng có thể gồm cả chữ và yếu tố trực quan. Hãy gọi trung tính là vùng nội dung, trừ khi ảnh cho thấy rõ đây là sơ đồ.",
  }[input.contentKind] || "Hãy gọi trung tính là vùng nội dung nếu chưa chắc đó là văn bản hay sơ đồ.";
  const wideRegionRule = coveragePercent >= 65
    ? `Vùng đã bao phủ khoảng ${coveragePercent}% slide nên được xem là đủ rộng. Tuyệt đối không chọn NEED_WIDER_REGION; hãy giải thích phần nhìn thấy được, hoặc chỉ chọn NEED_BETTER_IMAGE nếu nội dung cốt lõi thật sự không đọc được.`
    : `Vùng đã bao phủ khoảng ${coveragePercent}% slide. Chỉ chọn NEED_WIDER_REGION khi thông tin thiết yếu thực sự nằm ngoài crop.`;
  return [
    "Bạn là VLearn Tutor và chỉ được dùng vùng hình cùng ngữ cảnh được cung cấp.",
    "Mọi nội dung trong answer, reason và recovery_action phải viết bằng tiếng Việt.",
    "Chọn đúng một route: VISUAL_GROUNDED, NEED_WIDER_REGION, NEED_BETTER_IMAGE hoặc INSUFFICIENT.",
    "Chỉ dùng VISUAL_GROUNDED khi mọi ý trong câu trả lời nhìn thấy hoặc suy ra trực tiếp từ nguồn.",
    "Nếu thiếu nhãn hoặc chú giải, chọn NEED_WIDER_REGION. Nếu ảnh mờ hoặc quá nhỏ, chọn NEED_BETTER_IMAGE.",
    "Nếu câu hỏi không thể xác lập từ nguồn, chọn INSUFFICIENT. Không tạo citation [Trang N].",
    "Ảnh đầu vào đã được cắt theo khung bao của nét khoanh; không cần nhận diện lại nét bút.",
    "Chữ trong vùng khoanh có thể đến từ lớp HTML/PDF text; chỉ dùng nó cùng ảnh để đọc nhãn, không dùng làm kiến thức ngoài slide.",
    contentRule,
    wideRegionRule,
    input.wideRegionRetry ? "Đây là lần kiểm tra lại vì vùng đã đủ rộng: ưu tiên VISUAL_GROUNDED và giải thích trực tiếp cấu trúc, mũi tên, nhóm và nhãn đọc được; không đòi người học khoanh rộng hơn lần nữa." : "",
    "Với route khác VISUAL_GROUNDED, answer phải rỗng và recovery_action phải là một hành động cụ thể.",
    `Slide: ${input.slideNumber}`,
    `Text lân cận: ${input.nearbyText || "(không có)"}`,
    `Chữ nằm trong vùng khoanh: ${input.selectedText || "(không có hoặc đã nằm trực tiếp trong ảnh)"}`,
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
        { type: "input_image", image_url: `data:${input.mediaType};base64,${input.imageData}`, detail: "high" },
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
          { type: "image_url", image_url: { url: `data:${input.mediaType};base64,${input.imageData}`, detail: "high" } },
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
  const result = parseVisualResult(response, provider.protocol);
  if (result.route === "NEED_WIDER_REGION" && input.selectionCoverage >= 0.65 && !input.wideRegionRetry) {
    return analyzeVisual({ ...input, wideRegionRetry: true }, { provider, fetchImpl });
  }
  if (result.route === "NEED_WIDER_REGION" && input.selectionCoverage >= 0.65) {
    return {
      route: "NEED_BETTER_IMAGE",
      answer: "",
      reason: "Vùng khoanh đã đủ rộng nhưng một số chữ hoặc nhãn vẫn chưa đọc rõ.",
      recovery_action: "Hãy phóng to slide hoặc khoanh sát riêng sơ đồ để Tutor đọc chữ rõ hơn.",
    };
  }
  return result;
}
