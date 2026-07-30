import {
  circlePointsToBounds,
  createSelection,
} from "../src/selection-geometry.mjs";

export function createCircleSelection({
  pageNumber,
  points,
  padding = 0.02,
  label = "Vùng khoanh",
}) {
  const bounds = Object.fromEntries(
    Object.entries(circlePointsToBounds(points, padding))
      .map(([key, value]) => [key, Number(value.toFixed(12))]),
  );
  return createSelection({
    pageNumber,
    source: "circle",
    bounds,
    label,
  });
}
