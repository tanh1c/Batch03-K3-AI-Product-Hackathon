import assert from "node:assert/strict";
import test from "node:test";

import {
  createSnipSelection,
  createSnipTool,
} from "../public/snip-selection.mjs";

class FakeSurface {
  constructor() {
    this.listeners = new Map();
    this.captured = null;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== listener));
  }

  dispatch(type, event) {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }

  getBoundingClientRect() {
    return { left: 100, top: 50, width: 800, height: 500 };
  }

  setPointerCapture(pointerId) {
    this.captured = pointerId;
  }

  releasePointerCapture(pointerId) {
    if (this.captured === pointerId) this.captured = null;
  }
}

function pointer(clientX, clientY, pointerId = 7) {
  return {
    clientX,
    clientY,
    pointerId,
    button: 0,
    preventDefault() {},
  };
}

test("creates a normalized snip selection for forward and reverse drags", () => {
  const pageRect = { left: 100, top: 50, width: 800, height: 500 };
  const forward = createSnipSelection({
    pageNumber: 2,
    start: { x: 180, y: 100 },
    end: { x: 500, y: 300 },
    pageRect,
  });
  const reverse = createSnipSelection({
    pageNumber: 2,
    start: { x: 500, y: 300 },
    end: { x: 180, y: 100 },
    pageRect,
  });

  assert.deepEqual(reverse, forward);
  assert.deepEqual(forward, {
    pageNumber: 2,
    source: "snip",
    bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
    label: "Vùng cắt",
    text: "",
    needsOcr: false,
  });
});

test("clips a drag to the page and ignores tiny regions", () => {
  const pageRect = { left: 100, top: 50, width: 800, height: 500 };
  assert.deepEqual(
    createSnipSelection({
      pageNumber: 1,
      start: { x: 50, y: 0 },
      end: { x: 300, y: 250 },
      pageRect,
    }).bounds,
    { x: 0, y: 0, width: 0.25, height: 0.4 },
  );
  assert.equal(createSnipSelection({
    pageNumber: 1,
    start: { x: 200, y: 200 },
    end: { x: 204, y: 204 },
    pageRect,
    minSize: 0.01,
  }), null);
});

test("emits previews and one selection only while enabled", () => {
  const surface = new FakeSurface();
  const previews = [];
  const selections = [];
  const tool = createSnipTool({
    surface,
    pageNumber: 3,
    onPreview: (bounds) => previews.push(bounds),
    onSelection: (selection) => selections.push(selection),
  });

  surface.dispatch("pointerdown", pointer(180, 100));
  assert.equal(selections.length, 0);

  tool.setEnabled(true);
  surface.dispatch("pointerdown", pointer(180, 100));
  surface.dispatch("pointermove", pointer(500, 300));
  surface.dispatch("pointerup", pointer(500, 300));

  assert.equal(previews.length >= 2, true);
  assert.equal(previews.at(-1), null);
  assert.equal(selections.length, 1);
  assert.equal(selections[0].source, "snip");
  assert.equal(surface.captured, null);
});

test("a tiny drag reports invalid without replacing a selection", () => {
  const surface = new FakeSurface();
  const selections = [];
  let invalid = 0;
  const tool = createSnipTool({
    surface,
    pageNumber: 1,
    onSelection: (selection) => selections.push(selection),
    onInvalid: () => { invalid += 1; },
  });
  tool.setEnabled(true);
  surface.dispatch("pointerdown", pointer(200, 200));
  surface.dispatch("pointerup", pointer(203, 203));
  assert.equal(selections.length, 0);
  assert.equal(invalid, 1);
});

test("cancel and destroy release transient pointer work", () => {
  const surface = new FakeSurface();
  const previews = [];
  const tool = createSnipTool({
    surface,
    pageNumber: 1,
    onSelection() {},
    onPreview: (bounds) => previews.push(bounds),
  });
  tool.setEnabled(true);
  surface.dispatch("pointerdown", pointer(200, 200));
  surface.dispatch("pointercancel", pointer(220, 220));
  assert.equal(previews.at(-1), null);
  assert.equal(surface.captured, null);

  tool.destroy();
  surface.dispatch("pointerdown", pointer(200, 200));
  surface.dispatch("pointerup", pointer(500, 300));
  assert.equal(surface.captured, null);
});
