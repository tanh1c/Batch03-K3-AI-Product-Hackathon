import {
  createSelection,
  rectToNormalizedBounds,
} from "../src/selection-geometry.mjs";

export const MIN_SELECTION_SIZE = 0.01;

export function createSnipSelection({
  pageNumber,
  start,
  end,
  pageRect,
  minSize = MIN_SELECTION_SIZE,
  label = "Vùng cắt",
}) {
  if (!Number.isFinite(minSize) || minSize <= 0 || minSize >= 1) {
    throw new TypeError("minSize must be between 0 and 1");
  }
  const bounds = rectToNormalizedBounds(start, end, pageRect);
  if (bounds.width < minSize || bounds.height < minSize) return null;
  return createSelection({
    pageNumber,
    source: "snip",
    bounds,
    label,
  });
}

export function createSnipTool({
  surface,
  pageNumber,
  onSelection,
  onPreview = () => {},
  onInvalid = () => {},
  minSize = MIN_SELECTION_SIZE,
}) {
  if (!surface || typeof surface.addEventListener !== "function") {
    throw new TypeError("surface must be an event target");
  }
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new TypeError("pageNumber must be a positive integer");
  }
  if (typeof onSelection !== "function") {
    throw new TypeError("onSelection must be a function");
  }
  if (typeof onPreview !== "function" || typeof onInvalid !== "function") {
    throw new TypeError("preview and invalid callbacks must be functions");
  }

  let enabled = false;
  let destroyed = false;
  let active = null;

  function previewFor(end) {
    try {
      return rectToNormalizedBounds(active.start, end, surface.getBoundingClientRect());
    } catch {
      return null;
    }
  }

  function pointerDown(event) {
    if (!enabled || destroyed || event.button !== 0) return;
    event.preventDefault();
    active = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
    };
    surface.setPointerCapture?.(event.pointerId);
    onPreview(null);
  }

  function pointerMove(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    event.preventDefault();
    onPreview(previewFor({ x: event.clientX, y: event.clientY }));
  }

  function finish(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    event.preventDefault();
    const current = active;
    active = null;
    surface.releasePointerCapture?.(current.pointerId);
    onPreview(null);
    try {
      const selection = createSnipSelection({
        pageNumber,
        start: current.start,
        end: { x: event.clientX, y: event.clientY },
        pageRect: surface.getBoundingClientRect(),
        minSize,
      });
      if (selection) onSelection(selection);
      else onInvalid();
    } catch {
      onInvalid();
    }
  }

  function cancel() {
    if (!active) return;
    surface.releasePointerCapture?.(active.pointerId);
    active = null;
    onPreview(null);
  }

  function pointerCancel(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    cancel();
  }

  surface.addEventListener("pointerdown", pointerDown);
  surface.addEventListener("pointermove", pointerMove);
  surface.addEventListener("pointerup", finish);
  surface.addEventListener("pointercancel", pointerCancel);

  return {
    setEnabled(nextEnabled) {
      if (destroyed) throw new Error("Snip tool has been destroyed");
      if (typeof nextEnabled !== "boolean") {
        throw new TypeError("enabled state must be a boolean");
      }
      enabled = nextEnabled;
      if (!enabled) cancel();
    },
    cancel,
    destroy() {
      if (destroyed) return;
      cancel();
      surface.removeEventListener("pointerdown", pointerDown);
      surface.removeEventListener("pointermove", pointerMove);
      surface.removeEventListener("pointerup", finish);
      surface.removeEventListener("pointercancel", pointerCancel);
      destroyed = true;
    },
  };
}
