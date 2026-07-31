/**
 * Pure geometry helper: clamp bounds into [0, 1] normalized page coordinates.
 */
function clampBounds(bounds) {
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

/**
 * Pure geometry helper: compute intersection-over-union (IoU) of two bounds.
 */
function intersectionRatio(a, b) {
  const first = clampBounds(a);
  const second = clampBounds(b);
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = first.width * first.height + second.width * second.height - intersection;
  return union > 0 ? intersection / union : 0;
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

function transformedBounds(viewport, matrix, sourceBounds) {
  const [left, top, right, bottom] = sourceBounds;
  const points = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ].map(([x, y]) => transformPoint(matrix, x, y))
    .map(([x, y]) => viewport.convertToViewportPoint?.(x, y) || [x, viewport.height - y]);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return clampBounds({
    x: x / viewport.width,
    y: y / viewport.height,
    width: (Math.max(...xs) - x) / viewport.width,
    height: (Math.max(...ys) - y) / viewport.height,
  });
}

function mergeNearbyVectors(candidates, gap = 0.02) {
  const merged = [];

  for (const candidate of candidates) {
    const group = { ...candidate, bounds: { ...candidate.bounds } };
    let joined;

    do {
      joined = false;
      for (let index = merged.length - 1; index >= 0; index--) {
        const bounds = merged[index].bounds;
        if (group.bounds.x > bounds.x + bounds.width + gap
          || bounds.x > group.bounds.x + group.bounds.width + gap
          || group.bounds.y > bounds.y + bounds.height + gap
          || bounds.y > group.bounds.y + group.bounds.height + gap) continue;

        const left = Math.min(group.bounds.x, bounds.x);
        const top = Math.min(group.bounds.y, bounds.y);
        const right = Math.max(group.bounds.x + group.bounds.width, bounds.x + bounds.width);
        const bottom = Math.max(group.bounds.y + group.bounds.height, bounds.y + bounds.height);
        group.bounds = { x: left, y: top, width: right - left, height: bottom - top };
        merged.splice(index, 1);
        joined = true;
      }
    } while (joined);

    merged.push(group);
  }

  return merged;
}

/**
 * Filter raw candidates by area, background ratio, and IoU overlap.
 *
 * @param {Array<object>} candidates
 * @param {object} [options]
 * @returns {Array<object>}
 */
export function filterCandidates(candidates, options = {}) {
  if (!Array.isArray(candidates)) return [];

  const minArea = options.minArea ?? 0.005;
  const maxArea = options.maxArea ?? 0.92;
  const maxDim = options.maxDim ?? 0.98;
  const iouThreshold = options.iouThreshold ?? 0.7;
  const maxCandidates = options.maxCandidates ?? 10;

  // 1. Filter out invalid geometry, tiny bounds, or near-full page background
  const valid = candidates.flatMap((candidate) => {
    if (!candidate?.bounds) return [];
    let bounds;
    try {
      bounds = clampBounds(candidate.bounds);
    } catch {
      return [];
    }

    const area = bounds.width * bounds.height;
    const candidateMinArea = candidate.kind === "text" ? minArea * 0.2 : minArea;
    if (area < candidateMinArea) return [];
    if (area >= maxArea) return [];
    if (bounds.width >= maxDim && bounds.height >= maxDim) return [];

    return [{ ...candidate, bounds }];
  });

  // 2. Sort by confidence descending, then by area descending
  valid.sort((a, b) => {
    const confDiff = (b.confidence ?? 0.5) - (a.confidence ?? 0.5);
    if (Math.abs(confDiff) > 0.001) return confDiff;
    const areaA = a.bounds.width * a.bounds.height;
    const areaB = b.bounds.width * b.bounds.height;
    return areaB - areaA;
  });

  // 3. Deduplicate high IoU candidates
  const kept = [];
  for (const candidate of valid) {
    let isDuplicate = false;
    for (const existing of kept) {
      try {
        if (intersectionRatio(candidate.bounds, existing.bounds) >= iouThreshold) {
          isDuplicate = true;
          break;
        }
      } catch {
        // Ignore geometry errors during IoU check
      }
    }
    if (!isDuplicate) {
      kept.push(candidate);
    }
    if (kept.length >= maxCandidates) break;
  }

  return kept;
}

/**
 * Detect image and vector candidates from PDF operator list or explicit image metadata.
 *
 * @param {object} operatorList PDF.js operator list or custom image objects
 * @param {object} viewport PDF page viewport with width & height
 * @param {number} [pageNumber=1]
 * @param {object} [options]
 * @returns {Array<object>}
 */
export function detectImageCandidates(operatorList, viewport, pageNumber = 1, options = {}) {
  const candidates = [];
  if (!viewport || !viewport.width || !viewport.height) {
    return candidates;
  }

  const vpWidth = viewport.width;
  const vpHeight = viewport.height;

  // Case A: Explicit images metadata array provided in operatorList or fixtures
  if (Array.isArray(operatorList?.images)) {
    operatorList.images.forEach((img, idx) => {
      if (img.width > 0 && img.height > 0) {
        const normX = (img.x ?? 0) / vpWidth;
        const normY = (img.y ?? 0) / vpHeight;
        const normW = img.width / vpWidth;
        const normH = img.height / vpHeight;

        try {
          const bounds = clampBounds({ x: normX, y: normY, width: normW, height: normH });
          candidates.push({
            id: `page-${pageNumber}-image-${idx + 1}`,
            kind: img.kind || "image",
            bounds,
            label: img.label || `Vùng hình ${idx + 1}`,
            confidence: img.confidence ?? 0.85,
          });
        } catch {
          // Ignore out-of-bound images
        }
      }
    });
  }

  let vectorCount = 0;
  const maxVectorPaths = options.maxVectorPaths ?? 1000;
  if (Array.isArray(operatorList?.fnArray) && Array.isArray(operatorList?.argsArray)) {
    let imageCount = candidates.length;
    let ctm = [1, 0, 0, 1, 0, 0];
    let vectorPaths = 0;
    const stack = [];

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];

      if (fn === 10) stack.push([...ctm]);
      else if (fn === 11) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === 12 && Array.isArray(args) && args.length >= 6) {
        ctm = multiplyMatrices(ctm, args);
      } else if (fn === 85 || fn === 86 || fn === "paintImageXObject" || fn === "paintInlineImageXObject") {
        try {
          imageCount++;
          candidates.push({
            id: `page-${pageNumber}-image-${imageCount}`,
            kind: "image",
            bounds: transformedBounds(viewport, ctm, [0, 0, 1, 1]),
            label: `Vùng hình ${imageCount}`,
            confidence: 0.8,
          });
        } catch {
          // Ignore invalid geometry
        }
      } else if (fn === 91 && (Array.isArray(args?.[2]) || ArrayBuffer.isView(args?.[2])) && args[2].length >= 4) {
        if (vectorPaths >= maxVectorPaths) continue;
        vectorPaths++;
        try {
          vectorCount++;
          candidates.push({
            id: `page-${pageNumber}-vector-${vectorCount}`,
            kind: "vector",
            bounds: transformedBounds(viewport, ctm, args[2]),
            label: `Vùng đồ họa ${vectorCount}`,
            confidence: 0.75,
          });
        } catch {
          // Ignore invalid geometry
        }
      }
    }
  }

  if (Array.isArray(operatorList?.vectors)) {
    operatorList.vectors.forEach((vec) => {
      try {
        vectorCount++;
        const bounds = clampBounds({
          x: vec.x / vpWidth,
          y: vec.y / vpHeight,
          width: vec.width / vpWidth,
          height: vec.height / vpHeight,
        });
        candidates.push({
          id: `page-${pageNumber}-vector-${vectorCount}`,
          kind: "vector",
          bounds,
          label: vec.label || `Vùng đồ họa ${vectorCount}`,
          confidence: vec.confidence ?? 0.75,
        });
      } catch {
        // Ignore invalid geometry
      }
    });
  }

  return candidates;
}

