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

export function boundsFromPoints(points, padding = 0.02) {
  if (
    !Array.isArray(points)
    || points.length < 3
    || !Number.isFinite(padding)
    || padding < 0
    || !points.every((point) => (
      point
      && Number.isFinite(point.x)
      && Number.isFinite(point.y)
      && point.x >= 0
      && point.x <= 1
      && point.y >= 0
      && point.y <= 1
    ))
  ) {
    throw new TypeError("A circled region requires normalized points");
  }

  const minX = Math.max(0, Math.min(...points.map((point) => point.x)) - padding);
  const minY = Math.max(0, Math.min(...points.map((point) => point.y)) - padding);
  const maxX = Math.min(1, Math.max(...points.map((point) => point.x)) + padding);
  const maxY = Math.min(1, Math.max(...points.map((point) => point.y)) + padding);
  if (maxX - minX < 0.01 || maxY - minY < 0.01) {
    throw new TypeError("Circled region is too small");
  }

  const round = (value) => Math.round(value * 1_000_000) / 1_000_000;
  return { x: round(minX), y: round(minY), width: round(maxX - minX), height: round(maxY - minY) };
}

export function classifyCircledContent(selectedText, hasExplicitVisual = false) {
  if (typeof selectedText !== "string" || typeof hasExplicitVisual !== "boolean") {
    throw new TypeError("Circled content metadata is invalid");
  }
  const text = selectedText.replace(/\s+/g, " ").trim();
  if (!text) return "visual";

  const fragments = text.split(/\s*[·\n]\s*/u).filter(Boolean);
  const wordCounts = fragments.map((fragment) => fragment.split(/\s+/).filter(Boolean).length);
  const averageWords = wordCounts.reduce((sum, count) => sum + count, 0) / Math.max(1, wordCounts.length);
  const readsLikeText = fragments.length <= 4
    || averageWords >= 6
    || (fragments.length <= 6 && /[.!?…:;]/u.test(text));

  if (hasExplicitVisual) return readsLikeText ? "mixed" : "visual";
  return readsLikeText ? "text" : "mixed";
}

export function selectTextFragmentsByBox(fragments, start, end, {
  paddingX = 0,
  paddingY = 0,
  clickTolerance = 0.015,
} = {}) {
  if (
    !Array.isArray(fragments)
    || !start
    || !end
    || ![start.x, start.y, end.x, end.y, paddingX, paddingY, clickTolerance].every(Number.isFinite)
  ) {
    throw new TypeError("Text selection geometry is invalid");
  }
  const valid = fragments.filter((fragment) => (
    fragment
    && typeof fragment.text === "string"
    && fragment.text.trim()
    && [fragment.x, fragment.y, fragment.width, fragment.height].every(Number.isFinite)
    && fragment.width > 0
    && fragment.height > 0
  ));
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  let selected;

  if (distance <= clickTolerance) {
    const pointDistance = (fragment) => {
      const dx = Math.max(fragment.x - start.x, 0, start.x - (fragment.x + fragment.width));
      const dy = Math.max(fragment.y - start.y, 0, start.y - (fragment.y + fragment.height));
      return Math.hypot(dx, dy);
    };
    const closest = valid.map((fragment) => ({ fragment, distance: pointDistance(fragment) }))
      .sort((a, b) => a.distance - b.distance)[0];
    selected = closest && closest.distance <= clickTolerance ? [closest.fragment] : [];
  } else {
    const box = {
      left: Math.min(start.x, end.x) - paddingX,
      top: Math.min(start.y, end.y) - paddingY,
      right: Math.max(start.x, end.x) + paddingX,
      bottom: Math.max(start.y, end.y) + paddingY,
    };
    selected = valid.filter((fragment) => (
      fragment.x < box.right
      && fragment.x + fragment.width > box.left
      && fragment.y < box.bottom
      && fragment.y + fragment.height > box.top
    ));
  }

  return selected.sort((a, b) => {
    const sameLine = Math.abs(a.y - b.y) <= Math.min(a.height, b.height) * 0.5;
    return sameLine ? a.x - b.x : a.y - b.y;
  });
}

export function mergeHighlightRects(rects) {
  if (!Array.isArray(rects)) throw new TypeError("Highlight rects must be an array");
  const valid = rects.filter((rect) => (
    rect
    && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0
    && rect.height > 0
  )).map((rect) => ({ ...rect })).sort((a, b) => a.x - b.x || a.y - b.y);

  const merged = [];
  valid.forEach((rect) => {
    const rectBottom = rect.y + rect.height;
    const line = merged.findLast((candidate) => {
      const candidateBottom = candidate.y + candidate.height;
      const verticalOverlap = Math.min(rectBottom, candidateBottom) - Math.max(rect.y, candidate.y);
      const sameLine = verticalOverlap >= Math.min(rect.height, candidate.height) * 0.5;
      const horizontalGap = rect.x - (candidate.x + candidate.width);
      return sameLine && horizontalGap <= Math.max(rect.height, candidate.height) * 0.9;
    });
    if (!line) {
      merged.push(rect);
      return;
    }
    const right = Math.max(line.x + line.width, rect.x + rect.width);
    const bottom = Math.max(line.y + line.height, rectBottom);
    line.x = Math.min(line.x, rect.x);
    line.y = Math.min(line.y, rect.y);
    line.width = right - line.x;
    line.height = bottom - line.y;
  });

  const round = (value) => Math.round(value * 1_000_000) / 1_000_000;
  return merged.map((rect) => ({
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
  }));
}
