import assert from "node:assert/strict";
import test from "node:test";

import {
  detectImageCandidates,
  detectPageRegions,
  detectTextCandidates,
  filterCandidates,
} from "../public/pdf-regions.mjs";

function assertBounds(actual, expected) {
  for (const key of ["x", "y", "width", "height"]) {
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-9, `${key}: ${actual[key]}`);
  }
}

test("detectTextCandidates merges adjacent text items into line and block candidates", () => {
  const viewport = { width: 1000, height: 800 };
  const textItems = [
    // Line 1 item 1
    { str: "Machine", transform: [12, 0, 0, 12, 100, 700], width: 60, height: 12 },
    // Line 1 item 2 (same line)
    { str: "Learning", transform: [12, 0, 0, 12, 170, 700], width: 60, height: 12 },
    // Line 2 item 1 (next line, close below)
    { str: "Deep", transform: [12, 0, 0, 12, 100, 675], width: 40, height: 12 },
    { str: "Learning", transform: [12, 0, 0, 12, 150, 675], width: 60, height: 12 },
  ];

  const candidates = detectTextCandidates(textItems, viewport, 1);
  assert.ok(Array.isArray(candidates));
  assert.ok(candidates.length >= 1);
  const first = candidates[0];
  assert.equal(first.kind, "text");
  assert.ok(first.id.startsWith("page-1-text-"));
  assert.ok(first.bounds.x >= 0 && first.bounds.x <= 1);
  assert.ok(first.bounds.y >= 0 && first.bounds.y <= 1);
  assert.ok(first.bounds.width > 0);
  assert.ok(first.bounds.height > 0);
  assert.ok(typeof first.label === "string" && first.label.length > 0);
});

test("detectImageCandidates extracts image paint operations and bounding boxes", () => {
  const viewport = { width: 1000, height: 800 };
  const operatorList = {
    fnArray: [1, 85, 2], // 85 representing paintImageXObject or paintImage
    argsArray: [
      [],
      ["img_obj_1", 400, 300],
      [],
    ],
    // Optional direct transforms if available
    images: [
      { id: "img_obj_1", x: 100, y: 200, width: 400, height: 300 },
    ],
  };

  const candidates = detectImageCandidates(operatorList, viewport, 1);
  assert.ok(Array.isArray(candidates));
  assert.ok(candidates.length >= 1);
  const img = candidates.find((c) => c.kind === "image");
  assert.ok(img);
  assert.equal(img.bounds.x, 0.1);
  assert.equal(img.bounds.y, 0.25);
  assert.equal(img.bounds.width, 0.4);
  assert.equal(img.bounds.height, 0.375);
});

test("detectImageCandidates composes graphics state transforms and restores them", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const candidates = detectImageCandidates({
    fnArray: [10, 12, 10, 12, 85, 11, 11, 12, 85],
    argsArray: [
      [],
      [2, 0, 0, 2, 10, 20],
      [],
      [10, 0, 0, 5, 0, 0],
      ["nested"],
      [],
      [],
      [10, 0, 0, 10, 50, 50],
      ["restored"],
    ],
  }, viewport, 3);

  assert.deepEqual(candidates.map(({ kind }) => kind), ["image", "image"]);
  assertBounds(candidates[0].bounds, { x: 0.1, y: 0.7, width: 0.2, height: 0.1 });
  assertBounds(candidates[1].bounds, { x: 0.5, y: 0.4, width: 0.1, height: 0.1 });
});

test("detectImageCandidates encloses rotated image corners", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const candidates = detectImageCandidates({
    fnArray: [12, 85],
    argsArray: [[0, 20, -10, 0, 40, 20], ["rotated"]],
  }, viewport, 1);

  assertBounds(candidates[0].bounds, {
    x: 0.3,
    y: 0.6,
    width: 0.1,
    height: 0.2,
  });
});

test("detectTextCandidates applies viewport scale and rotated text geometry", () => {
  const scaledViewport = {
    width: 200,
    height: 100,
    convertToViewportPoint: (x, y) => [x * 2, 100 - y],
  };
  const scaled = detectTextCandidates([
    { str: "Scaled", transform: [10, 0, 0, 10, 10, 80], width: 20, height: 10 },
  ], scaledViewport, 1);
  assertBounds(scaled[0].bounds, {
    x: 0.1,
    y: 0.1,
    width: 0.2,
    height: 0.1,
  });

  const rotatedViewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const rotated = detectTextCandidates([
    { str: "Rotated", transform: [0, 10, -10, 0, 50, 50], width: 20, height: 10 },
  ], rotatedViewport, 1);
  assertBounds(rotated[0].bounds, {
    x: 0.4,
    y: 0.3,
    width: 0.1,
    height: 0.2,
  });
});

