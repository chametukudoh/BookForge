import { clamp } from "./constants";

export function downloadDataUrlFile(filename, dataUrl) {
  if (typeof window === "undefined") return;
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function drawImageCover(ctx, img, x, y, width, height) {
  const srcAspect = img.width / img.height || 1;
  const dstAspect = width / height || 1;
  let drawWidth = width;
  let drawHeight = height;
  if (srcAspect > dstAspect) {
    drawHeight = height;
    drawWidth = height * srcAspect;
  } else {
    drawWidth = width;
    drawHeight = width / srcAspect;
  }
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

export function percentileFromHistogram(hist, totalCount, percentile) {
  const target = Math.max(0, Math.min(totalCount - 1, Math.floor(totalCount * clamp(percentile, 0, 1))));
  let running = 0;
  for (let i = 0; i < hist.length; i += 1) {
    running += hist[i];
    if (running > target) return i;
  }
  return hist.length - 1;
}

export function buildEdgeLineArtImageData(imageData, { quantile = 0.84, lineBoost = 1 } = {}) {
  const { width, height, data } = imageData;
  const pixelCount = width * height;
  const gray = new Float32Array(pixelCount);
  const grayHist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const l = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
    gray[i / 4] = l;
    grayHist[Math.max(0, Math.min(255, Math.round(l)))] += 1;
  }

  const blackPoint = percentileFromHistogram(grayHist, pixelCount, 0.02);
  const whitePoint = Math.max(blackPoint + 1, percentileFromHistogram(grayHist, pixelCount, 0.98));
  const stretch = 255 / (whitePoint - blackPoint);
  for (let i = 0; i < gray.length; i += 1) {
    gray[i] = clamp((gray[i] - blackPoint) * stretch, 0, 255);
  }

  const blur = new Float32Array(pixelCount);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const v =
        gray[i - width - 1] +
        gray[i - width] +
        gray[i - width + 1] +
        gray[i - 1] +
        gray[i] +
        gray[i + 1] +
        gray[i + width - 1] +
        gray[i + width] +
        gray[i + width + 1];
      blur[i] = v / 9;
    }
  }
  for (let x = 0; x < width; x += 1) {
    blur[x] = gray[x];
    blur[(height - 1) * width + x] = gray[(height - 1) * width + x];
  }
  for (let y = 0; y < height; y += 1) {
    blur[y * width] = gray[y * width];
    blur[y * width + (width - 1)] = gray[y * width + (width - 1)];
  }

  const mags = new Float32Array(pixelCount);
  let maxMag = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -blur[i - width - 1] +
        blur[i - width + 1] +
        -2 * blur[i - 1] +
        2 * blur[i + 1] +
        -blur[i + width - 1] +
        blur[i + width + 1];
      const gy =
        -blur[i - width - 1] +
        -2 * blur[i - width] +
        -blur[i - width + 1] +
        blur[i + width - 1] +
        2 * blur[i + width] +
        blur[i + width + 1];
      const mag = Math.sqrt(gx * gx + gy * gy);
      mags[i] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }

  const bins = 512;
  const hist = new Uint32Array(bins);
  const safeMax = Math.max(maxMag, 1);
  for (let i = 0; i < mags.length; i += 1) {
    const bin = Math.min(bins - 1, Math.floor((mags[i] / safeMax) * (bins - 1)));
    hist[bin] += 1;
  }
  const thresholdBin = percentileFromHistogram(hist, pixelCount, clamp(quantile, 0.55, 0.96));
  const threshold = (thresholdBin / (bins - 1)) * safeMax;
  const darkToneThreshold = percentileFromHistogram(grayHist, pixelCount, 0.35);

  const edges = new Uint8Array(pixelCount);
  for (let i = 0; i < edges.length; i += 1) {
    const strongEdge = mags[i] >= threshold;
    const darkTone = blur[i] <= darkToneThreshold;
    const weakEdge = mags[i] >= threshold * 0.42;
    edges[i] = strongEdge || (darkTone && weakEdge) ? 1 : 0;
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      if (!edges[i]) continue;
      let neighbors = 0;
      neighbors += edges[i - 1];
      neighbors += edges[i + 1];
      neighbors += edges[i - width];
      neighbors += edges[i + width];
      neighbors += edges[i - width - 1];
      neighbors += edges[i - width + 1];
      neighbors += edges[i + width - 1];
      neighbors += edges[i + width + 1];
      if (neighbors <= 1 && mags[i] < threshold * 1.15) {
        edges[i] = 0;
      }
    }
  }

  const passes = Math.min(3, Math.max(0, lineBoost));
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(edges);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const i = y * width + x;
        if (edges[i]) continue;
        if (
          edges[i - 1] ||
          edges[i + 1] ||
          edges[i - width] ||
          edges[i + width] ||
          edges[i - width - 1] ||
          edges[i - width + 1] ||
          edges[i + width - 1] ||
          edges[i + width + 1]
        ) {
          next[i] = 1;
        }
      }
    }
    edges.set(next);
  }

  const out = new ImageData(width, height);
  for (let i = 0; i < edges.length; i += 1) {
    const on = edges[i] === 1;
    const v = on ? 0 : 255;
    const p = i * 4;
    out.data[p] = v;
    out.data[p + 1] = v;
    out.data[p + 2] = v;
    out.data[p + 3] = 255;
  }
  return out;
}
