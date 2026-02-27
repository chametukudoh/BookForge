import { AI_EXPORT_PPI } from "./constants";
import { buildEdgeLineArtImageData, drawImageCover } from "./image-export-utils";

export async function fetchImageAsDataUrl(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Image fetch failed (${response.status})`);
  }
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image blob."));
    reader.readAsDataURL(blob);
  });
}

export async function loadImageElementFromUrl(url) {
  const src = String(url || "").startsWith("data:")
    ? String(url)
    : await fetchImageAsDataUrl(String(url || ""));
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to decode AI image."));
    img.src = src;
  });
}

export async function loadImageDataFromFile(file, maxSide = 540) {
  if (typeof window === "undefined") {
    throw new Error("Image import is only available in the browser.");
  }
  const srcUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const nextImg = new Image();
      nextImg.onload = () => resolve(nextImg);
      nextImg.onerror = () => reject(new Error("Unable to decode the selected image."));
      nextImg.src = srcUrl;
    });

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    const scale = Math.min(maxSide / naturalWidth, maxSide / naturalHeight, 1);
    const width = Math.max(64, Math.round(naturalWidth * scale));
    const height = Math.max(64, Math.round(naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Unable to initialize canvas for image trace.");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    return { imageData, width, height };
  } finally {
    URL.revokeObjectURL(srcUrl);
  }
}

export async function buildAiPrintablePageDataUrl(imageUrl, trim, options = {}) {
  if (typeof window === "undefined") {
    throw new Error("AI export is only available in the browser.");
  }
  const ppi = options.ppi || AI_EXPORT_PPI;
  const widthPx = Math.max(900, Math.round(trim.widthIn * ppi));
  const heightPx = Math.max(900, Math.round(trim.heightIn * ppi));
  const marginPx = Math.max(90, Math.round(ppi * 0.38));
  const contentX = marginPx;
  const contentY = marginPx;
  const contentW = widthPx - marginPx * 2;
  const contentH = heightPx - marginPx * 2;

  const img = await loadImageElementFromUrl(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Unable to initialize canvas for AI page export.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(contentX, contentY, contentW, contentH);
  drawImageCover(ctx, img, contentX, contentY, contentW, contentH);

  const raw = ctx.getImageData(contentX, contentY, contentW, contentH);
  const lineArt = buildEdgeLineArtImageData(raw, {
    quantile: options.quantile ?? 0.84,
    lineBoost: options.lineBoost ?? 2
  });
  ctx.putImageData(lineArt, contentX, contentY);

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(2, Math.round(ppi * 0.004));
  ctx.strokeRect(contentX, contentY, contentW, contentH);

  return canvas.toDataURL("image/png");
}
