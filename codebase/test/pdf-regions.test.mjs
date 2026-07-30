import assert from "node:assert/strict";
import test from "node:test";

import {
  detectImageCandidates,
  detectPageRegions,
  detectTextCandidates,
  filterCandidates,
} from "../public/pdf-regions.mjs";

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
