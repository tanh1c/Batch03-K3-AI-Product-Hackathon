import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function recordTrace({ file, provider, model, input, result, now = new Date() }) {
  const entry = {
    timestamp: now.toISOString(),
    provider,
    model,
    slideNumber: input.slideNumber,
    questionHash: createHash("sha256").update(input.question).digest("hex"),
    imageBytes: Buffer.byteLength(input.imageData, "base64"),
    route: result.route,
  };
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(entry)}\n`, "utf8");
}