test("detectImageCandidates emits vectors from real constructPath operators", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const candidates = detectImageCandidates({
    fnArray: [12, 91],
    argsArray: [
      [1, 0, 0, 1, 10, 20],
      [22, [null], [10, 10, 40, 30]],
    ],
  }, viewport, 4);

  assert.deepEqual(
    { ...candidates[0], bounds: undefined },
    {
      id: "page-4-vector-1",
      kind: "vector",
      bounds: undefined,
      label: "Vùng đồ họa 1",
      confidence: 0.75,
    },
  );
  assertBounds(candidates[0].bounds, { x: 0.2, y: 0.5, width: 0.3, height: 0.2 });
});

test("detectImageCandidates accepts PDF.js typed constructPath bounds", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const candidates = detectImageCandidates({
    fnArray: [91],
    argsArray: [[22, [new Float32Array()], new Float32Array([10, 10, 40, 30])]],
  }, viewport, 2);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].kind, "vector");
  assertBounds(candidates[0].bounds, { x: 0.1, y: 0.7, width: 0.3, height: 0.2 });
});

test("detectPageRegions groups nearby vector paths into one useful region", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const result = detectPageRegions({
    viewport,
    operatorList: {
      fnArray: [91, 91, 91, 91],
      argsArray: [
        [22, [null], [10, 10, 15, 15]],
        [22, [null], [17, 10, 22, 15]],
        [22, [null], [10, 17, 15, 22]],
        [22, [null], [17, 17, 22, 22]],
      ],
    },
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].kind, "vector");
  assertBounds(result[0].bounds, {
    x: 0.1,
    y: 0.78,
    width: 0.12,
    height: 0.12,
  });
});

test("detectPageRegions excludes page backgrounds before grouping vectors", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const result = detectPageRegions({
    viewport,
    operatorList: {
      fnArray: [91, 91, 91, 91, 91],
      argsArray: [
        [22, [null], [0, 0, 100, 100]],
        [22, [null], [10, 10, 15, 15]],
        [22, [null], [17, 10, 22, 15]],
        [22, [null], [10, 17, 15, 22]],
        [22, [null], [17, 17, 22, 22]],
      ],
    },
  });

  assert.equal(result.length, 1);
  assertBounds(result[0].bounds, {
    x: 0.1,
    y: 0.78,
    width: 0.12,
    height: 0.12,
  });
});

test("detectPageRegions merges vector groups connected by a later bridge", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const result = detectPageRegions({
    viewport,
    operatorList: {
      fnArray: [91, 91, 91],
      argsArray: [
        [22, [null], [10, 10, 20, 20]],
        [22, [null], [34, 10, 44, 20]],
        [22, [null], [22, 10, 32, 20]],
      ],
    },
  });

  assert.equal(result.length, 1);
  assertBounds(result[0].bounds, { x: 0.1, y: 0.8, width: 0.34, height: 0.1 });
});

test("detectPageRegions limits vector paths before grouping", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const result = detectPageRegions({
    viewport,
    operatorList: {
      fnArray: [91, 91, 91, 91],
      argsArray: [
        [22, [null], [10, 10, 15, 15]],
        [22, [null], [17, 10, 22, 15]],
        [22, [null], [10, 17, 15, 22]],
        [22, [null], [17, 17, 22, 22]],
      ],
    },
    options: { maxVectorPaths: 2 },
  });

  assert.equal(result.length, 1);
  assertBounds(result[0].bounds, { x: 0.1, y: 0.85, width: 0.12, height: 0.05 });
});

test("detectPageRegions rejects vector regions covering most of the page", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const result = detectPageRegions({
    viewport,
    operatorList: {
      fnArray: [91],
      argsArray: [[22, [null], [5, 5, 95, 85]]],
    },
  });

  assert.equal(result.length, 0);
});

test("detectPageRegions rejects thin decorative vector lines", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const result = detectPageRegions({
    viewport,
    operatorList: {
      fnArray: [91],
      argsArray: [[22, [null], [5, 5, 95, 8]]],
    },
  });

  assert.equal(result.length, 0);
});