/**
 * Detect and merge text items into text block candidates.
 *
 * @param {Array<object>} textItems PDF.js text items from page.getTextContent()
 * @param {object} viewport PDF page viewport with width & height
 * @param {number} [pageNumber=1]
 * @param {object} [options]
 * @returns {Array<object>}
 */
export function detectTextCandidates(textItems, viewport, pageNumber = 1, options = {}) {
  const candidates = [];
  if (!Array.isArray(textItems) || textItems.length === 0 || !viewport || !viewport.width || !viewport.height) {
    return candidates;
  }

  const vpWidth = viewport.width;
  const vpHeight = viewport.height;

  const maxTextItems = options.maxTextItems ?? 4000;
  const normalizedItems = textItems
    .slice(0, maxTextItems)
    .map((item) => {
      if (!item || typeof item.str !== "string" || !item.str.trim()) return null;

      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const fontSize = Math.hypot(transform[2], transform[3]) || item.height || 12;
      const width = item.width || item.str.length * (fontSize * 0.5);
      const height = item.height || fontSize;
      const widthScale = Math.hypot(transform[0], transform[1]) || 1;
      const heightScale = Math.hypot(transform[2], transform[3]) || 1;
      const unitBounds = [
        0,
        0,
        width / widthScale,
        height / heightScale,
      ];

      try {
        return {
          str: item.str.trim(),
          bounds: transformedBounds(viewport, transform, unitBounds),
          fontSize,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (normalizedItems.length === 0) return candidates;

  // 2. Group items into lines (similar Y coordinate)
  normalizedItems.sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);

  const lines = [];
  for (const item of normalizedItems) {
    let placed = false;
    for (let index = lines.length - 1; index >= Math.max(0, lines.length - 8); index--) {
      const line = lines[index];
      const avgY = line.bounds.y;
      const avgHeight = line.bounds.height;
      const lineRight = line.bounds.x + line.bounds.width;
      const horizontalGap = item.bounds.x - lineRight;
      if (Math.abs(item.bounds.y - avgY) <= avgHeight * 0.6
        && horizontalGap <= Math.max(avgHeight * 2, 0.02)) {
        line.items.push(item);
        const minX = Math.min(line.bounds.x, item.bounds.x);
        const minY = Math.min(line.bounds.y, item.bounds.y);
        const maxX = Math.max(line.bounds.x + line.bounds.width, item.bounds.x + item.bounds.width);
        const maxY = Math.max(line.bounds.y + line.bounds.height, item.bounds.y + item.bounds.height);
        line.bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        placed = true;
        break;
      }
    }
    if (!placed) {
      lines.push({
        items: [item],
        bounds: { ...item.bounds },
      });
    }
  }

  // 3. Merge adjacent lines into text blocks
  const blocks = [];
  lines.sort((a, b) => a.bounds.y - b.bounds.y);

  for (const line of lines) {
    let merged = false;
    for (let index = blocks.length - 1; index >= Math.max(0, blocks.length - 8); index--) {
      const block = blocks[index];
      const blockBottom = block.bounds.y + block.bounds.height;
      const lineTop = line.bounds.y;
      const verticalGap = lineTop - blockBottom;

      if (verticalGap >= -0.01 && verticalGap <= block.bounds.height * 2.5) {
        const blockLeft = block.bounds.x;
        const blockRight = block.bounds.x + block.bounds.width;
        const lineLeft = line.bounds.x;
        const lineRight = line.bounds.x + line.bounds.width;

        const hasHorizontalOverlap = Math.max(blockLeft, lineLeft) < Math.min(blockRight, lineRight) + 0.02;
        if (hasHorizontalOverlap) {
          block.lines.push(line);
          const minX = Math.min(block.bounds.x, line.bounds.x);
          const minY = Math.min(block.bounds.y, line.bounds.y);
          const maxX = Math.max(block.bounds.x + block.bounds.width, line.bounds.x + line.bounds.width);
          const maxY = Math.max(block.bounds.y + block.bounds.height, line.bounds.y + line.bounds.height);
          block.bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
          merged = true;
          break;
        }
      }
    }
    if (!merged) {
      blocks.push({
        lines: [line],
        bounds: { ...line.bounds },
      });
    }
  }

  // 4. Convert blocks into candidates
  blocks.forEach((block, idx) => {
    const textSnippet = block.lines
      .map((l) => l.items.map((it) => it.str).join(" "))
      .join(" ")
      .slice(0, 30);

    candidates.push({
      id: `page-${pageNumber}-text-${idx + 1}`,
      kind: "text",
      bounds: block.bounds,
      label: `Vùng chữ ${idx + 1}${textSnippet ? `: ${textSnippet}...` : ""}`,
      confidence: 0.85,
    });
  });

  return candidates;
}

/**
 * Main entry point: detect image and text candidates from a PDF page and return filtered list.
 *
 * @param {object} params
 * @param {number} [params.pageNumber=1]
 * @param {object} params.viewport
 * @param {object} [params.textContent]
 * @param {object} [params.operatorList]
 * @param {object} [params.options]
 * @returns {Array<object>}
 */
export function detectPageRegions({
  pageNumber = 1,
  viewport,
  textContent,
  operatorList,
  options = {},
}) {
  const textItems = textContent?.items || [];

  const imageCandidates = detectImageCandidates(operatorList, viewport, pageNumber, options);
  const textCandidates = detectTextCandidates(textItems, viewport, pageNumber, options);

  const maxVectorArea = options.maxVectorArea ?? 0.7;
  const minVectorDim = options.minVectorDim ?? 0.05;
  const maxDim = options.maxDim ?? 0.98;
  const vectors = imageCandidates.filter(({ kind, bounds }) =>
    kind === "vector"
    && bounds.width * bounds.height < maxVectorArea
    && !(bounds.width >= maxDim && bounds.height >= maxDim));
  const rawAll = [
    ...imageCandidates.filter(({ kind }) => kind !== "vector"),
    ...mergeNearbyVectors(vectors, options.vectorGap).filter(({ bounds }) =>
      bounds.width >= minVectorDim
      && bounds.height >= minVectorDim
      && bounds.width * bounds.height < maxVectorArea),
    ...textCandidates,
  ];
  return filterCandidates(rawAll, options);
}
