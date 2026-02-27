function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(Math.floor((sorted.length - 1) * p), 0, sorted.length - 1);
  return sorted[index];
}

function pointsClose(a, b, epsilon = 1e-6) {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}

function simplifyPointsByGap(points, minGapPx) {
  if (!Array.isArray(points) || points.length <= 2) return points || [];
  const output = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = output[output.length - 1];
    const next = points[i];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    if (Math.sqrt(dx * dx + dy * dy) >= minGapPx) output.push(next);
  }
  if (output.length > 1 && pointsClose(output[0], output[output.length - 1])) {
    output.pop();
  }
  return output;
}

function pointDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function downsamplePoints(points, maxPoints) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points || [];
  const stride = Math.max(1, Math.floor(points.length / maxPoints));
  const output = [];
  for (let i = 0; i < points.length && output.length < maxPoints; i += stride) {
    output.push(points[i]);
  }
  return output;
}

function normalizePoints(points, width, height) {
  const safeW = Math.max(1, width - 1);
  const safeH = Math.max(1, height - 1);
  return points.map((point) => ({
    x: clamp(point.x / safeW, 0, 1),
    y: clamp(point.y / safeH, 0, 1)
  }));
}

function grayscaleLumaFromRgba(data) {
  const luma = new Float32Array(data.length / 4);
  for (let i = 0; i < data.length; i += 4) {
    luma[i / 4] = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
  }
  return luma;
}

function otsuThreshold(luma) {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < luma.length; i += 1) {
    const bucket = clamp(Math.round(luma[i]), 0, 255);
    histogram[bucket] += 1;
  }

  const total = luma.length;
  if (total <= 0) return 180;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i];

  let sumBackground = 0;
  let weightBackground = 0;
  let bestVariance = -1;
  let threshold = 180;

  for (let i = 0; i < 256; i += 1) {
    weightBackground += histogram[i];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += i * histogram[i];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = i;
    }
  }

  return clamp(threshold, 40, 220);
}

function sobelMagnitude(luma, width, height) {
  const magnitudes = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -luma[i - width - 1] +
        luma[i - width + 1] +
        -2 * luma[i - 1] +
        2 * luma[i + 1] +
        -luma[i + width - 1] +
        luma[i + width + 1];
      const gy =
        -luma[i - width - 1] +
        -2 * luma[i - width] +
        -luma[i - width + 1] +
        luma[i + width - 1] +
        2 * luma[i + width] +
        luma[i + width + 1];
      magnitudes[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return magnitudes;
}

function largestConnectedComponent(binary, width, height) {
  const visited = new Uint8Array(binary.length);
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  let largest = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (!binary[start] || visited[start]) continue;

      const queue = [start];
      const component = [];
      visited[start] = 1;

      while (queue.length) {
        const current = queue.pop();
        component.push(current);
        const cx = current % width;
        const cy = Math.floor(current / width);

        for (let i = 0; i < neighbors.length; i += 1) {
          const nx = cx + neighbors[i][0];
          const ny = cy + neighbors[i][1];
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (!binary[ni] || visited[ni]) continue;
          visited[ni] = 1;
          queue.push(ni);
        }
      }

      if (component.length > largest.length) largest = component;
    }
  }
  return largest;
}

function chooseStartPoint(points) {
  let bestIndex = 0;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].x < points[bestIndex].x) bestIndex = i;
    else if (points[i].x === points[bestIndex].x && points[i].y < points[bestIndex].y) {
      bestIndex = i;
    }
  }
  return bestIndex;
}

function rotatePoints(points, startIndex) {
  if (!Array.isArray(points) || points.length <= 1) return points || [];
  const safeStart = ((startIndex % points.length) + points.length) % points.length;
  return [...points.slice(safeStart), ...points.slice(0, safeStart)];
}

function smoothClosedPolyline(points, passes = 1) {
  if (!Array.isArray(points) || points.length < 6) return points || [];
  let output = [...points];
  for (let pass = 0; pass < passes; pass += 1) {
    const next = [];
    for (let i = 0; i < output.length; i += 1) {
      const prev = output[(i - 1 + output.length) % output.length];
      const cur = output[i];
      const nxt = output[(i + 1) % output.length];
      next.push({
        x: prev.x * 0.22 + cur.x * 0.56 + nxt.x * 0.22,
        y: prev.y * 0.22 + cur.y * 0.56 + nxt.y * 0.22
      });
    }
    output = next;
  }
  return output;
}

