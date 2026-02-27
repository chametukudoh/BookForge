export function buildDotToDotSvgMarkup(
  page,
  trim,
  { solution = false, escapeXml, drawMotifGuideSvgMarkup } = {}
) {
  if (!page) return "";
  const escape = escapeXml || ((value) => String(value || ""));
  const drawGuideMarkup = drawMotifGuideSvgMarkup || (() => "");

  const title = escape(page.title || "Dot to Dot");
  const instructions = solution
    ? "Solution view with connected path."
    : "Connect numbers in order to reveal the themed drawing.";
  const pathMarkup = page.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const traceImageTag =
    !solution && typeof page.tracePreviewUrl === "string" && page.tracePreviewUrl.length
      ? `<image href="${escape(page.tracePreviewUrl)}" x="${page.marginX}" y="${page.marginY}" width="${page.width - page.marginX * 2}" height="${page.height - page.marginY * 2}" preserveAspectRatio="xMidYMid meet" opacity="0.45" />`
      : "";
  const regionMarkup =
    page.motif && !(traceImageTag && !solution) ? drawGuideMarkup(page.motif) : "";
  const pointsMarkup = page.points
    .map(
      (point) => `
    <g id="d2d-${point.id}">
      <circle cx="${point.x}" cy="${point.y}" r="7" fill="#ffffff" stroke="#0b2038" stroke-width="1.8" />
      <text x="${point.x}" y="${point.y}" text-anchor="middle" dominant-baseline="middle" font-size="8.8" font-weight="700" fill="#0b2038">${point.label}</text>
    </g>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${trim.widthIn}in" height="${trim.heightIn}in" viewBox="0 0 ${page.width} ${page.height}" role="img" aria-label="${title}">
  <title>${title}</title>
  <desc>${escape(instructions)}</desc>
  <text x="${page.width / 2}" y="${Math.max(24, page.marginY * 0.55)}" text-anchor="middle" font-size="16" font-weight="700" fill="#10243b">${title}</text>
  <text x="${page.width / 2}" y="${Math.max(40, page.marginY * 0.9)}" text-anchor="middle" font-size="11" font-weight="600" fill="#3b4b64">${escape(
    instructions
  )}</text>
  <rect x="${page.marginX}" y="${page.marginY}" width="${page.width - page.marginX * 2}" height="${page.height - page.marginY * 2}" fill="#ffffff" stroke="#e4e0d5" stroke-width="2" />
  ${traceImageTag}
  ${regionMarkup}
  ${solution && page.points.length ? `<path d="${pathMarkup}" fill="none" stroke="#1b9e98" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />` : ""}
  ${pointsMarkup}
</svg>`;
}

export function drawDotToDotPageToPdf(
  pdf,
  page,
  { solution = false, dotCanvasPpi = 100, drawRegionPdf } = {}
) {
  const renderRegionPdf = drawRegionPdf || (() => {});
  const toInches = (value) => value / dotCanvasPpi;
  const widthIn = toInches(page.width);
  const heightIn = toInches(page.height);
  const marginX = toInches(page.marginX);
  const marginY = toInches(page.marginY);

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, widthIn, heightIn, "F");
  pdf.setTextColor(16, 36, 59);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(page.title || "Dot to Dot", widthIn / 2, Math.max(0.22, marginY * 0.55), { align: "center" });
  pdf.setTextColor(59, 75, 100);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(
    solution ? "Solution view with connected path." : "Connect numbers in order to reveal the drawing.",
    widthIn / 2,
    Math.max(0.35, marginY * 0.9),
    { align: "center" }
  );
  pdf.setDrawColor(228, 224, 213);
  pdf.setLineWidth(0.02);
  pdf.rect(marginX, marginY, widthIn - marginX * 2, heightIn - marginY * 2, "S");

  pdf.setDrawColor(183, 191, 202);
  pdf.setLineWidth(0.015);
  (page.motif?.regions || []).forEach((region) => renderRegionPdf(pdf, region, page.motif, toInches));

  if (solution && page.points.length) {
    pdf.setDrawColor(27, 158, 152);
    pdf.setLineWidth(0.026);
    for (let i = 1; i < page.points.length; i += 1) {
      pdf.line(
        toInches(page.points[i - 1].x),
        toInches(page.points[i - 1].y),
        toInches(page.points[i].x),
        toInches(page.points[i].y)
      );
    }
  }

  pdf.setDrawColor(11, 32, 56);
  pdf.setLineWidth(0.016);
  pdf.setTextColor(11, 32, 56);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  page.points.forEach((point) => {
    pdf.circle(toInches(point.x), toInches(point.y), toInches(7), "S");
    pdf.text(String(point.label), toInches(point.x), toInches(point.y), {
      align: "center",
      baseline: "middle"
    });
  });
}

