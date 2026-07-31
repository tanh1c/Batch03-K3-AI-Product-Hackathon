function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase("vi");
}

export function mergeHighlightRects(rects) {
  if (!Array.isArray(rects)) throw new TypeError("Highlight rects must be an array");
  const merged = [];
  rects.filter((rect) => rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0)
    .map((rect) => ({ ...rect }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((rect) => {
      const line = merged.at(-1);
      if (!line) {
        merged.push(rect);
        return;
      }
      const overlap = Math.min(line.y + line.height, rect.y + rect.height) - Math.max(line.y, rect.y);
      const gap = rect.x - (line.x + line.width);
      if (overlap < Math.min(line.height, rect.height) * 0.5 || gap > Math.max(line.height, rect.height) * 0.9) {
        merged.push(rect);
        return;
      }
      const right = Math.max(line.x + line.width, rect.x + rect.width);
      const bottom = Math.max(line.y + line.height, rect.y + rect.height);
      line.x = Math.min(line.x, rect.x);
      line.y = Math.min(line.y, rect.y);
      line.width = right - line.x;
      line.height = bottom - line.y;
    });
  const round = (value) => Math.round(value * 1_000_000) / 1_000_000;
  return merged.map((rect) => ({ x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) }));
}

export function findExactQuoteRects(fragments, quote) {
  if (!Array.isArray(fragments)) throw new TypeError("Text fragments must be an array");
  const valid = fragments.filter((fragment) => fragment
    && normalizeText(fragment.text)
    && [fragment.x, fragment.y, fragment.width, fragment.height].every(Number.isFinite)
    && fragment.width > 0
    && fragment.height > 0);
  const parts = valid.map((fragment) => normalizeText(fragment.text));
  const joined = parts.join(" ");
  const target = normalizeText(quote);
  const start = joined.indexOf(target);
  if (!target || start < 0) return [];
  const end = start + target.length;
  let offset = 0;
  const matched = valid.filter((_fragment, index) => {
    const fragmentStart = offset;
    const fragmentEnd = fragmentStart + parts[index].length;
    offset = fragmentEnd + 1;
    return fragmentStart < end && fragmentEnd > start;
  });
  return mergeHighlightRects(matched);
}

export function toPixelBounds(region, naturalWidth, naturalHeight) {
  const values = [region.x, region.y, region.width, region.height, naturalWidth, naturalHeight];
  if (
    !values.every(Number.isFinite)
    || region.x < 0
    || region.y < 0
    || region.width <= 0
    || region.height <= 0
    || region.x + region.width > 1
    || region.y + region.height > 1
    || naturalWidth <= 0
    || naturalHeight <= 0
  ) {
    throw new TypeError("Region must be inside the image");
  }
  return {
    sx: Math.round(region.x * naturalWidth),
    sy: Math.round(region.y * naturalHeight),
    sw: Math.round(region.width * naturalWidth),
    sh: Math.round(region.height * naturalHeight),
  };
}
