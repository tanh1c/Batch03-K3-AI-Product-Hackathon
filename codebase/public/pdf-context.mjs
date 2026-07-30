import { clampBounds } from "../src/selection-geometry.mjs";

const DEFAULT_MAX_DIMENSION = 1600;

export function normalizedBoundsToPixels(bounds, canvas) {
  const normalized = clampBounds(bounds);
  if (!Number.isInteger(canvas?.width) || canvas.width < 1
    || !Number.isInteger(canvas?.height) || canvas.height < 1) {
    throw new TypeError("source canvas must have positive pixel dimensions");
  }
  const left = Math.floor(normalized.x * canvas.width);
  const top = Math.floor(normalized.y * canvas.height);
  const right = Math.ceil((normalized.x + normalized.width) * canvas.width - Number.EPSILON * canvas.width * 4);
  const bottom = Math.ceil((normalized.y + normalized.height) * canvas.height - Number.EPSILON * canvas.height * 4);
  return {
    sx: left,
    sy: top,
    sw: Math.max(1, right - left),
    sh: Math.max(1, bottom - top),
  };
}

export function normalizePdfTextItems(textContent, viewport) {
  if (!Array.isArray(textContent?.items)) return [];
  if (!Number.isFinite(viewport?.width) || viewport.width <= 0
    || !Number.isFinite(viewport?.height) || viewport.height <= 0) {
    throw new TypeError("viewport must have positive dimensions");
  }

  return textContent.items.flatMap((item) => {
    const str = typeof item?.str === "string" ? item.str.replace(/\s+/g, " ").trim() : "";
    if (!str) return [];
    if (item.bounds) {
      try {
        return [{ str, bounds: clampBounds(item.bounds) }];
      } catch {
        return [];
      }
    }
    const transform = item?.transform;
    if (!Array.isArray(transform) || transform.length < 6) return [];
    const x = transform[4];
    const y = transform[5];
    const width = Math.abs(Number(item.width) || Math.hypot(transform[0], transform[1]));
    const height = Math.abs(Number(item.height) || Math.hypot(transform[2], transform[3]));
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return [];

    const points = [
      toViewportPoint(viewport, x, y),
      toViewportPoint(viewport, x + width, y),
      toViewportPoint(viewport, x, y + height),
      toViewportPoint(viewport, x + width, y + height),
    ];
    const xs = points.map(([pointX]) => pointX);
    const ys = points.map(([, pointY]) => pointY);
    try {
      return [{
        str,
        bounds: clampBounds({
          x: Math.min(...xs) / viewport.width,
          y: Math.min(...ys) / viewport.height,
          width: (Math.max(...xs) - Math.min(...xs)) / viewport.width,
          height: (Math.max(...ys) - Math.min(...ys)) / viewport.height,
        }),
      }];
    } catch {
      return [];
    }
  });
}

export function extractIntersectingText(textItems, selectionBounds) {
  const bounds = clampBounds(selectionBounds);
  return (Array.isArray(textItems) ? textItems : [])
    .filter((item) => typeof item?.str === "string" && item.str.trim() && overlaps(item.bounds, bounds))
    .sort((first, second) => {
      const verticalDifference = first.bounds.y - second.bounds.y;
      return Math.abs(verticalDifference) > 0.01
        ? verticalDifference
        : first.bounds.x - second.bounds.x;
    })
    .map((item) => item.str.replace(/\s+/g, " ").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractPdfContext(pageContext, selection, {
  createCanvas = () => globalThis.document.createElement("canvas"),
  maxDimension = DEFAULT_MAX_DIMENSION,
  signal,
} = {}) {
  if (!pageContext || typeof pageContext !== "object") {
    throw new TypeError("pageContext is required");
  }
  if (!selection || typeof selection !== "object") {
    throw new TypeError("selection is required");
  }
  if (!Number.isFinite(maxDimension) || maxDimension < 1) {
    throw new TypeError("maxDimension must be positive");
  }
  throwIfAborted(signal);
  if (pageContext.renderPromise) {
    await (typeof pageContext.renderPromise === "function"
      ? pageContext.renderPromise()
      : pageContext.renderPromise);
  }
  throwIfAborted(signal);

  const canvas = pageContext.canvas;
  if (!canvas?.classList?.contains("pdf-canvas")) {
    throw new TypeError("pageContext canvas must be the pdf-canvas");
  }
  const pixelBounds = normalizedBoundsToPixels(selection.bounds, canvas);
  const scale = Math.min(1, maxDimension / Math.max(pixelBounds.sw, pixelBounds.sh));
  const output = createCanvas();
  output.width = Math.max(1, Math.round(pixelBounds.sw * scale));
  output.height = Math.max(1, Math.round(pixelBounds.sh * scale));
  const context = output.getContext?.("2d");
  if (!context || typeof context.drawImage !== "function") {
    throw new TypeError("output canvas must provide a 2D context");
  }
  context.drawImage(
    canvas,
    pixelBounds.sx,
    pixelBounds.sy,
    pixelBounds.sw,
    pixelBounds.sh,
    0,
    0,
    output.width,
    output.height,
  );
  throwIfAborted(signal);

  const textItems = pageContext.textItems
    || normalizePdfTextItems(pageContext.textContent, pageContext.viewport);
  const text = extractIntersectingText(textItems, selection.bounds);
  const dataUrl = output.toDataURL?.("image/png");
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl || "");
  if (!match) throw new Error("Không thể mã hóa vùng PDF thành PNG.");

  return {
    imageData: match[1],
    mediaType: "image/png",
    text,
    needsOcr: !text,
    pixelBounds,
  };
}

function toViewportPoint(viewport, x, y) {
  if (typeof viewport.convertToViewportPoint === "function") {
    return viewport.convertToViewportPoint(x, y);
  }
  const matrix = viewport.transform;
  if (!Array.isArray(matrix) || matrix.length < 6) {
    throw new TypeError("viewport must provide a transform");
  }
  return [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ];
}

function overlaps(first, second) {
  try {
    const bounds = clampBounds(first);
    return Math.min(bounds.x + bounds.width, second.x + second.width) > Math.max(bounds.x, second.x)
      && Math.min(bounds.y + bounds.height, second.y + second.height) > Math.max(bounds.y, second.y);
  } catch {
    return false;
  }
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  throw new DOMException("The operation was aborted", "AbortError");
}
