import { clamp, generateLocalId } from "./constants.js";

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pointDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeTracePoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => ({
      x: clamp(safeNumber(point?.x, 0), 0, 1),
      y: clamp(safeNumber(point?.y, 0), 0, 1)
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function bbox(points) {
  if (!points.length) return null;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  points.forEach((point) => {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  });
  return { minX, maxX, minY, maxY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
}

function angleDelta(a, b, c) {
  const a1 = Math.atan2(b.y - a.y, b.x - a.x);
  const a2 = Math.atan2(c.y - b.y, c.x - b.x);
  let delta = Math.abs(a2 - a1);
  if (delta > Math.PI) delta = Math.PI * 2 - delta;
  return delta;
}

export function traceSignature(points) {
  const normalized = normalizeTracePoints(points);
  if (!normalized.length) return "empty";
  const sample = normalized
    .filter((_, index) => index % Math.max(1, Math.floor(normalized.length / 64)) === 0)
    .slice(0, 64)
    .map((point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`)
    .join("|");
  let hash = 0x811c9dc5;
  for (let i = 0; i < sample.length; i += 1) {
    hash ^= sample.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

export function evaluateLineArtTrace(trace, options = {}) {
  const points = normalizeTracePoints(trace?.points);
  const guidePoints = normalizeTracePoints(trace?.guidePoints);
  const minPoints = options.minPoints ?? 80;
  const minGuidePoints = options.minGuidePoints ?? 20;
  const maxPoints = options.maxPoints ?? 4200;
  const minCoverage = options.minCoverage ?? 0.08;
  const maxCoverage = options.maxCoverage ?? 0.92;
  const maxJitterRatio = options.maxJitterRatio ?? 0.62;
  const reasons = [];

  if (points.length < minPoints) reasons.push(`trace_points_too_low:${points.length}`);
  if (points.length > maxPoints) reasons.push(`trace_points_too_high:${points.length}`);
  if (guidePoints.length < minGuidePoints) reasons.push(`guide_points_too_low:${guidePoints.length}`);

  const box = bbox(points);
  const coverage = box ? box.width * box.height : 0;
  if (coverage < minCoverage) reasons.push(`shape_coverage_too_low:${coverage.toFixed(3)}`);
  if (coverage > maxCoverage) reasons.push(`shape_coverage_too_high:${coverage.toFixed(3)}`);

  let longJumpCount = 0;
  let totalStep = 0;
  for (let i = 1; i < points.length; i += 1) {
    const step = pointDistance(points[i - 1], points[i]);
    totalStep += step;
    if (step > 0.2) longJumpCount += 1;
  }
  const meanStep = points.length > 1 ? totalStep / (points.length - 1) : 0;
  const jitterRatio = points.length > 1 ? longJumpCount / (points.length - 1) : 1;
  if (jitterRatio > maxJitterRatio) reasons.push(`trace_jitter_too_high:${jitterRatio.toFixed(2)}`);

  let curvature = 0;
  for (let i = 2; i < points.length; i += 1) {
    curvature += angleDelta(points[i - 2], points[i - 1], points[i]);
  }
  const complexityScore = clamp(
    Math.round(
      (Math.min(1, points.length / 1200) * 0.4 +
        Math.min(1, (curvature / Math.max(1, points.length)) / 0.7) * 0.35 +
        Math.min(1, coverage / 0.5) * 0.25) * 100
    ),
    1,
    100
  );

  return {
    status: reasons.length ? "failed" : "ready",
    reasons,
    score: reasons.length ? Math.max(1, complexityScore - reasons.length * 12) : complexityScore,
    metrics: {
      points: points.length,
      guidePoints: guidePoints.length,
      coverage,
      meanStep,
      jitterRatio,
      complexityScore
    }
  };
}

export function normalizeLineArtAsset(asset, fallbackIndex = 0) {
  if (!asset || typeof asset !== "object") return null;
  const trace = {
    points: normalizeTracePoints(asset.trace?.points || asset.points),
    guidePoints: normalizeTracePoints(asset.trace?.guidePoints || asset.guidePoints),
    diagnostics: asset.trace?.diagnostics || asset.diagnostics || {}
  };
  if (trace.points.length < 8) return null;
  const evaluation = evaluateLineArtTrace(trace);
  const signature = traceSignature(trace.points);
  return {
    id: String(asset.id || `line-art-${fallbackIndex + 1}-${signature}`),
    name: String(asset.name || asset.source_filename || `Line Art ${fallbackIndex + 1}`),
    status: String(asset.status || evaluation.status),
    tags: Array.isArray(asset.tags) ? asset.tags.map((tag) => String(tag)) : [],
    previewDataUrl:
      typeof asset.previewDataUrl === "string" && asset.previewDataUrl.startsWith("data:image/")
        ? asset.previewDataUrl
        : "",
    sourceImageUrl: typeof asset.sourceImageUrl === "string" ? asset.sourceImageUrl : "",
    sourceMode: "bulk_library",
    trace,
    diagnostics: asset.diagnostics || trace.diagnostics || {},
    qa: asset.qa || evaluation,
    signature,
    createdAt: asset.createdAt || new Date().toISOString()
  };
}

export function normalizeLineArtLibrary(library) {
  if (!Array.isArray(library)) return [];
  const seen = new Set();
  const normalized = [];
  library.forEach((asset, index) => {
    const next = normalizeLineArtAsset(asset, index);
    if (!next) return;
    if (seen.has(next.signature)) return;
    seen.add(next.signature);
    normalized.push(next);
  });
  return normalized;
}

export function createLineArtAssetFromTrace(fileName, trace, extra = {}) {
  const normalizedTrace = {
    points: normalizeTracePoints(trace?.points),
    guidePoints: normalizeTracePoints(trace?.guidePoints),
    diagnostics: trace?.diagnostics || {}
  };
  const qa = evaluateLineArtTrace(normalizedTrace);
  const signature = traceSignature(normalizedTrace.points);
  return {
    id: generateLocalId(),
    name: String(fileName || "line-art"),
    status: qa.status,
    tags: Array.isArray(extra.tags) ? extra.tags.map((tag) => String(tag)) : [],
    previewDataUrl:
      typeof extra.previewDataUrl === "string" && extra.previewDataUrl.startsWith("data:image/")
        ? extra.previewDataUrl
        : "",
    sourceImageUrl: typeof extra.sourceImageUrl === "string" ? extra.sourceImageUrl : "",
    sourceMode: "bulk_library",
    trace: normalizedTrace,
    diagnostics: normalizedTrace.diagnostics,
    qa,
    signature,
    createdAt: new Date().toISOString()
  };
}

export function selectLineArtAssetsForPages(assets, pageCount) {
  const ready = normalizeLineArtLibrary(assets).filter((asset) => asset.status === "ready");
  if (!ready.length || pageCount <= 0) return [];
  const assignments = [];
  let cursor = 0;
  for (let page = 0; page < pageCount; page += 1) {
    assignments.push(ready[cursor % ready.length]);
    cursor += 1;
  }
  return assignments;
}
