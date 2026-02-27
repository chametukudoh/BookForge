import { getMotifAssetPaths, toAbsoluteRegion } from "./generators";

export function drawMotifAssetSvgNodes(motif, keyPrefix) {
  const paths = getMotifAssetPaths(motif);
  if (!paths.length) return null;
  return (
    <g
      key={`${keyPrefix}-asset`}
      className="dot-asset"
      transform={`translate(${motif.x} ${motif.y}) scale(${motif.w / 100} ${motif.h / 100})`}
    >
      {paths.map((pathData, idx) => (
        <path key={`${keyPrefix}-path-${idx}`} className="dot-asset-path" d={pathData} />
      ))}
    </g>
  );
}

export function drawMotifAssetSvgMarkup(motif) {
  const paths = getMotifAssetPaths(motif);
  if (!paths.length) return "";
  const pathMarkup = paths
    .map((pathData) => `<path d="${pathData}" fill="none" stroke="#344662" stroke-width="3" />`)
    .join("");
  return `<g transform="translate(${motif.x} ${motif.y}) scale(${motif.w / 100} ${motif.h / 100})">${pathMarkup}</g>`;
}

export function drawMotifGuideSvgNodes(motif, keyPrefix) {
  const assetNodes = drawMotifAssetSvgNodes(motif, keyPrefix);
  if (assetNodes) return assetNodes;
  return motif.regions.map((region, regionIdx) =>
    drawRegionSvgNode(region, motif, `${keyPrefix}-r${regionIdx}`)
  );
}

export function drawMotifGuideSvgMarkup(motif) {
  const assetMarkup = drawMotifAssetSvgMarkup(motif);
  if (assetMarkup) return assetMarkup;
  return motif.regions.map((region) => drawRegionSvgMarkup(region, motif)).join("");
}

export function drawRegionSvgNode(region, motif, key) {
  const absolute = toAbsoluteRegion(region, motif);
  if (absolute.kind === "circle") {
    return <circle key={key} className="dot-guide" cx={absolute.cx} cy={absolute.cy} r={absolute.r} />;
  }
  if (absolute.kind === "ellipse") {
    return (
      <ellipse
        key={key}
        className="dot-guide"
        cx={absolute.cx}
        cy={absolute.cy}
        rx={absolute.rx}
        ry={absolute.ry}
      />
    );
  }
  if (absolute.kind === "rect") {
    return (
      <rect
        key={key}
        className="dot-guide"
        x={absolute.x}
        y={absolute.y}
        width={absolute.w}
        height={absolute.h}
        rx={absolute.rx || 0}
      />
    );
  }
  if (absolute.kind === "polygon") {
    const pointsAttr = absolute.points.map((point) => `${point[0]},${point[1]}`).join(" ");
    return <polygon key={key} className="dot-guide" points={pointsAttr} />;
  }
  return null;
}

export function drawRegionSvgMarkup(region, motif) {
  const absolute = toAbsoluteRegion(region, motif);
  if (absolute.kind === "circle") {
    return `<circle cx="${absolute.cx}" cy="${absolute.cy}" r="${absolute.r}" fill="none" stroke="#b7bfca" stroke-width="1.5" />`;
  }
  if (absolute.kind === "ellipse") {
    return `<ellipse cx="${absolute.cx}" cy="${absolute.cy}" rx="${absolute.rx}" ry="${absolute.ry}" fill="none" stroke="#b7bfca" stroke-width="1.5" />`;
  }
  if (absolute.kind === "rect") {
    return `<rect x="${absolute.x}" y="${absolute.y}" width="${absolute.w}" height="${absolute.h}" rx="${absolute.rx || 0}" fill="none" stroke="#b7bfca" stroke-width="1.5" />`;
  }
  if (absolute.kind === "polygon") {
    const pointsAttr = absolute.points.map((point) => `${point[0]},${point[1]}`).join(" ");
    return `<polygon points="${pointsAttr}" fill="none" stroke="#b7bfca" stroke-width="1.5" />`;
  }
  return "";
}

export function drawRegionPdf(doc, region, motif, toInches) {
  const absolute = toAbsoluteRegion(region, motif);
  if (absolute.kind === "circle") {
    doc.circle(toInches(absolute.cx), toInches(absolute.cy), toInches(absolute.r), "S");
    return;
  }
  if (absolute.kind === "ellipse") {
    doc.ellipse(
      toInches(absolute.cx),
      toInches(absolute.cy),
      toInches(absolute.rx),
      toInches(absolute.ry),
      "S"
    );
    return;
  }
  if (absolute.kind === "rect") {
    const rx = toInches(absolute.rx || 0);
    if (rx > 0) {
      doc.roundedRect(
        toInches(absolute.x),
        toInches(absolute.y),
        toInches(absolute.w),
        toInches(absolute.h),
        rx,
        rx,
        "S"
      );
    } else {
      doc.rect(toInches(absolute.x), toInches(absolute.y), toInches(absolute.w), toInches(absolute.h), "S");
    }
    return;
  }
  if (absolute.kind === "polygon") {
    for (let i = 0; i < absolute.points.length; i += 1) {
      const [x1, y1] = absolute.points[i];
      const [x2, y2] = absolute.points[(i + 1) % absolute.points.length];
      doc.line(toInches(x1), toInches(y1), toInches(x2), toInches(y2));
    }
  }
}
