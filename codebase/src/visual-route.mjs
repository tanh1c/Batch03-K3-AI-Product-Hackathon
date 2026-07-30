function validateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Dữ liệu hình ảnh không hợp lệ.";
  if (typeof body.imageData !== "string" || !body.imageData || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.imageData)) return "Vùng hình không hợp lệ.";
  if (body.mediaType !== "image/png") return "Chỉ hỗ trợ vùng hình PNG.";
  if (typeof body.question !== "string" || !body.question.trim() || body.question.length > 1000) return "Câu hỏi phải có từ 1 đến 1000 ký tự.";
  if (!Number.isInteger(body.slideNumber) || body.slideNumber < 1 || body.slideNumber > 9999) return "Số trang không hợp lệ.";
  if (typeof body.nearbyText !== "string" || body.nearbyText.length > 4000) return "Ngữ cảnh văn bản không hợp lệ.";
  return "";
}

export function registerVisualRoute(app, {
  analyze,
  recordTrace,
  provider,
  traceFile,
}) {
  app.post("/api/analyze", async (request, response) => {
    const error = validateInput(request.body);
    if (error) return response.status(400).json({ error });

    if (!provider.configured) return response.status(503).json({ error: "Visual Tutor chưa được cấu hình." });

    try {
      const input = {
        imageData: request.body.imageData,
        mediaType: request.body.mediaType,
        question: request.body.question.trim(),
        slideNumber: request.body.slideNumber,
        nearbyText: request.body.nearbyText,
      };
      const result = await analyze(input, { provider });
      await recordTrace({ file: traceFile, provider: provider.name, model: provider.model, input, result });
      return response.json(result);
    } catch (upstreamError) {
      console.error("Visual analysis failed:", upstreamError.message);
      return response.status(502).json({ error: "Visual Tutor chưa thể phân tích vùng hình." });
    }
  });
}

export function visualErrorHandler(error, _request, response, next) {
  if (error?.type === "entity.too.large") return response.status(413).json({ error: "Vùng hình vượt quá giới hạn 10 MB." });
  if (error instanceof SyntaxError && error.status === 400) return response.status(400).json({ error: "JSON không hợp lệ." });
  return next(error);
}
