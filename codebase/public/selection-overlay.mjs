const CANDIDATE_KINDS = new Set(["image", "text", "vector"]);

export function createSelectionOverlay({
  container,
  onSelect,
  documentRef = globalThis.document,
}) {
  if (!container || typeof container.appendChild !== "function") {
    throw new TypeError("container must be a DOM element");
  }
  if (typeof onSelect !== "function") {
    throw new TypeError("onSelect must be a function");
  }
  if (!documentRef || typeof documentRef.createElement !== "function") {
    throw new TypeError("documentRef must provide createElement");
  }

  const root = documentRef.createElement("div");
  root.classList.add("selection-overlay");
  root.setAttribute("aria-label", "Các vùng nội dung được gợi ý");
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  container.appendChild(root);

  let enabled = false;
  let destroyed = false;
  let buttons = [];

  function assertActive() {
    if (destroyed) throw new Error("Selection overlay has been destroyed");
  }

  function render(candidates) {
    assertActive();
    const validated = validateCandidates(candidates);
    const nextButtons = validated.map((candidate) => createCandidateButton({
      candidate,
      documentRef,
      disabled: !enabled,
      onSelect,
    }));
    root.replaceChildren(...nextButtons);
    buttons = nextButtons;
  }

  function setEnabled(nextEnabled) {
    assertActive();
    if (typeof nextEnabled !== "boolean") {
      throw new TypeError("enabled state must be a boolean");
    }
    enabled = nextEnabled;
    root.hidden = !enabled;
    root.setAttribute("aria-hidden", String(!enabled));
    root.classList.toggle("selection-overlay--enabled", enabled);
    buttons.forEach((button) => {
      button.disabled = !enabled;
    });
  }

  function clear() {
    assertActive();
    root.replaceChildren();
    buttons = [];
  }

  function destroy() {
    if (destroyed) return;
    root.replaceChildren();
    root.remove();
    buttons = [];
    destroyed = true;
  }

  return {
    element: root,
    render,
    setEnabled,
    clear,
    destroy,
  };
}

export function createSelectionIndicator({
  container,
  documentRef = globalThis.document,
}) {
  if (!container || typeof container.appendChild !== "function") {
    throw new TypeError("container must be a DOM element");
  }
  if (!documentRef || typeof documentRef.createElement !== "function") {
    throw new TypeError("documentRef must provide createElement");
  }

  const root = documentRef.createElement("div");
  root.classList.add("selection-indicator");
  root.setAttribute("aria-hidden", "true");
  const selected = documentRef.createElement("div");
  selected.classList.add("selection-indicator__selected");
  selected.hidden = true;
  const preview = documentRef.createElement("div");
  preview.classList.add("selection-indicator__preview");
  preview.hidden = true;
  root.appendChild(selected);
  root.appendChild(preview);
  container.appendChild(root);
  let destroyed = false;

  function assertActive() {
    if (destroyed) throw new Error("Selection indicator has been destroyed");
  }

  function showSelection(selection) {
    assertActive();
    if (!selection || !isNormalizedBounds(selection.bounds)) {
      throw new TypeError("selection must provide normalized bounds");
    }
    positionElement(selected, selection.bounds);
    selected.setAttribute("data-selection-source", selection.source || "");
    selected.setAttribute("title", selection.label || "Vùng đã chọn");
    selected.hidden = false;
  }

  function showPreview(bounds) {
    assertActive();
    if (bounds === null) {
      preview.hidden = true;
      return;
    }
    if (!isNormalizedBounds(bounds)) {
      throw new TypeError("preview must provide normalized bounds");
    }
    positionElement(preview, bounds);
    preview.hidden = false;
  }

  function clear() {
    assertActive();
    selected.hidden = true;
    preview.hidden = true;
    selected.setAttribute("data-selection-source", "");
  }

  function destroy() {
    if (destroyed) return;
    root.remove();
    destroyed = true;
  }

  return {
    element: root,
    showSelection,
    showPreview,
    clear,
    destroy,
  };
}

function createCandidateButton({
  candidate,
  documentRef,
  disabled,
  onSelect,
}) {
  const button = documentRef.createElement("button");
  button.type = "button";
  button.tabIndex = 0;
  button.disabled = disabled;
  button.classList.add("selection-overlay__candidate");
  button.setAttribute("aria-label", `Chọn ${candidate.label}`);
  button.setAttribute("title", candidate.label);
  button.setAttribute("data-candidate-id", candidate.id);
  button.setAttribute("data-candidate-kind", candidate.kind);
  button.setAttribute("data-confidence", String(candidate.confidence));
  button.style.left = toPercentage(candidate.bounds.x);
  button.style.top = toPercentage(candidate.bounds.y);
  button.style.width = toPercentage(candidate.bounds.width);
  button.style.height = toPercentage(candidate.bounds.height);

  const label = documentRef.createElement("span");
  label.classList.add("selection-overlay__label");
  label.textContent = candidate.label;
  button.appendChild(label);

  button.addEventListener("click", () => {
    if (button.disabled) return;
    onSelect(cloneCandidate(candidate));
  });
  return button;
}

function validateCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    throw new TypeError("candidates must be an array");
  }

  const ids = new Set();
  const validated = candidates.map((candidate) => {
    validateCandidate(candidate);
    if (ids.has(candidate.id)) throw new TypeError("candidate IDs must be unique");
    ids.add(candidate.id);
    return cloneCandidate(candidate);
  });
  return validated;
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("candidate must be an object");
  }
  if (typeof candidate.id !== "string" || !candidate.id.trim()) {
    throw new TypeError("candidate id must be a non-empty string");
  }
  if (!CANDIDATE_KINDS.has(candidate.kind)) {
    throw new TypeError("candidate kind must be image, text, or vector");
  }
  if (typeof candidate.label !== "string" || !candidate.label.trim()) {
    throw new TypeError("candidate label must be a non-empty string");
  }
  if (
    !Number.isFinite(candidate.confidence)
    || candidate.confidence < 0
    || candidate.confidence > 1
  ) {
    throw new TypeError("candidate confidence must be between 0 and 1");
  }
  if (!isNormalizedBounds(candidate.bounds)) {
    throw new TypeError("candidate bounds must be inside the normalized page");
  }
}

function isNormalizedBounds(bounds) {
  const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height];
  return values.every(Number.isFinite)
    && bounds.x >= 0
    && bounds.y >= 0
    && bounds.width > 0
    && bounds.height > 0
    && bounds.x + bounds.width <= 1
    && bounds.y + bounds.height <= 1;
}

function cloneCandidate(candidate) {
  return {
    id: candidate.id,
    kind: candidate.kind,
    bounds: { ...candidate.bounds },
    label: candidate.label,
    confidence: candidate.confidence,
  };
}

function toPercentage(value) {
  return `${Number((value * 100).toFixed(6))}%`;
}

function positionElement(element, bounds) {
  element.style.left = toPercentage(bounds.x);
  element.style.top = toPercentage(bounds.y);
  element.style.width = toPercentage(bounds.width);
  element.style.height = toPercentage(bounds.height);
}
