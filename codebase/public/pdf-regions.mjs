import {
  clampBounds,
  intersectionRatio,
} from "../src/selection-geometry.mjs";
import { normalizePdfTextItems } from "./pdf-context.mjs";

const DEFAULT_MAX_CANDIDATES = 12;
const MIN_AREA = 0.002;
const MAX_AREA = 0.86;

export async function detectPdfRegions(page, {
  pageNumber,
  textContent,
  ops,
  maxCandidates = DEFAULT_MAX_CANDIDATES,
} = {}) {
  if (!page || typeof page.getViewport !== "function") {
    throw new TypeError("page must be a PDF.js page");
  }
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new TypeError("pageNumber must be a positive integer");
  }
  const viewport = page.getViewport({ scale: 1 });
  const resolvedText = textContent || await page.getTextContent();
  const [operatorList] = await Promise.all([
    page.getOperatorList(),
  ]);
  const textItems = normalizePdfTextItems(resolvedText, viewport);
  const textCandidates = mergeTextItemsToCandidates({ pageNumber, textItems });
  const graphicCandidates = detectGraphicCandidates({
    pageNumber,
    operatorList,
    viewport,
    ops,
  });
  return filterRegionCandidates(
    [...graphicCandidates, ...textCandidates],
    { maxCandidates },
  );
}

export function mergeTextItemsToCandidates({ pageNumber, textItems }) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new TypeError("pageNumber must be a positive integer");
  }
  const items = (Array.isArray(textItems) ? textItems : [])
    .flatMap((item) => {
      const str = typeof item?.str === "string" ? item.str.replace(/\s+/g, " ").trim() : "";
      const bounds = safeBounds(item?.bounds);
      return str && bounds ? [{ str, bounds }] : [];
    })
    .sort((first, second) => first.bounds.y - second.bounds.y || first.bounds.x - second.bounds.x);

  const groups = [];
  for (const item of items) {
    const group = groups.find((candidate) => canMergeText(candidate.bounds, item.bounds));
    if (group) {
      group.items.push(item);
      group.bounds = unionBounds(group.bounds, item.bounds);
    } else {
      groups.push({ items: [item], bounds: item.bounds });
    }
  }

  return filterRegionCandidates(groups.map((group, index) => ({
    id: `page-${pageNumber}-text-${index + 1}`,
    kind: "text",
    bounds: roundBounds(group.bounds),
    label: `Vùng chữ ${index + 1}`,
    confidence: Number(Math.min(0.92, 0.68 + group.items.length * 0.06).toFixed(2)),
  })));
}

export function detectGraphicCandidates({
  pageNumber,
  operatorList,
  viewport,
  ops,
}) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new TypeError("pageNumber must be a positive integer");
  }
  if (!Array.isArray(operatorList?.fnArray) || !Array.isArray(operatorList?.argsArray)) {
    return [];
  }
  if (!Number.isFinite(viewport?.width) || viewport.width <= 0
    || !Number.isFinite(viewport?.height) || viewport.height <= 0) {
    throw new TypeError("viewport must have positive dimensions");
  }
  const op = ops || {};
  let matrix = Array.isArray(viewport.transform) ? [...viewport.transform] : [1, 0, 0, 1, 0, 0];
  const stack = [];
  let pendingPath = null;
  const imageBounds = [];
  const vectorBounds = [];

  operatorList.fnArray.forEach((fn, index) => {
    const args = operatorList.argsArray[index] || [];
    if (fn === op.save) {
      stack.push([...matrix]);
      return;
    }
    if (fn === op.restore) {
      matrix = stack.pop() || matrix;
      return;
    }
    if (fn === op.transform && args.length >= 6) {
      matrix = multiplyMatrices(matrix, args.slice(0, 6));
      return;
    }
    if (isImageOperation(fn, op)) {
      const bounds = normalizedTransformedRect([0, 0, 1, 1], matrix, viewport);
      if (bounds) imageBounds.push(bounds);
      return;
    }
    if (fn === op.constructPath) {
      const minMax = findMinMax(args);
      pendingPath = minMax
        ? normalizedTransformedRect(minMax, matrix, viewport)
        : null;
      return;
    }
    if (pendingPath && isPaintOperation(fn, op)) {
      vectorBounds.push(pendingPath);
      pendingPath = null;
    }
  });

  const mergedVectors = mergeNearbyBounds(vectorBounds);
  const candidates = [
    ...imageBounds.map((bounds, index) => ({
      id: `page-${pageNumber}-image-${index + 1}`,
      kind: "image",
      bounds: roundBounds(bounds),
      label: `Vùng hình ${index + 1}`,
      confidence: 0.82,
    })),
    ...mergedVectors.map((bounds, index) => ({
      id: `page-${pageNumber}-vector-${index + 1}`,
      kind: "vector",
      bounds: roundBounds(bounds),
      label: `Vùng đồ họa ${index + 1}`,
      confidence: 0.68,
    })),
  ];
  return filterRegionCandidates(candidates);
}

