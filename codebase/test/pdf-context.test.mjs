import assert from "node:assert/strict";
import test from "node:test";

import {
  extractIntersectingText,
  extractPdfContext,
  normalizedBoundsToPixels,
} from "../public/pdf-context.mjs";

function createSourceCanvas({ width = 1000, height = 500 } = {}) {
  return {
    width,
    height,
    clientWidth: 400,
    clientHeight: 200,
    classList: { contains: (name) => name === "pdf-canvas" },
  };
}

function createCanvasFactory(record) {
  return () => ({
    width: 0,
    height: 0,
    getContext() {
      return {
        drawImage(...args) {
          record.push(args);
        },
      };
    },
    toDataURL() {
      return "data:image/png;base64,Y3JvcA==";
    },
  });
}

const selection = {
  pageNumber: 2,
  source: "snip",
  bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  label: "Vùng cắt",
  text: "",
  needsOcr: false,
};

test("maps normalized bounds to source pixels independently of CSS zoom", () => {
  assert.deepEqual(
    normalizedBoundsToPixels(selection.bounds, createSourceCanvas()),
    { sx: 100, sy: 100, sw: 300, sh: 200 },
  );
});

test("extracts only intersecting text in reading order", () => {
  const items = [
    { str: "ngoài", bounds: { x: 0.7, y: 0.7, width: 0.1, height: 0.05 } },
    { str: "hai", bounds: { x: 0.25, y: 0.3, width: 0.08, height: 0.04 } },
    { str: "một", bounds: { x: 0.12, y: 0.25, width: 0.08, height: 0.04 } },
  ];
  assert.equal(extractIntersectingText(items, selection.bounds), "một hai");
});

test("waits for rendering, crops the PDF canvas and returns bounded text", async () => {
  const drawCalls = [];
  let rendered = false;
  const renderPromise = Promise.resolve().then(() => { rendered = true; });
  const result = await extractPdfContext({
    canvas: createSourceCanvas(),
    renderPromise,
    textItems: [{ str: "Nội dung trong vùng", bounds: { x: 0.12, y: 0.25, width: 0.2, height: 0.05 } }],
  }, selection, {
    createCanvas: createCanvasFactory(drawCalls),
  });

  assert.equal(rendered, true);
  assert.equal(drawCalls.length, 1);
  assert.deepEqual(drawCalls[0].slice(1, 5), [100, 100, 300, 200]);
  assert.equal(result.imageData, "Y3JvcA==");
  assert.equal(result.mediaType, "image/png");
  assert.equal(result.text, "Nội dung trong vùng");
  assert.equal(result.needsOcr, false);
  assert.deepEqual(result.pixelBounds, { sx: 100, sy: 100, sw: 300, sh: 200 });
});

test("marks a crop for OCR when no usable text intersects", async () => {
  const result = await extractPdfContext({
    canvas: createSourceCanvas(),
    textItems: [{ str: "Ngoài vùng", bounds: { x: 0.8, y: 0.8, width: 0.1, height: 0.05 } }],
  }, selection, {
    createCanvas: createCanvasFactory([]),
  });
  assert.equal(result.text, "");
  assert.equal(result.needsOcr, true);
});

test("limits output dimensions while keeping source pixel bounds", async () => {
  const outputs = [];
  const result = await extractPdfContext({
    canvas: createSourceCanvas({ width: 4000, height: 2000 }),
    textItems: [],
  }, {
    ...selection,
    bounds: { x: 0, y: 0, width: 1, height: 1 },
  }, {
    maxDimension: 1000,
    createCanvas: () => {
      const output = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage() {} }),
        toDataURL: () => "data:image/png;base64,YQ==",
      };
      outputs.push(output);
      return output;
    },
  });
  assert.equal(outputs[0].width, 1000);
  assert.equal(outputs[0].height, 500);
  assert.deepEqual(result.pixelBounds, { sx: 0, sy: 0, sw: 4000, sh: 2000 });
});

test("rejects annotation canvases and aborted work", async () => {
  await assert.rejects(
    () => extractPdfContext({
      canvas: { ...createSourceCanvas(), classList: { contains: () => false } },
      textItems: [],
    }, selection, { createCanvas: createCanvasFactory([]) }),
    /pdf-canvas/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => extractPdfContext({
      canvas: createSourceCanvas(),
      textItems: [],
    }, selection, {
      signal: controller.signal,
      createCanvas: createCanvasFactory([]),
    }),
    (error) => error.name === "AbortError",
  );
});
