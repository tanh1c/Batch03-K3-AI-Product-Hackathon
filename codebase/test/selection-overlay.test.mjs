import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createSelectionOverlay } from "../public/selection-overlay.mjs";
import { selectionCandidates } from "./fixtures/selection-candidates.mjs";

class FakeClassList {
  #values = new Set();

  add(...values) {
    values.forEach((value) => this.#values.add(value));
  }

  remove(...values) {
    values.forEach((value) => this.#values.delete(value));
  }

  toggle(value, force) {
    const enabled = force ?? !this.#values.has(value);
    if (enabled) this.#values.add(value);
    else this.#values.delete(value);
    return enabled;
  }

  contains(value) {
    return this.#values.has(value);
  }

  toString() {
    return [...this.#values].join(" ");
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.style = {};
    this.parentNode = null;
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = -1;
    this.textContent = "";
    this.type = "";
    this.listeners = new Map();
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
    children.forEach((child) => this.appendChild(child));
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click() {
    if (this.disabled) return;
    for (const listener of this.listeners.get("click") || []) {
      listener({ currentTarget: this, target: this });
    }
  }
}

class FakeDocument {
  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

function setup(onSelect = () => {}) {
  const documentRef = new FakeDocument();
  const container = documentRef.createElement("div");
  const overlay = createSelectionOverlay({ container, onSelect, documentRef });
  return { container, overlay };
}

test("renders normalized candidates as disabled native buttons by default", () => {
  const { container, overlay } = setup();
  overlay.render(selectionCandidates);

  assert.equal(container.children.length, 1);
  assert.equal(overlay.element.hidden, true);
  assert.equal(overlay.element.getAttribute("aria-hidden"), "true");
  assert.equal(overlay.element.children.length, 2);

  const imageButton = overlay.element.children[0];
  assert.equal(imageButton.tagName, "BUTTON");
  assert.equal(imageButton.type, "button");
  assert.equal(imageButton.tabIndex, 0);
  assert.equal(imageButton.disabled, true);
  assert.equal(imageButton.getAttribute("aria-label"), "Chọn Vùng hình 1");
  assert.equal(imageButton.getAttribute("data-candidate-id"), "page-2-image-1");
  assert.equal(imageButton.getAttribute("data-candidate-kind"), "image");
  assert.equal(imageButton.getAttribute("data-confidence"), "0.8");
  assert.deepEqual(imageButton.style, {
    left: "10%",
    top: "20%",
    width: "30%",
    height: "40%",
  });
  assert.equal(imageButton.children[0].textContent, "Vùng hình 1");
});

test("enables the overlay and emits a copy of the selected candidate", () => {
  const selected = [];
  const { overlay } = setup((candidate) => selected.push(candidate));
  overlay.render(selectionCandidates);

  overlay.element.children[0].click();
  assert.equal(selected.length, 0);

  overlay.setEnabled(true);
  assert.equal(overlay.element.hidden, false);
  assert.equal(overlay.element.getAttribute("aria-hidden"), "false");
  assert.equal(overlay.element.children[0].disabled, false);
  assert.equal(overlay.element.classList.contains("selection-overlay--enabled"), true);

  overlay.element.children[0].click();
  assert.deepEqual(selected, [selectionCandidates[0]]);
  assert.notEqual(selected[0], selectionCandidates[0]);
  assert.notEqual(selected[0].bounds, selectionCandidates[0].bounds);
});

test("replaces old candidates and clears without removing the overlay root", () => {
  const { container, overlay } = setup();
  overlay.render(selectionCandidates);
  const root = overlay.element;

  overlay.render([selectionCandidates[1]]);
  assert.equal(root.children.length, 1);
  assert.equal(root.children[0].getAttribute("data-candidate-id"), "page-2-text-1");

  overlay.clear();
  assert.equal(root.children.length, 0);
  assert.equal(container.children[0], root);
});

test("rejects invalid or duplicate candidates before changing the overlay", () => {
  const { overlay } = setup();
  overlay.render(selectionCandidates);

  assert.throws(
    () => overlay.render([{ ...selectionCandidates[0], kind: "audio" }]),
    /candidate kind/,
  );
  assert.throws(
    () => overlay.render([{ ...selectionCandidates[0], bounds: { x: 0.9, y: 0, width: 0.2, height: 1 } }]),
    /candidate bounds/,
  );
  assert.throws(
    () => overlay.render([selectionCandidates[0], { ...selectionCandidates[0] }]),
    /candidate IDs must be unique/,
  );
  assert.equal(overlay.element.children.length, 2);
});

test("destroy removes the package-owned DOM and prevents reuse", () => {
  const { container, overlay } = setup();
  overlay.render(selectionCandidates);
  overlay.destroy();

  assert.equal(container.children.length, 0);
  assert.throws(() => overlay.render(selectionCandidates), /destroyed/);
  assert.doesNotThrow(() => overlay.destroy());
});

test("scoped stylesheet protects PDF interactions and keyboard focus", async () => {
  const css = await readFile(new URL("../public/selection-overlay.css", import.meta.url), "utf8");
  assert.match(css, /\.selection-overlay\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.selection-overlay__candidate\s*\{[^}]*pointer-events:\s*auto/s);
  assert.match(css, /\.selection-overlay__candidate:focus-visible/);
  assert.match(css, /\.selection-overlay--enabled \.selection-overlay__candidate\[data-candidate-kind="text"\]/);
  assert.doesNotMatch(css, /(^|\n)\s*(button|canvas|\.page-shell)\s*\{/);
});
