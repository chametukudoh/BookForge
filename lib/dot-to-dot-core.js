const DOT_TO_DOT_AUDIENCE_PROFILES = {
  early: { id: "early", label: "Early (10-60 dots)", minDots: 10, maxDots: 60, minGapPx: 16 },
  kids: { id: "kids", label: "Kids (60-180 dots)", minDots: 60, maxDots: 180, minGapPx: 12 },
  advanced: { id: "advanced", label: "Advanced (180-600 dots)", minDots: 180, maxDots: 600, minGapPx: 9 }
};

const LEGACY_DIFFICULTY_ALIASES = {
  beginner: "early",
  easy: "kids",
  medium: "kids",
  hard: "advanced"
};

function randomBetween(min, max, randomFn = Math.random) {
  return min + randomFn() * (max - min);
}

function pointDistance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function segmentDirection(a, b, c) {
  return (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y);
}

function isBetween(a, b, value) {
  return value >= Math.min(a, b) && value <= Math.max(a, b);
}

function pointOnSegment(a, b, p) {
  const cross = Math.abs((p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y));
  if (cross > 1e-6) return false;
  return isBetween(a.x, b.x, p.x) && isBetween(a.y, b.y, p.y);
}

function pointsEqual(a, b) {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
}

function segmentsIntersect(a1, a2, b1, b2) {
  if (
    pointsEqual(a1, b1) ||
    pointsEqual(a1, b2) ||
    pointsEqual(a2, b1) ||
    pointsEqual(a2, b2)
  ) {
    return false;
  }

  const d1 = segmentDirection(a1, a2, b1);
  const d2 = segmentDirection(a1, a2, b2);
  const d3 = segmentDirection(b1, b2, a1);
  const d4 = segmentDirection(b1, b2, a2);

  if (d1 === 0 && pointOnSegment(a1, a2, b1)) return true;
  if (d2 === 0 && pointOnSegment(a1, a2, b2)) return true;
  if (d3 === 0 && pointOnSegment(b1, b2, a1)) return true;
  if (d4 === 0 && pointOnSegment(b1, b2, a2)) return true;

  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}

function absoluteRegionPerimeter(region) {
  if (region.kind === "circle") return Math.PI * 2 * region.r;
  if (region.kind === "ellipse") {
    const a = region.rx;
    const b = region.ry;
    return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  }
  if (region.kind === "rect") return (region.w + region.h) * 2;
  if (region.kind === "polygon") {
    let length = 0;
    for (let i = 0; i < region.points.length; i += 1) {
      const [x1, y1] = region.points[i];
      const [x2, y2] = region.points[(i + 1) % region.points.length];
      length += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    return length;
  }
  return 0;
}

function pointOnAbsoluteRegion(region, t) {
  const normalizedT = ((t % 1) + 1) % 1;
  if (region.kind === "circle") {
    const angle = normalizedT * Math.PI * 2;
    return {
      x: region.cx + Math.cos(angle) * region.r,
      y: region.cy + Math.sin(angle) * region.r
    };
  }
  if (region.kind === "ellipse") {
    const angle = normalizedT * Math.PI * 2;
    return {
      x: region.cx + Math.cos(angle) * region.rx,
      y: region.cy + Math.sin(angle) * region.ry
    };
  }
  if (region.kind === "rect") {
    const perimeter = Math.max(1, (region.w + region.h) * 2);
    let distance = normalizedT * perimeter;
    if (distance <= region.w) return { x: region.x + distance, y: region.y };
    distance -= region.w;
    if (distance <= region.h) return { x: region.x + region.w, y: region.y + distance };
    distance -= region.h;
    if (distance <= region.w) return { x: region.x + region.w - distance, y: region.y + region.h };
    distance -= region.w;
    return { x: region.x, y: region.y + region.h - distance };
  }
  if (region.kind === "polygon") {
    const edges = [];
    let perimeter = 0;
    for (let i = 0; i < region.points.length; i += 1) {
      const [x1, y1] = region.points[i];
      const [x2, y2] = region.points[(i + 1) % region.points.length];
      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      edges.push({ x1, y1, x2, y2, length });
      perimeter += length;
    }
    let cursor = normalizedT * Math.max(perimeter, 1);
    for (let i = 0; i < edges.length; i += 1) {
      if (cursor <= edges[i].length) {
        const ratio = edges[i].length === 0 ? 0 : cursor / edges[i].length;
        return {
          x: edges[i].x1 + (edges[i].x2 - edges[i].x1) * ratio,
          y: edges[i].y1 + (edges[i].y2 - edges[i].y1) * ratio
        };
      }
      cursor -= edges[i].length;
    }
    const last = edges[edges.length - 1];
    return { x: last.x2, y: last.y2 };
  }
  return { x: 0, y: 0 };
}

function sortPathByAngle(points, bounds) {
  if (!Array.isArray(points) || points.length <= 2) return points || [];
  const centerX = bounds.x + bounds.w / 2;
  const centerY = bounds.y + bounds.h / 2;
  return [...points].sort(
    (a, b) =>
      Math.atan2(a.y - centerY, a.x - centerX) -
      Math.atan2(b.y - centerY, b.x - centerX)
  );
}

function buildFallbackLoop(bounds, targetDots, randomFn = Math.random) {
  const count = Math.max(8, targetDots);
  const centerX = bounds.x + bounds.w / 2;
  const centerY = bounds.y + bounds.h / 2;
  const rx = Math.max(20, bounds.w * 0.45);
  const ry = Math.max(20, bounds.h * 0.45);
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const wobble = randomBetween(-0.06, 0.06, randomFn);
    return {
      x: centerX + Math.cos(angle) * rx + Math.cos(angle * 3) * rx * wobble,
      y: centerY + Math.sin(angle) * ry + Math.sin(angle * 2) * ry * wobble
    };
  });
}

