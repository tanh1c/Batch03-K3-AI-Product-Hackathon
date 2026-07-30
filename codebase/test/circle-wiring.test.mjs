import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

test("converts a completed Circle annotation to the shared C0 selection", () => {
  assert.match(
    appSource,
    /import \{ circlePointsToBounds, createSelection \} from "\/selection-geometry\.mjs"/,
  );

  const circleBridge = appSource.slice(
    appSource.indexOf("function showRegionPopover"),
    appSource.indexOf("function hideRegionPopover"),
  );

  assert.match(circleBridge, /circlePointsToBounds\(annotation\.points, 0\.025\)/);
  assert.match(circleBridge, /createSelection\(\{[\s\S]*source: "circle"/);
  assert.match(circleBridge, /label: "Vùng khoanh"/);
  assert.match(circleBridge, /state\.activeRegion = \{[\s\S]*selection/);
});

test("keeps Circle creation local until explicit integration submits it", () => {
  const circlePointerSection = appSource.slice(
    appSource.indexOf("function setupAnnotationLayer"),
    appSource.indexOf("function resizeAnnotationCanvas"),
  );

  assert.doesNotMatch(
    circlePointerSection,
    /fetch\(|sendVisualQuestion|sendTextQuestion|cropSelectedRegion/,
  );
  assert.doesNotMatch(appSource, /html2canvas|boundsFromPoints/);
});