export function filterRegionCandidates(candidates, {
  maxCandidates = DEFAULT_MAX_CANDIDATES,
  duplicateThreshold = 0.78,
} = {}) {
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1) {
    throw new TypeError("maxCandidates must be a positive integer");
  }
  const valid = (Array.isArray(candidates) ? candidates : [])
    .flatMap((candidate) => {
      const bounds = safeBounds(candidate?.bounds);
      if (!bounds || !["image", "text", "vector"].includes(candidate?.kind)) return [];
      const area = bounds.width * bounds.height;
      if (area < MIN_AREA || area > MAX_AREA) return [];
      if (typeof candidate.id !== "string" || !candidate.id
        || typeof candidate.label !== "string" || !candidate.label
        || !Number.isFinite(candidate.confidence)) return [];
      return [{
        ...candidate,
        bounds: roundBounds(bounds),
        confidence: Math.max(0, Math.min(1, candidate.confidence)),
      }];
    })
    .sort((first, second) => second.confidence - first.confidence);

  const unique = [];
  for (const candidate of valid) {
    if (unique.some((kept) => intersectionRatio(kept.bounds, candidate.bounds) >= duplicateThreshold)) {
      continue;
    }
    unique.push(candidate);
    if (unique.length === maxCandidates) break;
  }
  return unique;
}

function canMergeText(first, second) {
  const horizontalGap = Math.max(0, Math.max(first.x, second.x)
    - Math.min(first.x + first.width, second.x + second.width));
  const verticalGap = Math.max(0, Math.max(first.y, second.y)
    - Math.min(first.y + first.height, second.y + second.height));
  const horizontalOverlap = Math.min(first.x + first.width, second.x + second.width)
    - Math.max(first.x, second.x);
  return (verticalGap <= 0.025 && horizontalOverlap > -0.01)
    || (verticalGap <= 0.01 && horizontalGap <= 0.04);
}

function isImageOperation(fn, ops) {
  return [
    ops.paintImageXObject,
    ops.paintInlineImageXObject,
    ops.paintImageMaskXObject,
    ops.paintImageXObjectRepeat,
  ].some((value) => value !== undefined && fn === value);
}

function isPaintOperation(fn, ops) {
  return [
    ops.stroke,
    ops.closeStroke,
    ops.fill,
    ops.eoFill,
    ops.fillStroke,
    ops.eoFillStroke,
    ops.closeFillStroke,
    ops.closeEOFillStroke,
  ].some((value) => value !== undefined && fn === value);
}

function findMinMax(args) {
  for (let index = args.length - 1; index >= 0; index -= 1) {
    const value = args[index];
    if (Array.isArray(value) && value.length === 4 && value.every(Number.isFinite)) {
      const [minX, minY, maxX, maxY] = value;
      if (maxX > minX && maxY > minY) return value;
    }
  }
  return null;
}

function normalizedTransformedRect([left, top, right, bottom], matrix, viewport) {
  const points = [
    transformPoint(matrix, left, top),
    transformPoint(matrix, right, top),
    transformPoint(matrix, left, bottom),
    transformPoint(matrix, right, bottom),
  ];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return safeBounds({
    x: Math.min(...xs) / viewport.width,
    y: Math.min(...ys) / viewport.height,
    width: (Math.max(...xs) - Math.min(...xs)) / viewport.width,
    height: (Math.max(...ys) - Math.min(...ys)) / viewport.height,
  });
}

function multiplyMatrices(first, second) {
  return [
    first[0] * second[0] + first[2] * second[1],
    first[1] * second[0] + first[3] * second[1],
    first[0] * second[2] + first[2] * second[3],
    first[1] * second[2] + first[3] * second[3],
    first[0] * second[4] + first[2] * second[5] + first[4],
    first[1] * second[4] + first[3] * second[5] + first[5],
  ];
}

function transformPoint(matrix, x, y) {
  return [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ];
}

function mergeNearbyBounds(boundsList) {
  const groups = [];
  for (const bounds of boundsList) {
    const groupIndex = groups.findIndex((group) => areNearby(group, bounds));
    if (groupIndex >= 0) groups[groupIndex] = unionBounds(groups[groupIndex], bounds);
    else groups.push(bounds);
  }
  return groups;
}

function areNearby(first, second) {
  const gap = 0.025;
  return first.x - gap < second.x + second.width
    && first.x + first.width + gap > second.x
    && first.y - gap < second.y + second.height
    && first.y + first.height + gap > second.y;
}

function unionBounds(first, second) {
  const left = Math.min(first.x, second.x);
  const top = Math.min(first.y, second.y);
  const right = Math.max(first.x + first.width, second.x + second.width);
  const bottom = Math.max(first.y + first.height, second.y + second.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function safeBounds(bounds) {
  try {
    return clampBounds(bounds);
  } catch {
    return null;
  }
}

function roundBounds(bounds) {
  return Object.fromEntries(Object.entries(bounds).map(([key, value]) => [
    key,
    Number(value.toFixed(6)),
  ]));
}
