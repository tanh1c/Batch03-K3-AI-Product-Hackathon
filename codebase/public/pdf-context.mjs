const MAX_OUTPUT_DIMENSION = 1400;

export async function extractPdfContext(page, selection) {
  validateInput(page, selection);
  await waitForRender(page.renderPromise, page.signal);
  throwIfAborted(page.signal);

  const pixelBounds = toPixelBounds(selection.bounds, page.canvas);
  const scale = Math.min(
    1,
    MAX_OUTPUT_DIMENSION / Math.max(pixelBounds.width, pixelBounds.height),
  );
  const output = (page.createCanvas || defaultCreateCanvas)();
  output.width = Math.max(1, Math.round(pixelBounds.width * scale));
  output.height = Math.max(1, Math.round(pixelBounds.height * scale));
  const context = output.getContext("2d");
  if (!context) throw new Error("Could not create crop canvas context");

  context.drawImage(
    page.canvas,
    pixelBounds.x,
    pixelBounds.y,
    pixelBounds.width,
    pixelBounds.height,
    0,
    0,
    output.width,
    output.height,
  );

  throwIfAborted(page.signal);
  const imageData = encodePng(output);
  const text = extractIntersectingText(page.textLayer, selection.bounds);

  return {
    imageData,
    mediaType: "image/png",
    text,
    needsOcr: !text,
    pixelBounds,
  };
}

function validateInput(page, selection) {
  if (!Number.isInteger(page?.pageNumber) || page.pageNumber < 1) {
    throw new TypeError("pageNumber must be a positive integer");
  }
  if (selection?.pageNumber !== page.pageNumber) {
    throw new TypeError("selection must belong to the requested page");
  }
  const bounds = selection?.bounds;
  const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height];
  if (
    !values.every(Number.isFinite)
    || bounds.x < 0
    || bounds.y < 0
    || bounds.width <= 0
    || bounds.height <= 0
    || bounds.x + bounds.width > 1
    || bounds.y + bounds.height > 1
  ) {
    throw new TypeError("selection bounds must be normalized inside the page");
  }
  if (
    !Number.isFinite(page.canvas?.width)
    || !Number.isFinite(page.canvas?.height)
    || page.canvas.width <= 0
    || page.canvas.height <= 0
  ) {
    throw new TypeError("PDF canvas must have positive source dimensions");
  }
}

function toPixelBounds(bounds, canvas) {
  const x = Math.floor(bounds.x * canvas.width);
  const y = Math.floor(bounds.y * canvas.height);
  const right = Math.ceil((bounds.x + bounds.width) * canvas.width);
  const bottom = Math.ceil((bounds.y + bounds.height) * canvas.height);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

function extractIntersectingText(textLayer, bounds) {
  if (!textLayer) return "";
  const layerRect = textLayer.getBoundingClientRect();
  if (layerRect.width <= 0 || layerRect.height <= 0) return "";
  const selected = {
    left: layerRect.left + bounds.x * layerRect.width,
    top: layerRect.top + bounds.y * layerRect.height,
    right: layerRect.left + (bounds.x + bounds.width) * layerRect.width,
    bottom: layerRect.top + (bounds.y + bounds.height) * layerRect.height,
  };

  return [...textLayer.querySelectorAll("span")]
    .filter((element) => !element.querySelector?.("span"))
    .filter((element) => intersects(element.getBoundingClientRect(), selected))
    .map((element) => element.textContent || "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function intersects(rect, selected) {
  const right = rect.right ?? rect.left + rect.width;
  const bottom = rect.bottom ?? rect.top + rect.height;
  return right > selected.left
    && rect.left < selected.right
    && bottom > selected.top
    && rect.top < selected.bottom;
}

async function waitForRender(renderPromise, signal) {
  throwIfAborted(signal);
  if (!renderPromise) return;
  if (!signal) {
    await renderPromise;
    return;
  }

  let rejectAbort;
  const aborted = new Promise((_, reject) => {
    rejectAbort = () => reject(abortError());
    signal.addEventListener("abort", rejectAbort, { once: true });
  });
  try {
    await Promise.race([renderPromise, aborted]);
  } finally {
    signal.removeEventListener("abort", rejectAbort);
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function abortError() {
  return new DOMException("PDF context extraction was cancelled", "AbortError");
}

function encodePng(canvas) {
  const encoded = canvas.toDataURL("image/png");
  const prefix = "data:image/png;base64,";
  if (!encoded.startsWith(prefix) || encoded.length === prefix.length) {
    throw new Error("Could not encode PDF crop as PNG");
  }
  return encoded.slice(prefix.length);
}

function defaultCreateCanvas() {
  return document.createElement("canvas");
}
