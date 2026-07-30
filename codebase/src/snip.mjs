import { createSelection, rectToNormalizedBounds } from "./selection-geometry.mjs";

export const MIN_SNIP_SIZE_PX = 12;

export function createSnipSelection({
  pageNumber,
  start,
  end,
  pageRect,
  minimumSize = MIN_SNIP_SIZE_PX,
}) {
  if (!Number.isFinite(minimumSize) || minimumSize <= 0) {
    throw new TypeError("minimumSize must be a positive finite number");
  }
  const pointValues = [start?.x, start?.y, end?.x, end?.y];
  if (!pointValues.every(Number.isFinite)) {
    throw new TypeError("points must contain finite coordinates");
  }
  const rectValues = [pageRect?.left, pageRect?.top, pageRect?.width, pageRect?.height];
  if (!rectValues.every(Number.isFinite) || pageRect.width <= 0 || pageRect.height <= 0) {
    throw new TypeError("pageRect must contain finite positive geometry");
  }

  const left = Math.max(pageRect.left, Math.min(start.x, end.x));
  const top = Math.max(pageRect.top, Math.min(start.y, end.y));
  const right = Math.min(pageRect.left + pageRect.width, Math.max(start.x, end.x));
  const bottom = Math.min(pageRect.top + pageRect.height, Math.max(start.y, end.y));
  if (right - left < minimumSize || bottom - top < minimumSize) return null;

  return createSelection({
    pageNumber,
    source: "snip",
    bounds: rectToNormalizedBounds(start, end, pageRect),
    label: "Vùng tự chọn",
  });
}
