import assert from "node:assert/strict";
import test from "node:test";
import { extractPdfContext } from "../public/pdf-context.mjs";

function makeCanvas({ width = 2000, height = 1000 } = {}) {
  const calls = [];
  const context = {
    drawImage(...args) {
      calls.push(args);
    },
  };
  return {
    width,
    height,
    calls,
    getContext() {
      return context;
    },
    toDataURL(type) {
      assert.equal(type, "image/png");
      return "data:image/png;base64,Y3JvcA==";
    },
  };
}

function makeTextLayer(spans, rect = { left: 0, top: 0, width: 1000, height: 500 }) {
  return {
    getBoundingClientRect() {
      return rect;
    },
    querySelectorAll(selector) {
      assert.equal(selector, "span");
      return spans;
    },
  };
}

function span(text, rect) {
  return {
    textContent: text,
    getBoundingClientRect() {
      return rect;
    },
  };
}

const selection = {
  pageNumber: 2,
  source: "snip",
  bounds: { x: 0.1, y: 0.2, width: 0.4, height: 0.5 },
  label: "Vùng tự chọn",
  text: "",
  needsOcr: false,
};

test("crops the PDF canvas in source pixels and caps encoded output", async () => {
  const sourceCanvas = makeCanvas({ width: 4000, height: 2000 });
  const cropCanvas = makeCanvas({ width: 1, height: 1 });
  const result = await extractPdfContext({
    pageNumber: 2,
    canvas: sourceCanvas,
    textLayer: makeTextLayer([]),
    createCanvas: () => cropCanvas,
  }, selection);

  assert.deepEqual(result.pixelBounds, {
    x: 400,
    y: 400,
    width: 1600,
    height: 1000,
  });
  assert.equal(result.mediaType, "image/png");
  assert.equal(result.imageData, "Y3JvcA==");
  assert.equal(result.needsOcr, true);
  assert.deepEqual(cropCanvas.calls, [[sourceCanvas, 400, 400, 1600, 1000, 0, 0, 1400, 875]]);
});

test("extracts only text spans intersecting the normalized selection", async () => {
  const result = await extractPdfContext({
    pageNumber: 2,
    canvas: makeCanvas({ width: 1000, height: 500 }),
    textLayer: makeTextLayer([
      span("outside", { left: 0, top: 0, width: 80, height: 20 }),
      span("inside one", { left: 150, top: 120, width: 120, height: 24 }),
      span("partial", { left: 490, top: 200, width: 40, height: 24 }),
      span("outside below", { left: 200, top: 400, width: 80, height: 20 }),
    ]),
    createCanvas: () => makeCanvas({ width: 400, height: 250 }),
  }, selection);

  assert.equal(result.text, "inside one partial");
  assert.equal(result.needsOcr, false);
});

test("waits for rendering before cropping and rejects a stale request", async () => {
  let resolveRender;
  const renderPromise = new Promise((resolve) => {
    resolveRender = resolve;
  });
  const sourceCanvas = makeCanvas();
  const cropCanvas = makeCanvas();
  const pending = extractPdfContext({
    pageNumber: 2,
    canvas: sourceCanvas,
    textLayer: makeTextLayer([]),
    renderPromise,
    createCanvas: () => cropCanvas,
  }, selection);

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cropCanvas.calls.length, 0);
  resolveRender();
  await pending;
  assert.equal(cropCanvas.calls.length, 1);

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    extractPdfContext({
      pageNumber: 2,
      canvas: sourceCanvas,
      textLayer: makeTextLayer([]),
      signal: controller.signal,
      createCanvas: () => cropCanvas,
    }, selection),
    (error) => error.name === "AbortError",
  );
});

test("keeps text and pixel bounds stable across CSS scales", async () => {
  const sourceCanvas = makeCanvas({ width: 2000, height: 1000 });
  const extractAtScale = (scale) => extractPdfContext({
    pageNumber: 2,
    canvas: sourceCanvas,
    textLayer: makeTextLayer([
      span("stable", {
        left: 150 * scale,
        top: 120 * scale,
        width: 100 * scale,
        height: 20 * scale,
      }),
    ], {
      left: 0,
      top: 0,
      width: 1000 * scale,
      height: 500 * scale,
    }),
    createCanvas: () => makeCanvas(),
  }, selection);

  const small = await extractAtScale(0.6);
  const large = await extractAtScale(1.5);
  assert.deepEqual(small.pixelBounds, large.pixelBounds);
  assert.equal(small.text, "stable");
  assert.equal(large.text, "stable");
});

test("aborts while waiting for a page render", async () => {
  const controller = new AbortController();
  const pending = extractPdfContext({
    pageNumber: 2,
    canvas: makeCanvas(),
    textLayer: makeTextLayer([]),
    renderPromise: new Promise(() => {}),
    signal: controller.signal,
    createCanvas: () => makeCanvas(),
  }, selection);

  controller.abort();
  await assert.rejects(pending, (error) => error.name === "AbortError");
});

test("rejects wrong-page, blank-canvas, and PNG encoding failures", async () => {
  await assert.rejects(
    extractPdfContext({
      pageNumber: 1,
      canvas: makeCanvas(),
      textLayer: makeTextLayer([]),
      createCanvas: () => makeCanvas(),
    }, selection),
    /page/i,
  );
  await assert.rejects(
    extractPdfContext({
      pageNumber: 2,
      canvas: makeCanvas({ width: 0, height: 100 }),
      textLayer: makeTextLayer([]),
      createCanvas: () => makeCanvas(),
    }, selection),
    /canvas/i,
  );
  const output = makeCanvas();
  output.toDataURL = () => "data:image/png;base64,";
  await assert.rejects(
    extractPdfContext({
      pageNumber: 2,
      canvas: makeCanvas(),
      textLayer: makeTextLayer([]),
      createCanvas: () => output,
    }, selection),
    /encode/i,
  );
});
