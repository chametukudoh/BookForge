import test from 'node:test';
import assert from 'node:assert/strict';

import { extractImageTraceFromImageData } from '../lib/dot-to-dot-image.js';

function makeRgbaImage(width, height, painter) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const shade = painter(x, y);
      data[i] = shade;
      data[i + 1] = shade;
      data[i + 2] = shade;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

test('extracts normalized contour points from high-contrast shape', () => {
  const imageData = makeRgbaImage(180, 180, (x, y) => {
    const dx = x - 90;
    const dy = y - 92;
    const ring = Math.abs(Math.sqrt(dx * dx + dy * dy) - 52) <= 2;
    return ring ? 10 : 250;
  });

  const result = extractImageTraceFromImageData(imageData, {
    edgeQuantile: 0.82,
    minComponentSize: 80,
    maxContourPoints: 800,
    maxGuidePoints: 240
  });

  assert.ok(result.pointsNormalized.length >= 80);
  assert.ok(result.guidePointsNormalized.length >= 30);
  assert.ok(result.pointsNormalized.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1));
});

test('returns empty trace for blank low-edge image', () => {
  const imageData = makeRgbaImage(120, 120, () => 220);
  const result = extractImageTraceFromImageData(imageData, {
    edgeQuantile: 0.9,
    minComponentSize: 60
  });

  assert.equal(result.pointsNormalized.length, 0);
  assert.equal(result.guidePointsNormalized.length, 0);
});