function buildDotToDotPath({ absoluteRegions, targetDots, minGapPx, bounds, randomFn = Math.random }) {
  if (!Array.isArray(absoluteRegions) || !absoluteRegions.length) {
    return sortPathByAngle(buildFallbackLoop(bounds, targetDots, randomFn).slice(0, targetDots), bounds);
  }

  const weightedRegions = absoluteRegions.map((region) => ({
    region,
    perimeter: Math.max(1, absoluteRegionPerimeter(region))
  }));
  const totalPerimeter = weightedRegions.reduce((sum, item) => sum + item.perimeter, 0);
  const minimumPerRegion = Math.min(4, Math.max(1, targetDots));
  const counts = weightedRegions.map(() => minimumPerRegion);
  let remaining = Math.max(0, targetDots - counts.reduce((sum, value) => sum + value, 0));

  while (remaining > 0 && weightedRegions.length > 0) {
    const roll = randomFn() * totalPerimeter;
    let cursor = roll;
    let picked = weightedRegions.length - 1;
    for (let i = 0; i < weightedRegions.length; i += 1) {
      cursor -= weightedRegions[i].perimeter;
      if (cursor <= 0) {
        picked = i;
        break;
      }
    }
    counts[picked] += 1;
    remaining -= 1;
  }

  const candidates = [];
  weightedRegions.forEach((item, index) => {
    const count = counts[index];
    for (let i = 0; i < count; i += 1) {
      const jitter = randomBetween(-0.08, 0.08, randomFn);
      const t = (i + 0.5) / Math.max(count, 1) + jitter;
      candidates.push(pointOnAbsoluteRegion(item.region, t));
    }
  });

  const orderedCandidates = sortPathByAngle(candidates, bounds);
  const points = [];
  orderedCandidates.forEach((point) => {
    if (!points.length || pointDistance(points[points.length - 1], point) >= minGapPx) {
      points.push(point);
    }
  });

  if (points.length < Math.max(8, Math.floor(targetDots * 0.7))) {
    const relaxedGap = Math.max(6, minGapPx * 0.65);
    const refill = [];
    orderedCandidates.forEach((point) => {
      if (!refill.length || pointDistance(refill[refill.length - 1], point) >= relaxedGap) {
        refill.push(point);
      }
    });
    const fallback = buildFallbackLoop(bounds, targetDots, randomFn);
    fallback.forEach((point) => {
      if (refill.length >= targetDots) return;
      if (
        !refill.length ||
        pointDistance(refill[refill.length - 1], point) >= Math.max(5, relaxedGap * 0.7)
      ) {
        refill.push(point);
      }
    });
    while (refill.length < targetDots && fallback.length) {
      refill.push(fallback[refill.length % fallback.length]);
    }
    return sortPathByAngle(refill.slice(0, targetDots), bounds);
  }

  if (points.length < targetDots) {
    const fallback = buildFallbackLoop(bounds, targetDots, randomFn);
    fallback.forEach((point) => {
      if (points.length >= targetDots) return;
      if (
        !points.length ||
        pointDistance(points[points.length - 1], point) >= Math.max(5, minGapPx * 0.55)
      ) {
        points.push(point);
      }
    });
    while (points.length < targetDots && fallback.length) {
      points.push(fallback[points.length % fallback.length]);
    }
  }

  return sortPathByAngle(points.slice(0, targetDots), bounds);
}

