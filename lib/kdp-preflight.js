const MARGIN_RULES = [
  { minPages: 24, maxPages: 150, insideIn: 0.375 },
  { minPages: 151, maxPages: 300, insideIn: 0.5 },
  { minPages: 301, maxPages: 500, insideIn: 0.625 },
  { minPages: 501, maxPages: 700, insideIn: 0.75 },
  { minPages: 701, maxPages: 828, insideIn: 0.875 }
];

export function getRequiredInsideMarginIn(pageCount) {
  const clampedPageCount = Math.max(pageCount, MARGIN_RULES[0].minPages);
  return (
    MARGIN_RULES.find((rule) => clampedPageCount >= rule.minPages && clampedPageCount <= rule.maxPages)
      ?.insideIn || MARGIN_RULES[MARGIN_RULES.length - 1].insideIn
  );
}

export function getExpectedPageSizeIn(trimWidthIn, trimHeightIn, bleedEnabled) {
  if (!bleedEnabled) {
    return { widthIn: trimWidthIn, heightIn: trimHeightIn };
  }
  return {
    widthIn: trimWidthIn + 0.125,
    heightIn: trimHeightIn + 0.25
  };
}

function near(a, b, tolerance = 0.002) {
  return Math.abs(a - b) <= tolerance;
}

function makeItem(ruleId, severity, pass, detail, recommendation) {
  return {
    ruleId,
    severity,
    status: pass ? "PASS" : "FAIL",
    detail,
    recommendation
  };
}

export function runKdpPreflight(input) {
  const {
    trimWidthIn,
    trimHeightIn,
    pageWidthIn,
    pageHeightIn,
    pageCount,
    bleedEnabled,
    margins,
    lineWidthPt,
    fontSizePt,
    readingDirection = "LTR",
    hasRasterImages = false,
    minImageDpi = null,
    maxImageDpi = null
  } = input;

  const items = [];
  const expectedSize = getExpectedPageSizeIn(trimWidthIn, trimHeightIn, bleedEnabled);
  const outsideMin = bleedEnabled ? 0.375 : 0.25;
  const topBottomMin = bleedEnabled ? 0.375 : 0.25;
  const insideMin = getRequiredInsideMarginIn(pageCount);

  items.push(
    makeItem(
      "QC-PR-SIZE",
      "error",
      near(pageWidthIn, expectedSize.widthIn) && near(pageHeightIn, expectedSize.heightIn),
      `Page size is ${pageWidthIn.toFixed(3)} x ${pageHeightIn.toFixed(3)} in; expected ${expectedSize.widthIn.toFixed(3)} x ${expectedSize.heightIn.toFixed(3)} in (${bleedEnabled ? "bleed" : "no bleed"}).`,
      "Match manuscript page size to trim and bleed settings before upload."
    )
  );

  items.push(
    makeItem(
      "QC-PR-COUNT",
      "error",
      pageCount >= 24,
      `Page count is ${pageCount}. KDP paperback minimum is 24 pages.`,
      "Increase page count to at least 24."
    )
  );

  items.push(
    makeItem(
      "QC-PR-COUNT-EVEN",
      "warning",
      pageCount % 2 === 0,
      `Page count is ${pageCount}. KDP rounds to an even page count if needed.`,
      "Prefer exporting an even page count for predictable pagination."
    )
  );

  items.push(
    makeItem(
      "QC-PR-MARGIN-INSIDE",
      "error",
      margins.insideIn >= insideMin,
      `Inside margin is ${margins.insideIn.toFixed(3)} in; minimum is ${insideMin.toFixed(3)} in for ${pageCount} pages.`,
      "Increase inside (gutter) margin to meet current page-count band."
    )
  );

  items.push(
    makeItem(
      "QC-PR-MARGIN-OUTSIDE",
      "error",
      margins.outsideIn >= outsideMin,
      `Outside margin is ${margins.outsideIn.toFixed(3)} in; minimum is ${outsideMin.toFixed(3)} in.`,
      "Increase outside margin."
    )
  );

  items.push(
    makeItem(
      "QC-PR-MARGIN-TB",
      "error",
      margins.topIn >= topBottomMin && margins.bottomIn >= topBottomMin,
      `Top/Bottom margins are ${margins.topIn.toFixed(3)} / ${margins.bottomIn.toFixed(3)} in; minimum is ${topBottomMin.toFixed(3)} in.`,
      "Increase top and/or bottom margin to meet minimum."
    )
  );

  items.push(
    makeItem(
      "QC-PR-LINE",
      "error",
      lineWidthPt >= 0.75,
      `Minimum line width is ${lineWidthPt.toFixed(2)} pt; KDP minimum is 0.75 pt.`,
      "Use thicker strokes for print reliability."
    )
  );

  items.push(
    makeItem(
      "QC-PR-FONT",
      "error",
      fontSizePt >= 7,
      `Minimum font size is ${fontSizePt.toFixed(2)} pt; KDP minimum is 7 pt.`,
      "Increase label/body text size."
    )
  );

  if (hasRasterImages) {
    const minDpiPass = typeof minImageDpi === "number" && minImageDpi >= 300;
    items.push(
      makeItem(
        "QC-PR-DPI-MIN",
        "error",
        minDpiPass,
        `Minimum raster image DPI is ${minImageDpi ?? "N/A"}; KDP minimum is 300 DPI.`,
        "Use 300+ DPI source images."
      )
    );

    const maxDpiOk = typeof maxImageDpi !== "number" || maxImageDpi <= 600;
    items.push(
      makeItem(
        "QC-PR-DPI-MAX",
        "warning",
        maxDpiOk,
        `Maximum raster image DPI is ${maxImageDpi ?? "N/A"}; KDP recommends keeping near 600 DPI max.`,
        "Downsample very high DPI images if processing/upload is slow."
      )
    );
  } else {
    items.push(
      makeItem(
        "QC-PR-DPI-VECTOR",
        "info",
        true,
        "Interior uses vector elements for current export path; DPI check is not applicable to vectors.",
        "If raster images are added later, run the DPI checks."
      )
    );
  }

  items.push(
    makeItem(
      "QC-PR-DIR",
      "error",
      readingDirection === "LTR" || readingDirection === "RTL",
      `Reading direction is set to ${readingDirection}.`,
      "Use a supported reading direction and consistent pagination parity."
    )
  );

  const summary = items.reduce(
    (acc, item) => {
      if (item.status === "FAIL" && item.severity === "error") acc.errors += 1;
      if (item.status === "FAIL" && item.severity === "warning") acc.warnings += 1;
      if (item.severity === "info") acc.infos += 1;
      return acc;
    },
    { errors: 0, warnings: 0, infos: 0 }
  );

  return {
    items,
    summary: {
      ...summary,
      passed: summary.errors === 0
    }
  };
}
