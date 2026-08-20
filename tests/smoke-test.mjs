import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const css = readFileSync(resolve(root, "styles.css"), "utf8");
const js = readFileSync(resolve(root, "app.js"), "utf8");

const requiredPanels = [
  "dashboard",
  "data-lab",
  "linear-lab",
  "perceptron-lab",
  "activation-lab",
  "network-lab",
  "optimizer-lab",
  "regularization-lab",
  "cnn-lab",
  "sequence-lab",
  "quiz-lab"
];

for (const id of requiredPanels) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `Missing panel: ${id}`);
  if (id !== "dashboard") {
    assert.match(html, new RegExp(`data-target=["']${id}["']`), `Missing navigation item: ${id}`);
  }
}

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "HTML contains duplicate IDs");

const jsIdReferences = [...js.matchAll(/\$\("#([A-Za-z0-9_-]+)"/g)].map((match) => match[1]);
for (const id of new Set(jsIdReferences)) {
  assert.ok(ids.includes(id), `JavaScript references missing HTML ID: ${id}`);
}

assert.ok((html.match(/<canvas\b/g) || []).length >= 10, "Expected at least ten interactive canvases");
assert.match(html, /<meta name="viewport"/, "Missing responsive viewport metadata");
assert.match(css, /prefers-reduced-motion/, "Missing reduced-motion support");
assert.match(css, /@media \(max-width: 640px\)/, "Missing mobile layout breakpoint");
assert.match(js, /localStorage/, "Missing local progress persistence");
assert.match(js, /function convolve\(/, "Missing CNN convolution implementation");
assert.match(js, /trainPerceptronEpoch/, "Missing perceptron training implementation");
assert.match(js, /surfaceGrad/, "Missing optimizer gradient implementation");

console.log(`✓ ${requiredPanels.length} application panels found`);
console.log(`✓ ${ids.length} unique element IDs validated`);
console.log(`✓ ${(html.match(/<canvas\b/g) || []).length} interactive canvases found`);
console.log("✓ Responsive, persistence, and simulation checks passed");
