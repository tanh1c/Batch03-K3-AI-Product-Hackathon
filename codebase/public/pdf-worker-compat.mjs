export function installPdfWorkerCompatibility() {
  if (Uint8Array.prototype.toHex) return;
  Object.defineProperty(Uint8Array.prototype, "toHex", {
    configurable: true,
    writable: true,
    value() {
      return Array.from(this, (byte) => byte.toString(16).padStart(2, "0")).join("");
    },
  });
}

installPdfWorkerCompatibility();

if (typeof postMessage === "function") await import("/vendor/pdf.worker.mjs");