export function buildDotSvgMarkup(
  page,
  trim,
  theme,
  { dotCanvasPpi = 100, escapeXml, drawMotifGuideSvgMarkup } = {}
) {
  if (!page) return "";
  const escape = escapeXml || ((value) => String(value || ""));
  const drawGuideMarkup = drawMotifGuideSvgMarkup || (() => "");

  const marginX = page.marginX ?? Math.max(30, Math.round(0.4 * dotCanvasPpi));
  const marginY = page.marginY ?? Math.max(30, Math.round(0.45 * dotCanvasPpi));
  const borderWidth = page.width - marginX * 2;
  const borderHeight = page.height - marginY * 2;
  const title = escape(page.title);
  const themeText = escape(theme);
  const heading = escape(page.title || theme || "Dot Marker");
  const sceneLine = escape(page.scene?.caption || "");
  const aiLayerUrl = page.aiReferenceLineArtUrl || page.aiReferenceUrl || "";
  const aiImageTag =
    aiLayerUrl && typeof aiLayerUrl === "string"
      ? `<image href="${escape(aiLayerUrl)}" x="${marginX}" y="${marginY}" width="${borderWidth}" height="${borderHeight}" preserveAspectRatio="xMidYMid slice" opacity="0.68" />`
      : "";
  const motifMarkup = (page.motifs || []).map((motif) => drawGuideMarkup(motif)).join("\n");
  const pointMarkup = page.points
    .map(
      (point) => `
    <g id="dot-${point.id}">
      <circle cx="${point.x}" cy="${point.y}" r="${point.radius}" fill="#ffffff" stroke="#09182c" stroke-width="2.2" />
      <text x="${point.x}" y="${point.y}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="#09182c">${point.label}</text>
    </g>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${trim.widthIn}in" height="${trim.heightIn}in" viewBox="0 0 ${page.width} ${page.height}" role="img" aria-label="${title}">
  <title>${title}</title>
  <desc>Dot marker coloring page theme: ${themeText}</desc>
  <text x="${page.width / 2}" y="${Math.max(24, marginY * 0.55)}" text-anchor="middle" font-size="16" font-weight="700" fill="#10243b">${heading}</text>
  <text x="${page.width / 2}" y="${Math.max(40, marginY * 0.9)}" text-anchor="middle" font-size="11" font-weight="600" fill="#3b4b64">Color each numbered circle with a dot marker.</text>
  ${sceneLine ? `<text x="${page.width / 2}" y="${Math.max(54, marginY * 1.18)}" text-anchor="middle" font-size="10" font-weight="600" fill="#4a5870">${sceneLine}</text>` : ""}
  <rect x="${marginX}" y="${marginY}" width="${borderWidth}" height="${borderHeight}" fill="#ffffff" stroke="#e4e0d5" stroke-width="2" />
  ${aiImageTag}
  ${motifMarkup}
  ${pointMarkup}
</svg>`;
}

export function drawDotPageToPdf(
  pdf,
  page,
  { aiImageDataUrl = "", dotCanvasPpi = 100, drawRegionPdf } = {}
) {
  if (!page) return;
  const renderRegionPdf = drawRegionPdf || (() => {});

  const toInches = (value) => value / dotCanvasPpi;
  const widthIn = toInches(page.width);
  const heightIn = toInches(page.height);
  const marginX = toInches(page.marginX ?? 40);
  const marginY = toInches(page.marginY ?? 45);
  const borderW = widthIn - marginX * 2;
  const borderH = heightIn - marginY * 2;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, widthIn, heightIn, "F");
  pdf.setTextColor(16, 36, 59);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(page.title || "Dot Marker", widthIn / 2, Math.max(0.22, marginY * 0.55), { align: "center" });
  pdf.setTextColor(59, 75, 100);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Color each numbered circle with a dot marker.", widthIn / 2, Math.max(0.35, marginY * 0.9), { align: "center" });
  if (page.scene?.caption) {
    pdf.setTextColor(74, 88, 112);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.text(page.scene.caption, widthIn / 2, Math.max(0.46, marginY * 1.18), { align: "center" });
  }
  pdf.setDrawColor(228, 224, 213);
  pdf.setLineWidth(0.02);
  pdf.rect(marginX, marginY, borderW, borderH, "S");

  if (aiImageDataUrl) {
    try {
      let format = "PNG";
      if (aiImageDataUrl.startsWith("data:image/jpeg")) format = "JPEG";
      else if (aiImageDataUrl.startsWith("data:image/webp")) format = "WEBP";
      pdf.addImage(aiImageDataUrl, format, marginX, marginY, borderW, borderH, undefined, "FAST");
    } catch {
      // ignore image embedding errors and continue with vector output
    }
  }

  pdf.setDrawColor(52, 70, 98);
  pdf.setLineWidth(0.015);
  (page.motifs || []).forEach((motif) => {
    motif.regions.forEach((region) => renderRegionPdf(pdf, region, motif, toInches));
  });

  pdf.setDrawColor(9, 24, 44);
  pdf.setFillColor(255, 255, 255);
  pdf.setLineWidth(0.024);
  pdf.setTextColor(9, 24, 44);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  page.points.forEach((point) => {
    pdf.circle(toInches(point.x), toInches(point.y), toInches(point.radius), "FD");
    pdf.text(String(point.label), toInches(point.x), toInches(point.y), {
      align: "center",
      baseline: "middle"
    });
  });
}
