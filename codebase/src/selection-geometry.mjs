export const SELECTION_SOURCES = [
  "snip",
  "circle",
  "detected-image",
  "detected-text",
];

export function createSelection({
  pageNumber,
  source,
  bounds,
  label,
  text = "",
  needsOcr = false,
}) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new TypeError("pageNumber must be a positive integer");
  }
  if (!SELECTION_SOURCES.includes(source)) {
    throw new TypeError("source must be a supported selection source");
  }
  if (typeof label !== "string" || !label.trim()) {
    throw new TypeError("label must be a non-empty string");
  }
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (typeof needsOcr !== "boolean") throw new TypeError("needsOcr must be a boolean");

  return {
    pageNumber,
    source,
    bounds: clampBounds(bounds),
    label: label.trim(),
    text,
    needsOcr,
  };
}

export function clampBounds(bounds) {
  const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height];
  if (!values.every(Number.isFinite)) {
    throw new TypeError("bounds values must be finite numbers");
  }

  if (
    bounds.x >= 0
    && bounds.y >= 0
    && bounds.width > 0
    && bounds.height > 0
    && bounds.x + bounds.width <= 1
    && bounds.y + bounds.height <= 1
  ) {
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
  }

  const left = Math.max(0, bounds.x);
  const top = Math.max(0, bounds.y);
  const right = Math.min(1, bounds.x + bounds.width);
  const bottom = Math.min(1, bounds.y + bounds.height);

  if (right <= left || bottom <= top) {
    throw new TypeError("bounds must have positive area inside the page");
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function rectToNormalizedBounds(start, end, pageRect) {
  const values = [
    start?.x,
    start?.y,
    end?.x,
    end?.y,
    pageRect?.left,
    pageRect?.top,
    pageRect?.width,
    pageRect?.height,
  ];
  if (!values.every(Number.isFinite) || pageRect.width <= 0 || pageRect.height <= 0) {
    throw new TypeError("points and pageRect must contain finite positive geometry");
  }

  const left = (Math.min(start.x, end.x) - pageRect.left) / pageRect.width;
  const top = (Math.min(start.y, end.y) - pageRect.top) / pageRect.height;
  const right = (Math.max(start.x, end.x) - pageRect.left) / pageRect.width;
  const bottom = (Math.max(start.y, end.y) - pageRect.top) / pageRect.height;

  return clampBounds({ x: left, y: top, width: right - left, height: bottom - top });
}

export function circlePointsToBounds(points, padding = 0.02) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new TypeError("points must be a non-empty array");
  }
  if (!Number.isFinite(padding) || padding < 0) {
    throw new TypeError("padding must be a non-negative finite number");
  }
  if (!points.every((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))) {
    throw new TypeError("points must contain finite coordinates");
  }

  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const left = Math.min(...xs) - padding;
  const top = Math.min(...ys) - padding;
  const right = Math.max(...xs) + padding;
  const bottom = Math.max(...ys) + padding;

  return clampBounds({ x: left, y: top, width: right - left, height: bottom - top });
}

export function intersectionRatio(a, b) {
  const first = clampBounds(a);
  const second = clampBounds(b);
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = first.width * first.height + second.width * second.height - intersection;
  return intersection / union;
}
