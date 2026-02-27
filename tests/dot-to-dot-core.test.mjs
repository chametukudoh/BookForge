import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DOT_TO_DOT_AUDIENCE_PROFILES,
  buildBestDotToDotPath,
  getDotToDotDifficulty,
  getDotToDotPathMetrics
} from '../lib/dot-to-dot-core.js';

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test('difficulty profiles support legacy aliases and new audience bands', () => {
  assert.equal(getDotToDotDifficulty('beginner').id, 'early');
  assert.equal(getDotToDotDifficulty('easy').id, 'kids');
  assert.equal(getDotToDotDifficulty('hard').id, 'advanced');
  assert.equal(getDotToDotDifficulty('unknown').id, 'kids');
  assert.equal(DOT_TO_DOT_AUDIENCE_PROFILES.advanced.maxDots, 600);
});

test('fallback path generation returns exact point count when no regions are provided', () => {
  const points = buildBestDotToDotPath({
    absoluteRegions: [],
    targetDots: 48,
    minGapPx: 10,
    bounds: { x: 100, y: 100, w: 240, h: 260 },
    attempts: 3,
    randomFn: seededRandom(42)
  });

  assert.equal(points.length, 48);
  assert.ok(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
});

test('metrics detect path crossings correctly', () => {
  const crossingPath = [
    { x: 0, y: 0, label: 1 },
    { x: 2, y: 2, label: 2 },
    { x: 0, y: 2, label: 3 },
    { x: 2, y: 0, label: 4 }
  ];
  const cleanPath = [
    { x: 0, y: 0, label: 1 },
    { x: 1, y: 0.5, label: 2 },
    { x: 2, y: 1.5, label: 3 },
    { x: 3, y: 2, label: 4 }
  ];

  const crossingMetrics = getDotToDotPathMetrics(crossingPath, { targetMinGapPx: 1 });
  const cleanMetrics = getDotToDotPathMetrics(cleanPath, { targetMinGapPx: 1 });
  assert.equal(crossingMetrics.crossingCount, 1);
  assert.equal(crossingMetrics.contiguousLabels, true);
  assert.ok(crossingMetrics.qualityScore < cleanMetrics.qualityScore);
});

test('best path generation produces high-quality non-trivial output for a simple region', () => {
  const points = buildBestDotToDotPath({
    absoluteRegions: [{ kind: 'circle', cx: 220, cy: 250, r: 130 }],
    targetDots: 180,
    minGapPx: 9,
    bounds: { x: 80, y: 90, w: 280, h: 320 },
    attempts: 6,
    randomFn: seededRandom(7)
  }).map((point, index) => ({ ...point, label: index + 1 }));

  assert.equal(points.length, 180);
  const metrics = getDotToDotPathMetrics(points, { targetMinGapPx: 9 });
  const scrambled = [...points].sort((a, b) => (a.label % 2) - (b.label % 2));
  const scrambledMetrics = getDotToDotPathMetrics(scrambled, { targetMinGapPx: 9 });
  assert.equal(metrics.contiguousLabels, true);
  assert.ok(metrics.crossingCount <= 5);
  assert.ok(metrics.minStep > 0);
  assert.ok(metrics.qualityScore > scrambledMetrics.qualityScore);
});