export function normalizeDotToDotDifficulty(level) {
  const alias = LEGACY_DIFFICULTY_ALIASES[level];
  const normalized = alias || level;
  if (normalized && DOT_TO_DOT_AUDIENCE_PROFILES[normalized]) {
    return normalized;
  }
  return "kids";
}

export function getDotToDotDifficulty(level) {
  return DOT_TO_DOT_AUDIENCE_PROFILES[normalizeDotToDotDifficulty(level)];
}

function pointsClose(a, b, epsilon = 1e-6) {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}

function rotateArray(values, shift) {
  if (!Array.isArray(values) || !values.length) return [];
  const offset = ((shift % values.length) + values.length) % values.length;
  if (offset === 0) return [...values];
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function cumulativeDistances(points) {
  const distances = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += pointDistance(points[i - 1], points[i]);
    distances.push(total);
  }
  return { distances, total };
}

function interpolatePolyline(points, sampleCount) {
  if (!Array.isArray(points) || !points.length) return [];
  if (points.length === 1) return Array.from({ length: sampleCount }, () => ({ ...points[0] }));
  const count = Math.max(2, sampleCount);
  const { distances, total } = cumulativeDistances(points);
  if (total <= 1e-6) return Array.from({ length: count }, () => ({ ...points[0] }));

  const output = [];
  let segment = 1;
  for (let i = 0; i < count; i += 1) {
    const target = (total * i) / (count - 1);
    while (segment < distances.length - 1 && distances[segment] < target) {
      segment += 1;
    }
    const p1 = points[segment - 1];
    const p2 = points[segment];
    const d1 = distances[segment - 1];
    const d2 = distances[segment];
    const ratio = d2 - d1 <= 1e-6 ? 0 : (target - d1) / (d2 - d1);
    output.push({
      x: p1.x + (p2.x - p1.x) * ratio,
      y: p1.y + (p2.y - p1.y) * ratio
    });
  }
  return output;
}

function enforcePathGap(points, minGapPx, fallbackPoints) {
  const filtered = [];
  points.forEach((point) => {
    if (!filtered.length || pointDistance(filtered[filtered.length - 1], point) >= minGapPx) {
      filtered.push(point);
    }
  });
  if (filtered.length >= points.length * 0.7) return filtered;

  const relaxedGap = Math.max(1, minGapPx * 0.65);
  const relaxed = [];
  points.forEach((point) => {
    if (!relaxed.length || pointDistance(relaxed[relaxed.length - 1], point) >= relaxedGap) {
      relaxed.push(point);
    }
  });
  if (!Array.isArray(fallbackPoints) || !fallbackPoints.length) return relaxed;
  fallbackPoints.forEach((point) => {
    if (!relaxed.length || pointDistance(relaxed[relaxed.length - 1], point) >= Math.max(1, relaxedGap * 0.7)) {
      relaxed.push(point);
    }
  });
  return relaxed;
}

function projectNormalizedPointsToBounds(points, bounds) {
  if (!Array.isArray(points)) return [];
  return points.map((point) => ({
    x: bounds.x + point.x * bounds.w,
    y: bounds.y + point.y * bounds.h
  }));
}

