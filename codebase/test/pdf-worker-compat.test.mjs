import assert from "node:assert/strict";
import test from "node:test";

import { installPdfWorkerCompatibility } from "../public/pdf-worker-compat.mjs";

test("installs the Uint8Array toHex method required by PDF.js", () => {
  const original = Uint8Array.prototype.toHex;

  try {
    delete Uint8Array.prototype.toHex;
    installPdfWorkerCompatibility();

    assert.equal(new Uint8Array([0, 15, 16, 255]).toHex(), "000f10ff");
  } finally {
    if (original) Uint8Array.prototype.toHex = original;
    else delete Uint8Array.prototype.toHex;
  }
});
