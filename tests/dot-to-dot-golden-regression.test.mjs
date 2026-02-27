import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DOT_TO_DOT_AUDIENCE_PROFILES,
  buildBestDotToDotPath,
  getDotToDotPathMetrics
} from '../lib/dot-to-dot-core.js';

const THEMES = [
  'farm friends',
  'space adventure',
  'ocean animals',
  'dinosaurs',
  'construction trucks',
  'woodland forest',
  'jungle safari',
  'princess castle',
  'unicorn dreams',
  'holiday magic',
  'halloween party',
  'winter wonderland',
  'garden flowers',
  'pets and puppies',
  'city vehicles',
  'bugs and butterflies',
  'underwater reef',
  'superhero action',
  'sports challenge',
  'mythical creatures'
];

const BOUNDS = { x: 80, y: 90, w: 280, h: 320 };

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function fnv1aHash(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function createPolygon({ cx, cy, rx, ry, points, rotation }) {
  const result = [];
  for (let i = 0; i < points; i += 1) {
    const angle = rotation + (i / points) * Math.PI * 2;
    const wobble = i % 2 === 0 ? 1 : 0.72;
    result.push([cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble]);
  }
  return result;
}

function buildThemeRegions(theme, difficultyId) {
  const seed = fnv1aHash(`${theme}|${difficultyId}`);
  const random = seededRandom(seed);

  const cx = BOUNDS.x + BOUNDS.w * (0.42 + random() * 0.16);
  const cy = BOUNDS.y + BOUNDS.h * (0.44 + random() * 0.12);
  const r = BOUNDS.w * (0.2 + random() * 0.08);
  const rx = BOUNDS.w * (0.24 + random() * 0.1);
  const ry = BOUNDS.h * (0.16 + random() * 0.08);
  const polySides = 5 + Math.floor(random() * 5);

  return [
    { kind: 'circle', cx, cy, r },
    { kind: 'ellipse', cx: cx + (random() - 0.5) * 40, cy: cy + (random() - 0.5) * 44, rx, ry },
    {
      kind: 'polygon',
      points: createPolygon({
        cx: cx + (random() - 0.5) * 34,
        cy: cy + (random() - 0.5) * 34,
        rx: BOUNDS.w * (0.16 + random() * 0.08),
        ry: BOUNDS.h * (0.14 + random() * 0.06),
        points: polySides,
        rotation: random() * Math.PI
      })
    }
  ];
}

function fingerprintPoints(points, metrics) {
  const rounded = points.slice(0, 24).map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join('|');
  const payload = `${rounded}|${metrics.crossingCount}|${metrics.qualityScore}|${points.length}`;
  return fnv1aHash(payload).toString(16).padStart(8, '0');
}

test('golden regression across 20 themes x 3 difficulty bands', () => {
  const difficulties = ['early', 'kids', 'advanced'];
  const fingerprints = [];

  THEMES.forEach((theme) => {
    difficulties.forEach((difficultyId) => {
      const difficulty = DOT_TO_DOT_AUDIENCE_PROFILES[difficultyId];
      const targetDots = Math.round((difficulty.minDots + difficulty.maxDots) / 2);
      const regions = buildThemeRegions(theme, difficultyId);
      const random = seededRandom(fnv1aHash(`path:${theme}:${difficultyId}`));

      const points = buildBestDotToDotPath({
        absoluteRegions: regions,
        targetDots,
        minGapPx: difficulty.minGapPx,
        bounds: BOUNDS,
        attempts: 6,
        randomFn: random
      }).map((point, index) => ({ ...point, label: index + 1 }));

      const metrics = getDotToDotPathMetrics(points, { targetMinGapPx: difficulty.minGapPx });
      const key = `${theme}:${difficultyId}`;

      assert.equal(points.length, targetDots, `${key} should hit target dots`);
      assert.equal(metrics.contiguousLabels, true, `${key} labels should stay contiguous`);
      assert.ok(metrics.qualityScore >= 35, `${key} quality too low: ${metrics.qualityScore}`);
      assert.ok(metrics.crossingCount <= 120, `${key} crossings too high: ${metrics.crossingCount}`);

      fingerprints.push(`${key}=${fingerprintPoints(points, metrics)}`);
    });
  });

  const digest = fnv1aHash(fingerprints.join(';')).toString(16);
  assert.equal(digest, '2fa4d1e8');
});