export function buildPathFromNormalizedTrace({
  normalizedPoints,
  targetDots,
  minGapPx,
  bounds,
  closed = true,
  attempts = 4,
  randomFn = Math.random
}) {
  if (!Array.isArray(normalizedPoints) || normalizedPoints.length < 2) return [];
  const projected = projectNormalizedPointsToBounds(normalizedPoints, bounds);
  const basePath = closed && !pointsClose(projected[0], projected[projected.length - 1])
    ? [...projected, projected[0]]
    : [...projected];
  const fallbackLoop = buildFallbackLoop(bounds, targetDots, randomFn);

  let bestPath = [];
  let bestMetrics = { qualityScore: -1, minStep: -1, crossingCount: Number.POSITIVE_INFINITY };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const shift =
      closed && basePath.length > 3 ? Math.floor(randomFn() * (basePath.length - 1)) : 0;
    const shifted = closed ? rotateArray(basePath.slice(0, -1), shift) : rotateArray(basePath, shift);
    const shiftedPath = closed ? [...shifted, shifted[0]] : shifted;
    const oversample = Math.max(targetDots * 3, shiftedPath.length);
    const sampled = interpolatePolyline(shiftedPath, oversample);
    const gapped = enforcePathGap(sampled, minGapPx, fallbackLoop);

    const candidate = [];
    const stride = Math.max(1, Math.floor(gapped.length / Math.max(1, targetDots)));
    for (let i = 0; i < gapped.length && candidate.length < targetDots; i += stride) {
      candidate.push(gapped[i]);
    }
    let cursor = 0;
    while (candidate.length < targetDots && gapped.length) {
      candidate.push(gapped[cursor % gapped.length]);
      cursor += 1;
    }
    while (candidate.length < targetDots && fallbackLoop.length) {
      candidate.push(fallbackLoop[candidate.length % fallbackLoop.length]);
    }

    const metrics = getDotToDotPathMetrics(candidate, { targetMinGapPx: minGapPx });
    if (
      metrics.qualityScore > bestMetrics.qualityScore ||
      (metrics.qualityScore === bestMetrics.qualityScore && metrics.minStep > bestMetrics.minStep)
    ) {
      bestPath = candidate;
      bestMetrics = metrics;
    }
    if (metrics.minStep >= minGapPx && metrics.crossingCount === 0) {
      return candidate;
    }
  }

  return bestPath;
}

export function buildBestDotToDotPath({
  absoluteRegions,
  targetDots,
  minGapPx,
  bounds,
  attempts = 6,
  randomFn = Math.random
}) {
  let best = [];
  let bestMetrics = { minStep: -1, crossingCount: Number.POSITIVE_INFINITY, qualityScore: -1 };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const points = buildDotToDotPath({
      absoluteRegions,
      targetDots,
      minGapPx,
      bounds,
      randomFn
    });
    const metrics = getDotToDotPathMetrics(points, { targetMinGapPx: minGapPx });
    if (
      metrics.qualityScore > bestMetrics.qualityScore ||
      (metrics.qualityScore === bestMetrics.qualityScore && metrics.minStep > bestMetrics.minStep)
    ) {
      best = points;
      bestMetrics = metrics;
    }
    if (metrics.minStep >= minGapPx && metrics.crossingCount === 0) {
      return points;
    }
  }

  return best;
}

export function getDotToDotPathMetrics(points, { targetMinGapPx = null } = {}) {
  if (!Array.isArray(points) || !points.length) {
    return {
      minStep: Number.POSITIVE_INFINITY,
      maxStep: 0,
      meanStep: 0,
      totalPathLength: 0,
      crossingCount: 0,
      contiguousLabels: false,
      qualityScore: 0
    };
  }

  let minStep = Number.POSITIVE_INFINITY;
  let maxStep = 0;
  let totalPathLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    const step = pointDistance(points[i - 1], points[i]);
    if (step < minStep) minStep = step;
    if (step > maxStep) maxStep = step;
    totalPathLength += step;
  }

  let crossingCount = 0;
  const segments = [];
  for (let i = 1; i < points.length; i += 1) {
    segments.push({ a: points[i - 1], b: points[i], index: i });
  }
  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      if (Math.abs(segments[i].index - segments[j].index) <= 1) continue;
      if (segmentsIntersect(segments[i].a, segments[i].b, segments[j].a, segments[j].b)) {
        crossingCount += 1;
      }
    }
  }

  const contiguousLabels = points.every((point, index) => point.label === index + 1);
  const meanStep = points.length > 1 ? totalPathLength / (points.length - 1) : 0;
  const spacingScore =
    typeof targetMinGapPx === "number" && targetMinGapPx > 0
      ? Math.min(1, minStep / targetMinGapPx)
      : 1;
  const crossingScore = crossingCount === 0 ? 1 : Math.max(0, 1 - crossingCount / 10);
  const continuityScore = contiguousLabels ? 1 : 0;
  const qualityScore = Math.round((spacingScore * 0.45 + crossingScore * 0.35 + continuityScore * 0.2) * 100);

  return {
    minStep,
    maxStep,
    meanStep,
    totalPathLength,
    crossingCount,
    contiguousLabels,
    qualityScore
  };
}

export { DOT_TO_DOT_AUDIENCE_PROFILES };