function largestContiguousSegment(points, maxJumpPx) {
  if (!Array.isArray(points) || points.length <= 2) return points || [];
  const segments = [];
  let current = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (pointDistance(points[i - 1], points[i]) <= maxJumpPx) {
      current.push(points[i]);
      continue;
    }
    if (current.length >= 2) segments.push(current);
    current = [points[i]];
  }
  if (current.length >= 2) segments.push(current);
  if (!segments.length) return points;
  segments.sort((a, b) => b.length - a.length);
  return segments[0];
}

function buildRadialOuterContour(points, options = {}) {
  if (!Array.isArray(points) || points.length < 24) return [];
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < points.length; i += 1) {
    sumX += points[i].x;
    sumY += points[i].y;
  }
  const cx = sumX / points.length;
  const cy = sumY / points.length;
  const binCount = clamp(
    Math.round(
      options.radialBinCount ?? Math.max(140, Math.min(960, Math.sqrt(points.length) * 4.5))
    ),
    80,
    1200
  );
  const distBins = new Float64Array(binCount);
  const pointBins = Array.from({ length: binCount }, () => null);
  for (let i = 0; i < binCount; i += 1) distBins[i] = -1;

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const dx = point.x - cx;
    const dy = point.y - cy;
    const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
    const bin = clamp(Math.floor((angle / (Math.PI * 2)) * binCount), 0, binCount - 1);
    const distSq = dx * dx + dy * dy;
    if (distSq > distBins[bin]) {
      distBins[bin] = distSq;
      pointBins[bin] = point;
    }
  }

  const coverage = pointBins.filter(Boolean).length / binCount;
  if (coverage < (options.minRadialCoverage ?? 0.26)) return [];

  const radial = [];
  for (let i = 0; i < binCount; i += 1) {
    if (pointBins[i]) radial.push(pointBins[i]);
  }
  if (radial.length < (options.minRadialPoints ?? 40)) return [];

  const start = chooseStartPoint(radial);
  const rotated = rotatePoints(radial, start);
  const smoothed = smoothClosedPolyline(rotated, options.radialSmoothingPasses ?? 1);
  const segmented = largestContiguousSegment(smoothed, options.maxRadialJumpPx ?? 18);
  return segmented.length >= 12 ? segmented : smoothed;
}

function orderPointsAsPath(points, options = {}) {
  if (!Array.isArray(points) || points.length <= 2) return points || [];
  const hardNeighborStep = options.hardNeighborStepPx ?? 4.5;
  const softNeighborStep = options.softNeighborStepPx ?? 2.8;
  const maxJump = options.maxJumpPx ?? 14;

  const used = new Uint8Array(points.length);
  const ordered = [];
  let currentIndex = chooseStartPoint(points);
  used[currentIndex] = 1;
  ordered.push(points[currentIndex]);

  let prevDirX = 1;
  let prevDirY = 0;
  let hasPrevDir = false;

  for (let stepIndex = 1; stepIndex < points.length; stepIndex += 1) {
    const current = points[currentIndex];
    let bestNeighborIndex = -1;
    let bestNeighborScore = Number.POSITIVE_INFINITY;
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < points.length; i += 1) {
      if (used[i]) continue;
      const dx = points[i].x - current.x;
      const dy = points[i].y - current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (!Number.isFinite(dist) || dist <= 1e-6) continue;
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = i;
      }
      if (dist > hardNeighborStep) continue;

      let turnPenalty = 0;
      if (hasPrevDir) {
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = clamp(prevDirX * nx + prevDirY * ny, -1, 1);
        turnPenalty = (1 - dot) * 0.7;
      }
      const stepPenalty = dist <= softNeighborStep ? dist * 0.65 : dist * 1.35;
      const score = stepPenalty + turnPenalty;
      if (score < bestNeighborScore) {
        bestNeighborScore = score;
        bestNeighborIndex = i;
      }
    }

    let nextIndex = -1;
    if (bestNeighborIndex >= 0) {
      nextIndex = bestNeighborIndex;
    } else if (nearestIndex >= 0 && nearestDistance <= maxJump) {
      nextIndex = nearestIndex;
    } else {
      break;
    }

    const nx = points[nextIndex].x - current.x;
    const ny = points[nextIndex].y - current.y;
    const nd = Math.sqrt(nx * nx + ny * ny);
    if (nd > 1e-6) {
      prevDirX = nx / nd;
      prevDirY = ny / nd;
      hasPrevDir = true;
    }

    used[nextIndex] = 1;
    ordered.push(points[nextIndex]);
    currentIndex = nextIndex;
  }

  return ordered;
}