test("detectPageRegions rejects grouped vectors covering most of the page", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const result = detectPageRegions({
    viewport,
    operatorList: {
      fnArray: [91, 91],
      argsArray: [
        [22, [null], [5, 10, 50, 90]],
        [22, [null], [52, 10, 95, 90]],
      ],
    },
  });

  assert.equal(result.length, 0);
});

test("detectTextCandidates keeps aligned columns in separate candidates", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const candidates = detectTextCandidates([
    { str: "Left one", transform: [10, 0, 0, 10, 5, 80], width: 20, height: 10 },
    { str: "Right one", transform: [10, 0, 0, 10, 65, 80], width: 20, height: 10 },
    { str: "Left two", transform: [10, 0, 0, 10, 5, 60], width: 20, height: 10 },
    { str: "Right two", transform: [10, 0, 0, 10, 65, 60], width: 20, height: 10 },
  ], viewport);

  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates.map(({ bounds }) => bounds.x), [0.05, 0.65]);
});

test("filterCandidates returns clamped normalized bounds", () => {
  const [candidate] = filterCandidates([
    {
      id: "edge",
      kind: "image",
      bounds: { x: -0.1, y: 0.2, width: 0.4, height: 0.4 },
      confidence: 0.8,
    },
  ]);

  assertBounds(candidate.bounds, { x: 0, y: 0.2, width: 0.3, height: 0.4 });
});

test("detectTextCandidates honors a bounded text-item work limit", () => {
  const viewport = {
    width: 100,
    height: 100,
    convertToViewportPoint: (x, y) => [x, 100 - y],
  };
  const items = [
    { str: "first", transform: [10, 0, 0, 10, 10, 80], width: 20, height: 10 },
    { str: "second", transform: [10, 0, 0, 10, 35, 80], width: 20, height: 10 },
    { str: "third", transform: [10, 0, 0, 10, 10, 20], width: 20, height: 10 },
  ];

  const candidates = detectTextCandidates(items, viewport, 1, { maxTextItems: 2 });
  assert.equal(candidates.length, 1);
  assert.doesNotMatch(candidates[0].label, /third/);
});

test("detectPageRegions keeps a short readable text region", () => {
  const viewport = { width: 1000, height: 800 };
  const result = detectPageRegions({
    pageNumber: 3,
    viewport,
    textContent: {
      items: [
        { str: "Gradient descent", transform: [16, 0, 0, 16, 100, 700], width: 120, height: 16 },
      ],
    },
    operatorList: { fnArray: [], argsArray: [] },
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].kind, "text");
  assert.match(result[0].label, /Gradient descent/);
});

test("filterCandidates rejects tiny items, full-page backgrounds, and high IoU duplicates", () => {
  const candidates = [
    // Tiny item (area < 0.005)
    { id: "c1", kind: "text", bounds: { x: 0.1, y: 0.1, width: 0.02, height: 0.02 }, confidence: 0.5 },
    // Near full page background (width >= 0.98, height >= 0.98)
    { id: "c2", kind: "image", bounds: { x: 0, y: 0, width: 0.99, height: 0.99 }, confidence: 0.9 },
    // Valid candidate A
    { id: "c3", kind: "image", bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 }, confidence: 0.8 },
    // Near duplicate candidate B (IoU > 0.7 with c3)
    { id: "c4", kind: "image", bounds: { x: 0.11, y: 0.11, width: 0.39, height: 0.39 }, confidence: 0.7 },
  ];

  const filtered = filterCandidates(candidates);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "c3");
});

test("detectPageRegions combines text and image candidates safely", () => {
  const viewport = { width: 1000, height: 800 };
  const textContent = {
    items: [
      { str: "Header Title", transform: [16, 0, 0, 16, 100, 750], width: 150, height: 16 },
      { str: "Subtext line", transform: [12, 0, 0, 12, 100, 720], width: 100, height: 12 },
    ],
  };
  const operatorList = {
    fnArray: [],
    argsArray: [],
    images: [
      { id: "img1", x: 500, y: 100, width: 400, height: 500 },
    ],
  };

  const result = detectPageRegions({
    pageNumber: 2,
    viewport,
    textContent,
    operatorList,
  });

  assert.ok(Array.isArray(result));
  assert.ok(result.length >= 2);
  assert.ok(result.some((c) => c.kind === "text"));
  assert.ok(result.some((c) => c.kind === "image"));
  for (const c of result) {
    assert.ok(c.id);
    assert.ok(c.kind);
    assert.ok(c.bounds);
    assert.ok(c.label);
    assert.ok(c.confidence >= 0 && c.confidence <= 1);
  }
});
