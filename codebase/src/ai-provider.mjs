const PROVIDERS = ["openai", "openrouter", "9router", "gemini"];

export function resolveAiProvider(env = process.env) {
  const name = (env.AI_PROVIDER || "9router").toLowerCase();
  if (!PROVIDERS.includes(name)) throw new TypeError(`Unsupported AI_PROVIDER: ${name}`);

  if (name === "openai") {
    return {
      name,
      protocol: "responses",
      endpoint: "https://api.openai.com/v1/responses",
      apiKey: env.OPENAI_API_KEY || "",
      model: env.OPENAI_MODEL || "gpt-5.6-terra",
      configured: Boolean(env.OPENAI_API_KEY),
    };
  }

  if (name === "openrouter") {
    return {
      name,
      protocol: "chat",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: env.OPENROUTER_API_KEY || "",
      model: env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      configured: Boolean(env.OPENROUTER_API_KEY),
    };
  }

  if (name === "gemini") {
    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    return {
      name,
      protocol: "gemini",
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      apiKey: env.GEMINI_API_KEY || "",
      model,
      configured: Boolean(env.GEMINI_API_KEY),
    };
  }

  const root = (env.NINEROUTER_URL || "http://localhost:20128").replace(/\/+$/, "").replace(/\/v1$/, "");
  return {
    name,
    protocol: "chat",
    endpoint: `${root}/v1/chat/completions`,
    apiKey: env.NINEROUTER_KEY || "",
    model: env.NINEROUTER_MODEL || "gc/gemini-2.5-flash",
    configured: true,
  };
}

export function getAiHealth(config) {
  return {
    provider: config.name,
    model: config.model,
    configured: config.configured,
  };
}

export async function requestAi(config, body, fetchImpl = fetch) {
  const headers = { "Content-Type": "application/json" };
  if (config.protocol === "gemini") headers["x-goog-api-key"] = config.apiKey;
  else if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  const response = await fetchImpl(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${config.name} API error ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new TypeError(`${config.name} returned invalid JSON`);
  }
}

export function extractAiText(payload, protocol) {
  let text;
  if (protocol === "responses") {
    text = (payload?.output || [])
      .filter((item) => item?.type === "message")
      .flatMap((item) => item.content || [])
      .filter((item) => item?.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text)
      .join("\n");
  } else if (protocol === "gemini") {
    text = (payload?.candidates?.[0]?.content?.parts || [])
      .filter((part) => typeof part?.text === "string")
      .map((part) => part.text)
      .join("\n");
  } else {
    text = payload?.choices?.[0]?.message?.content;
  }
  if (typeof text !== "string" || !text.trim()) throw new TypeError("AI response omitted output text");
  return text.trim();
}
