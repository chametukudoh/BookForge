import test from 'node:test';
import assert from 'node:assert/strict';

import { getExpectedPageSizeIn, getRequiredInsideMarginIn, runKdpPreflight } from '../lib/kdp-preflight.js';

function getItem(result, ruleId) {
  return result.items.find((item) => item.ruleId === ruleId);
}

test('inside margin bands map to KDP thresholds', () => {
  assert.equal(getRequiredInsideMarginIn(24), 0.375);
  assert.equal(getRequiredInsideMarginIn(151), 0.5);
  assert.equal(getRequiredInsideMarginIn(301), 0.625);
  assert.equal(getRequiredInsideMarginIn(501), 0.75);
  assert.equal(getRequiredInsideMarginIn(900), 0.875);
});

test('expected size adds bleed correctly', () => {
  assert.deepEqual(getExpectedPageSizeIn(8.5, 11, false), { widthIn: 8.5, heightIn: 11 });
  assert.deepEqual(getExpectedPageSizeIn(8.5, 11, true), { widthIn: 8.625, heightIn: 11.25 });
});

test('valid paperback input passes with no errors', () => {
  const result = runKdpPreflight({
    trimWidthIn: 8.5,
    trimHeightIn: 11,
    pageWidthIn: 8.5,
    pageHeightIn: 11,
    pageCount: 24,
    bleedEnabled: false,
    margins: {
      insideIn: 0.375,
      outsideIn: 0.25,
      topIn: 0.25,
      bottomIn: 0.25
    },
    lineWidthPt: 0.9,
    fontSizePt: 8,
    readingDirection: 'LTR',
    hasRasterImages: false
  });

  assert.equal(result.summary.errors, 0);
  assert.equal(result.summary.passed, true);
  assert.equal(getItem(result, 'QC-PR-COUNT-EVEN')?.status, 'PASS');
  assert.equal(getItem(result, 'QC-PR-DPI-VECTOR')?.status, 'PASS');
});

test('bleed size mismatch is flagged as hard error', () => {
  const result = runKdpPreflight({
    trimWidthIn: 8.5,
    trimHeightIn: 11,
    pageWidthIn: 8.5,
    pageHeightIn: 11,
    pageCount: 30,
    bleedEnabled: true,
    margins: {
      insideIn: 0.5,
      outsideIn: 0.4,
      topIn: 0.4,
      bottomIn: 0.4
    },
    lineWidthPt: 1,
    fontSizePt: 8,
    readingDirection: 'LTR'
  });

  assert.equal(getItem(result, 'QC-PR-SIZE')?.status, 'FAIL');
  assert.equal(result.summary.passed, false);
});

test('inside margin requirement scales with page count', () => {
  const result = runKdpPreflight({
    trimWidthIn: 8.5,
    trimHeightIn: 11,
    pageWidthIn: 8.5,
    pageHeightIn: 11,
    pageCount: 301,
    bleedEnabled: false,
    margins: {
      insideIn: 0.5,
      outsideIn: 0.25,
      topIn: 0.25,
      bottomIn: 0.25
    },
    lineWidthPt: 1,
    fontSizePt: 8,
    readingDirection: 'LTR'
  });

  assert.equal(getItem(result, 'QC-PR-MARGIN-INSIDE')?.status, 'FAIL');
});

test('raster images below 300 DPI are flagged', () => {
  const result = runKdpPreflight({
    trimWidthIn: 8.5,
    trimHeightIn: 11,
    pageWidthIn: 8.5,
    pageHeightIn: 11,
    pageCount: 32,
    bleedEnabled: false,
    margins: {
      insideIn: 0.375,
      outsideIn: 0.25,
      topIn: 0.25,
      bottomIn: 0.25
    },
    lineWidthPt: 1,
    fontSizePt: 8,
    readingDirection: 'LTR',
    hasRasterImages: true,
    minImageDpi: 240,
    maxImageDpi: 700
  });

  assert.equal(getItem(result, 'QC-PR-DPI-MIN')?.status, 'FAIL');
  assert.equal(getItem(result, 'QC-PR-DPI-MAX')?.status, 'FAIL');
});