export function extractImageTraceFromImageData(imageData, options = {}) {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return {
      pointsNormalized: [],
      guidePointsNormalized: [],
      diagnostics: { edgeThreshold: 0, componentSize: 0 }
    };
  }

  const width = imageData.width;
  const height = imageData.height;
  const luma = grayscaleLumaFromRgba(imageData.data);
  const magnitudes = sobelMagnitude(luma, width, height);
  const threshold = Math.max(20, percentile(magnitudes, options.edgeQuantile ?? 0.86));
  const inkThreshold = options.inkThreshold ?? otsuThreshold(luma);

  const binary = new Uint8Array(magnitudes.length);
  for (let i = 0; i < magnitudes.length; i += 1) {
    binary[i] = magnitudes[i] >= threshold ? 1 : 0;
  }
  const inkBinary = new Uint8Array(luma.length);
  for (let i = 0; i < luma.length; i += 1) {
    inkBinary[i] = luma[i] <= inkThreshold ? 1 : 0;
  }

  const edgeComponent = largestConnectedComponent(binary, width, height);
  const inkComponent = largestConnectedComponent(inkBinary, width, height);
  const component =
    inkComponent.length >= edgeComponent.length * 0.6 ? inkComponent : edgeComponent;
  const minComponentSize = options.minComponentSize ?? 120;
  if (component.length < minComponentSize) {
    return {
      pointsNormalized: [],
      guidePointsNormalized: [],
      diagnostics: {
        edgeThreshold: threshold,
        inkThreshold,
        componentSize: component.length
      }
    };
  }

  const edgePoints = component.map((index) => ({
    x: index % width,
    y: Math.floor(index / width)
  }));
  const radialContour = buildRadialOuterContour(edgePoints, {
    radialBinCount: options.radialBinCount,
    minRadialCoverage: options.minRadialCoverage,
    minRadialPoints: options.minRadialPoints,
    radialSmoothingPasses: options.radialSmoothingPasses,
    maxRadialJumpPx: options.maxRadialJumpPx
  });
  const ordered =
    radialContour.length >= 12
      ? radialContour
      : orderPointsAsPath(edgePoints, {
          hardNeighborStepPx: options.hardNeighborStepPx ?? 4.8,
          softNeighborStepPx: options.softNeighborStepPx ?? 2.9,
          maxJumpPx: options.maxJumpPx ?? 16
        });
  const segmented = largestContiguousSegment(ordered, options.maxJumpPx ?? 16);
  const simplified = simplifyPointsByGap(segmented, options.minPointGapPx ?? 2.3);

  const contourPoints = downsamplePoints(
    simplified,
    options.maxContourPoints ?? 1800
  );
  const guidePoints = downsamplePoints(
    simplifyPointsByGap(simplified, options.minGuideGapPx ?? 5),
    options.maxGuidePoints ?? 420
  );

  return {
    pointsNormalized: normalizePoints(contourPoints, width, height),
    guidePointsNormalized: normalizePoints(guidePoints, width, height),
    diagnostics: {
      edgeThreshold: threshold,
      inkThreshold,
      source: component === inkComponent ? "ink" : "edge",
      traceMode: radialContour.length >= 12 ? "radial_outer" : "neighbor_path",
      componentSize: component.length,
      orderedPoints: ordered.length,
      contourPoints: contourPoints.length,
      guidePoints: guidePoints.length
    }
  };
}
