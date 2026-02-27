import test from "node:test";
import assert from "node:assert/strict";

import {
  createLineArtAssetFromTrace,
  evaluateLineArtTrace,
  normalizeLineArtLibrary,
  selectLineArtAssetsForPages
} from "../lib/dot-to-dot-library.js";

function ringTrace(count = 260) {
  const points = Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 2;
    return { x: 0.5 + Math.cos(t) * 0.32, y: 0.5 + Math.sin(t) * 0.28 };
  });
  return {
    points,
    guidePoints: points.filter((_, i) => i % 6 === 0),
    diagnostics: { componentSize: 900 }
  };
}

test("evaluateLineArtTrace accepts coherent contour traces", () => {
  const result = evaluateLineArtTrace(ringTrace(320));
  assert.equal(result.status, "ready");
  assert.equal(result.reasons.length, 0);
  assert.ok(result.score >= 30);
});

test("normalizeLineArtLibrary deduplicates by signature", () => {
  const a = createLineArtAssetFromTrace("a.png", ringTrace(240));
  const b = createLineArtAssetFromTrace("b.png", ringTrace(240));
  const normalized = normalizeLineArtLibrary([a, b]);
  assert.equal(normalized.length, 1);
});

test("selectLineArtAssetsForPages creates round-robin assignments", () => {
  const assetA = createLineArtAssetFromTrace("a.png", ringTrace(220));
  const assetB = createLineArtAssetFromTrace("b.png", ringTrace(280));
  const assignments = selectLineArtAssetsForPages([assetA, assetB], 5);
  assert.equal(assignments.length, 5);
  assert.equal(assignments[0].id, assignments[2].id);
  assert.equal(assignments[1].id, assignments[3].id);
});

