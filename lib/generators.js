/**
 * Pure generator and utility functions extracted from page.js.
 * No React hooks or DOM dependencies — these are all pure data transforms.
 */

import {
  DOT_TO_DOT_AUDIENCE_PROFILES,
  buildPathFromNormalizedTrace,
  buildBestDotToDotPath,
  getDotToDotDifficulty as getDotToDotDifficultyProfile,
  getDotToDotPathMetrics
} from "./dot-to-dot-core";
import { extractImageTraceFromImageData } from "./dot-to-dot-image";
import {
  normalizeLineArtLibrary,
  selectLineArtAssetsForPages
} from "./dot-to-dot-library.js";

import {
  DIRECTIONS,
  ORTHO_DIRECTIONS,
  OPPOSITE,
  ALPHABET,
  STARTER_WORDS,
  DOT_CANVAS_PPI,
  AI_EXPORT_PPI,
  KDP_TRIM_SIZES,
  DEFAULT_DOT_CONFIG,
  DEFAULT_DOT_TO_DOT_CONFIG,
  clamp,
  randomBetween,
  randomLetter,
  createSeededRandom,
  getTrimSize,
  safeSlug,
  escapeXml,
  cloneData,
  generateLocalId,
  downloadTextFile,
  downloadDataUrlFile,
  badgeFromTone
} from "./constants";

// Re-export everything from constants so consumers can import from either
export {
  DIRECTIONS,
  ORTHO_DIRECTIONS,
  OPPOSITE,
  ALPHABET,
  STARTER_WORDS,
  DOT_CANVAS_PPI,
  AI_EXPORT_PPI,
  KDP_TRIM_SIZES,
  DEFAULT_DOT_CONFIG,
  DEFAULT_DOT_TO_DOT_CONFIG,
  clamp,
  randomBetween,
  randomLetter,
  createSeededRandom,
  getTrimSize,
  safeSlug,
  escapeXml,
  cloneData,
  generateLocalId,
  downloadTextFile,
  downloadDataUrlFile,
  badgeFromTone
};

// Re-export dot-to-dot core
export { extractImageTraceFromImageData };

// ── Dot Motifs ──────────────────────────────────────────────

export const DOT_MOTIFS = {
  cat: {
    label: "Cat",
    tags: ["cat", "pet", "animal", "farm", "cute"],
    regions: [
      { kind: "circle", cx: 0.5, cy: 0.6, r: 0.3 },
      { kind: "polygon", points: [[0.26, 0.36], [0.17, 0.1], [0.39, 0.26]] },
      { kind: "polygon", points: [[0.74, 0.36], [0.61, 0.26], [0.83, 0.1]] }
    ]
  },
  fish: {
    label: "Fish",
    tags: ["fish", "ocean", "sea", "water", "animal"],
    regions: [
      { kind: "ellipse", cx: 0.45, cy: 0.55, rx: 0.28, ry: 0.2 },
      { kind: "polygon", points: [[0.7, 0.55], [0.93, 0.37], [0.93, 0.73]] }
    ]
  },
  butterfly: {
    label: "Butterfly",
    tags: ["butterfly", "spring", "garden", "insect", "nature"],
    regions: [
      { kind: "ellipse", cx: 0.35, cy: 0.45, rx: 0.2, ry: 0.18 },
      { kind: "ellipse", cx: 0.35, cy: 0.72, rx: 0.2, ry: 0.16 },
      { kind: "ellipse", cx: 0.65, cy: 0.45, rx: 0.2, ry: 0.18 },
      { kind: "ellipse", cx: 0.65, cy: 0.72, rx: 0.2, ry: 0.16 },
      { kind: "rect", x: 0.46, y: 0.32, w: 0.08, h: 0.5, rx: 0.03 }
    ]
  },
  flower: {
    label: "Flower",
    tags: ["flower", "garden", "nature", "spring"],
    regions: [
      { kind: "circle", cx: 0.5, cy: 0.53, r: 0.11 },
      { kind: "circle", cx: 0.5, cy: 0.29, r: 0.12 },
      { kind: "circle", cx: 0.72, cy: 0.53, r: 0.12 },
      { kind: "circle", cx: 0.5, cy: 0.77, r: 0.12 },
      { kind: "circle", cx: 0.28, cy: 0.53, r: 0.12 },
      { kind: "rect", x: 0.47, y: 0.77, w: 0.06, h: 0.19, rx: 0.03 }
    ]
  },
  tree: {
    label: "Tree",
    tags: ["tree", "forest", "nature", "outdoor"],
    regions: [
      { kind: "rect", x: 0.44, y: 0.58, w: 0.12, h: 0.3, rx: 0.03 },
      { kind: "circle", cx: 0.5, cy: 0.5, r: 0.21 },
      { kind: "circle", cx: 0.34, cy: 0.57, r: 0.15 },
      { kind: "circle", cx: 0.66, cy: 0.57, r: 0.15 }
    ]
  },
  car: {
    label: "Car",
    tags: ["car", "vehicle", "transport", "city"],
    regions: [
      { kind: "rect", x: 0.18, y: 0.54, w: 0.64, h: 0.22, rx: 0.06 },
      { kind: "rect", x: 0.33, y: 0.4, w: 0.34, h: 0.16, rx: 0.06 },
      { kind: "circle", cx: 0.3, cy: 0.78, r: 0.1 },
      { kind: "circle", cx: 0.7, cy: 0.78, r: 0.1 }
    ]
  },
  truck: {
    label: "Truck",
    tags: ["truck", "vehicle", "construction", "transport"],
    regions: [
      { kind: "rect", x: 0.16, y: 0.52, w: 0.44, h: 0.24, rx: 0.04 },
      { kind: "rect", x: 0.6, y: 0.48, w: 0.24, h: 0.28, rx: 0.04 },
      { kind: "circle", cx: 0.3, cy: 0.8, r: 0.09 },
      { kind: "circle", cx: 0.52, cy: 0.8, r: 0.09 },
      { kind: "circle", cx: 0.74, cy: 0.8, r: 0.09 }
    ]
  },
  rocket: {
    label: "Rocket",
    tags: ["rocket", "space", "planet", "galaxy"],
    regions: [
      { kind: "rect", x: 0.42, y: 0.26, w: 0.16, h: 0.47, rx: 0.08 },
      { kind: "polygon", points: [[0.42, 0.26], [0.58, 0.26], [0.5, 0.07]] },
      { kind: "polygon", points: [[0.42, 0.6], [0.27, 0.78], [0.42, 0.75]] },
      { kind: "polygon", points: [[0.58, 0.6], [0.73, 0.78], [0.58, 0.75]] },
      { kind: "circle", cx: 0.5, cy: 0.46, r: 0.07 }
    ]
  },
  dinosaur: {
    label: "Dinosaur",
    tags: ["dino", "dinosaur", "jurassic", "animal"],
    regions: [
      { kind: "ellipse", cx: 0.48, cy: 0.63, rx: 0.29, ry: 0.2 },
      { kind: "circle", cx: 0.69, cy: 0.41, r: 0.12 },
      { kind: "rect", x: 0.35, y: 0.73, w: 0.08, h: 0.16, rx: 0.02 },
      { kind: "rect", x: 0.53, y: 0.73, w: 0.08, h: 0.16, rx: 0.02 },
      { kind: "polygon", points: [[0.21, 0.56], [0.05, 0.5], [0.16, 0.67]] }
    ]
  },
  planet: {
    label: "Planet",
    tags: ["space", "planet", "galaxy", "star"],
    regions: [
      { kind: "circle", cx: 0.5, cy: 0.52, r: 0.24 },
      { kind: "ellipse", cx: 0.5, cy: 0.56, rx: 0.38, ry: 0.1 }
    ]
  },
  star: {
    label: "Star",
    tags: ["star", "space", "night", "holiday"],
    regions: [
      { kind: "polygon", points: [[0.5, 0.1], [0.61, 0.39], [0.9, 0.39], [0.66, 0.56], [0.76, 0.86], [0.5, 0.67], [0.24, 0.86], [0.34, 0.56], [0.1, 0.39], [0.39, 0.39]] }
    ]
  },
  pumpkin: {
    label: "Pumpkin",
    tags: ["pumpkin", "halloween", "autumn", "holiday"],
    regions: [
      { kind: "circle", cx: 0.5, cy: 0.58, r: 0.23 },
      { kind: "circle", cx: 0.36, cy: 0.58, r: 0.19 },
      { kind: "circle", cx: 0.64, cy: 0.58, r: 0.19 },
      { kind: "rect", x: 0.46, y: 0.25, w: 0.08, h: 0.13, rx: 0.02 }
    ]
  },
  snowman: {
    label: "Snowman",
    tags: ["snow", "winter", "holiday", "christmas"],
    regions: [
      { kind: "circle", cx: 0.5, cy: 0.72, r: 0.21 },
      { kind: "circle", cx: 0.5, cy: 0.44, r: 0.16 },
      { kind: "circle", cx: 0.5, cy: 0.22, r: 0.1 }
    ]
  },
  heart: {
    label: "Heart",
    tags: ["heart", "love", "valentine", "cute"],
    regions: [
      { kind: "circle", cx: 0.39, cy: 0.38, r: 0.18 },
      { kind: "circle", cx: 0.61, cy: 0.38, r: 0.18 },
      { kind: "polygon", points: [[0.22, 0.43], [0.78, 0.43], [0.5, 0.88]] }
    ]
  }
};

export const DOT_MOTIF_ASSETS = {
  cat: { paths: ["M20 75 Q20 38 50 32 Q80 38 80 75 Q80 90 50 90 Q20 90 20 75 Z","M30 38 L22 18 L40 30 Z","M70 38 L60 30 L78 18 Z","M38 64 Q50 70 62 64","M35 56 H45 M55 56 H65","M50 64 V74"] },
  fish: { paths: ["M16 56 Q30 34 55 36 Q72 38 84 56 Q72 74 55 76 Q30 78 16 56 Z","M84 56 L97 40 L97 72 Z","M30 52 Q42 46 55 52","M36 58 Q45 62 55 58","M28 54 A3 3 0 1 0 27.9 54"] },
  butterfly: { paths: ["M50 22 V84","M50 34 Q30 22 20 40 Q18 54 34 58 Q44 60 50 52","M50 34 Q70 22 80 40 Q82 54 66 58 Q56 60 50 52","M50 58 Q34 60 28 78 Q34 92 50 82","M50 58 Q66 60 72 78 Q66 92 50 82","M50 22 L42 12 M50 22 L58 12"] },
  flower: { paths: ["M50 54 A10 10 0 1 0 49.9 54","M50 28 A11 11 0 1 0 49.9 28","M72 54 A11 11 0 1 0 71.9 54","M50 80 A11 11 0 1 0 49.9 80","M28 54 A11 11 0 1 0 27.9 54","M50 66 V96"] },
  tree: { paths: ["M46 62 H54 V94 H46 Z","M50 24 Q30 28 28 48 Q35 62 50 60 Q65 62 72 48 Q70 28 50 24 Z","M34 54 Q25 58 26 68 Q34 78 48 72","M66 54 Q75 58 74 68 Q66 78 52 72"] },
  car: { paths: ["M16 64 H84 V80 H16 Z","M30 64 L40 50 H64 L74 64 Z","M30 80 A8 8 0 1 0 29.9 80","M70 80 A8 8 0 1 0 69.9 80","M40 55 H64"] },
  truck: { paths: ["M14 62 H58 V80 H14 Z","M58 62 H82 V80 H58 Z","M58 62 V50 H76 V62","M26 80 A7 7 0 1 0 25.9 80","M50 80 A7 7 0 1 0 49.9 80","M74 80 A7 7 0 1 0 73.9 80"] },
  rocket: { paths: ["M50 16 L60 34 V70 L50 82 L40 70 V34 Z","M40 56 L26 72 L40 70 Z","M60 56 L74 72 L60 70 Z","M50 44 A6 6 0 1 0 49.9 44","M46 82 L50 96 L54 82"] },
  dinosaur: { paths: ["M18 68 Q28 54 44 56 Q58 56 66 48 Q76 40 86 46 Q86 56 78 62 Q84 70 78 78 Q64 84 46 82 Q24 82 18 68 Z","M46 82 V94 M62 82 V94","M20 68 Q10 62 12 54 Q18 50 24 56","M72 52 A2.5 2.5 0 1 0 71.9 52"] },
  planet: { paths: ["M50 54 A18 18 0 1 0 49.9 54","M20 58 Q50 42 80 58","M24 62 Q50 48 76 62"] },
  star: { paths: ["M50 14 L58 38 L84 38 L63 54 L71 80 L50 64 L29 80 L37 54 L16 38 L42 38 Z"] },
  pumpkin: { paths: ["M50 84 Q28 84 24 60 Q24 36 50 36 Q76 36 76 60 Q72 84 50 84 Z","M38 84 Q32 74 32 60 Q32 46 38 36","M62 84 Q68 74 68 60 Q68 46 62 36","M50 36 V24"] },
  snowman: { paths: ["M50 78 A18 18 0 1 0 49.9 78","M50 50 A14 14 0 1 0 49.9 50","M50 28 A10 10 0 1 0 49.9 28","M42 18 H58 M44 15 H56"] },
  heart: { paths: ["M50 86 L22 54 Q22 36 38 36 Q46 36 50 44 Q54 36 62 36 Q78 36 78 54 Z"] }
};

// ── Theme packs & scene matrix ──────────────────────────────

export const DOT_THEME_PACKS = [
  { id: "farm", label: "Farm & Animals", keywords: ["farm", "animal", "pet", "zoo", "jungle", "safari", "friends"], motifIds: ["cat", "butterfly", "flower", "tree"] },
  { id: "vehicles", label: "Vehicles", keywords: ["vehicle", "car", "truck", "transport", "construction", "road"], motifIds: ["car", "truck"] },
  { id: "ocean", label: "Ocean", keywords: ["ocean", "sea", "water", "underwater", "beach", "marine"], motifIds: ["fish"] },
  { id: "space", label: "Space", keywords: ["space", "planet", "rocket", "galaxy", "moon", "star"], motifIds: ["rocket", "planet", "star"] },
  { id: "dino", label: "Dinosaurs", keywords: ["dino", "dinosaur", "jurassic"], motifIds: ["dinosaur"] },
  { id: "holiday", label: "Holiday", keywords: ["christmas", "holiday", "halloween", "autumn", "winter", "valentine", "love"], motifIds: ["pumpkin", "snowman", "heart", "star"] },
  { id: "generic", label: "General", keywords: [], motifIds: ["cat", "car", "flower", "rocket", "fish", "tree", "star", "heart"] }
];

export const DOT_NICHE_OPTIONS = [
  { id: "auto", label: "Auto (Infer from title/theme)" },
  ...DOT_THEME_PACKS.filter((p) => p.id !== "generic").map((p) => ({ id: p.id, label: p.label })),
  { id: "generic", label: "General Mixed" }
];

const DOT_TITLE_STOPWORDS = new Set(["book","coloring","dot","marker","pages","kids","toddlers","for","and","the","with","ages","age"]);

const DOT_TITLE_MOTIF_RULES = [
  { keywords: ["cat", "kitten", "kitty"], motifIds: ["cat"] },
  { keywords: ["fish", "shark", "whale", "dolphin", "ocean", "sea"], motifIds: ["fish"] },
  { keywords: ["butterfly", "bug", "insect"], motifIds: ["butterfly"] },
  { keywords: ["flower", "garden", "rose", "tulip"], motifIds: ["flower"] },
  { keywords: ["tree", "forest", "woods", "nature"], motifIds: ["tree"] },
  { keywords: ["car", "racecar", "vehicle"], motifIds: ["car"] },
  { keywords: ["truck", "tractor", "construction"], motifIds: ["truck"] },
  { keywords: ["rocket", "astronaut", "space"], motifIds: ["rocket"] },
  { keywords: ["planet", "saturn", "moon"], motifIds: ["planet"] },
  { keywords: ["star"], motifIds: ["star"] },
  { keywords: ["dino", "dinosaur", "trex", "jurassic"], motifIds: ["dinosaur"] },
  { keywords: ["pumpkin", "halloween"], motifIds: ["pumpkin"] },
  { keywords: ["snowman", "winter", "christmas", "xmas"], motifIds: ["snowman"] },
  { keywords: ["heart", "love", "valentine"], motifIds: ["heart"] }
];

const DOT_SCENE_MATRIX = {
  farm: { actions: ["playing", "dancing", "exploring", "resting", "smiling"], settings: ["in a sunny field", "near a barn", "in a flower meadow", "by a little pond"], moods: ["happy", "playful", "gentle", "cheerful"] },
  vehicles: { actions: ["racing", "rolling", "delivering", "adventuring", "heading home"], settings: ["on a city road", "near a bridge", "at a construction site", "on a winding road"], moods: ["exciting", "fast", "busy", "bold"] },
  ocean: { actions: ["swimming", "splashing", "drifting", "exploring", "gliding"], settings: ["under the sea", "near coral", "in a calm bay", "around sea plants"], moods: ["peaceful", "playful", "bright", "bubbly"] },
  space: { actions: ["blasting off", "floating", "orbiting", "exploring", "zooming"], settings: ["among stars", "near planets", "in deep space", "across the galaxy"], moods: ["adventurous", "curious", "bold", "imaginative"] },
  dino: { actions: ["stomping", "roaring", "exploring", "marching", "playing"], settings: ["in a prehistoric valley", "near volcano hills", "in a fern jungle", "by rocky cliffs"], moods: ["wild", "energetic", "curious", "strong"] },
  holiday: { actions: ["celebrating", "sharing", "decorating", "waving", "posing"], settings: ["at a festive party", "in a snowy village", "in a pumpkin patch", "under holiday lights"], moods: ["festive", "warm", "joyful", "cozy"] },
  generic: { actions: ["exploring", "playing", "dancing", "smiling", "adventuring"], settings: ["in a fun scene", "outdoors", "in a bright world", "in a playful landscape"], moods: ["happy", "energetic", "friendly", "cheerful"] }
};

const DOT_CAMERA_ANGLES = ["wide view", "close focus", "storybook angle", "front view"];

export const DOT_TO_DOT_DIFFICULTY = DOT_TO_DOT_AUDIENCE_PROFILES;

// ── Geometry helpers ────────────────────────────────────────

export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function regionContains(region, x, y) {
  if (region.kind === "circle") { const dx = x - region.cx, dy = y - region.cy; return dx*dx + dy*dy <= region.r*region.r; }
  if (region.kind === "ellipse") { const dx = (x - region.cx) / region.rx, dy = (y - region.cy) / region.ry; return dx*dx + dy*dy <= 1; }
  if (region.kind === "rect") return x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h;
  if (region.kind === "polygon") return pointInPolygon(x, y, region.points);
  return false;
}

export function regionArea(region) {
  if (region.kind === "circle") return Math.PI * region.r * region.r;
  if (region.kind === "ellipse") return Math.PI * region.rx * region.ry;
  if (region.kind === "rect") return region.w * region.h;
  if (region.kind === "polygon") {
    let sum = 0;
    for (let i = 0; i < region.points.length; i += 1) {
      const [x1, y1] = region.points[i];
      const [x2, y2] = region.points[(i + 1) % region.points.length];
      sum += x1 * y2 - y1 * x2;
    }
    return Math.abs(sum) / 2;
  }
  return 0;
}

export function regionBounds(region) {
  if (region.kind === "circle") return { minX: region.cx - region.r, maxX: region.cx + region.r, minY: region.cy - region.r, maxY: region.cy + region.r };
  if (region.kind === "ellipse") return { minX: region.cx - region.rx, maxX: region.cx + region.rx, minY: region.cy - region.ry, maxY: region.cy + region.ry };
  if (region.kind === "rect") return { minX: region.x, maxX: region.x + region.w, minY: region.y, maxY: region.y + region.h };
  if (region.kind === "polygon") {
    const xs = region.points.map((p) => p[0]), ys = region.points.map((p) => p[1]);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }
  return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
}

export function toAbsoluteRegion(region, motif) {
  if (region.kind === "circle") return { kind: "circle", cx: motif.x + region.cx * motif.w, cy: motif.y + region.cy * motif.h, r: Math.min(motif.w, motif.h) * region.r };
  if (region.kind === "ellipse") return { kind: "ellipse", cx: motif.x + region.cx * motif.w, cy: motif.y + region.cy * motif.h, rx: motif.w * region.rx, ry: motif.h * region.ry };
  if (region.kind === "rect") return { kind: "rect", x: motif.x + region.x * motif.w, y: motif.y + region.y * motif.h, w: motif.w * region.w, h: motif.h * region.h, rx: Math.min(motif.w, motif.h) * (region.rx || 0) };
  if (region.kind === "polygon") return { kind: "polygon", points: region.points.map((p) => [motif.x + p[0] * motif.w, motif.y + p[1] * motif.h]) };
  return region;
}

// ── Theme resolution ────────────────────────────────────────

function themeTokens(theme) {
  return String(theme || "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
}

function getThemePackById(nicheId) {
  return DOT_THEME_PACKS.find((p) => p.id === nicheId) || null;
}

function tokenMatchesKeyword(token, keyword) {
  return token === keyword || token.includes(keyword) || keyword.includes(token);
}

function resolveMotifPoolFromKeywords(tokens, allowedMotifs) {
  const scores = new Map();
  DOT_TITLE_MOTIF_RULES.forEach((rule) => {
    if (!rule.keywords.some((kw) => tokens.some((t) => tokenMatchesKeyword(t, kw)))) return;
    rule.motifIds.forEach((id) => { if (allowedMotifs.includes(id)) scores.set(id, (scores.get(id) || 0) + 4); });
  });
  allowedMotifs.forEach((id) => {
    const motif = DOT_MOTIFS[id]; if (!motif) return;
    const s = motif.tags.reduce((a, tag) => a + (tokens.some((t) => tokenMatchesKeyword(t, tag)) ? 1 : 0), 0);
    if (s > 0) scores.set(id, (scores.get(id) || 0) + s);
  });
  return [...scores.entries()].filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
}

export function resolveThemeProfile(theme, nicheId = "auto") {
  const normalized = String(theme || "").toLowerCase();
  const explicit = nicheId && nicheId !== "auto" ? getThemePackById(nicheId) : null;
  let best = explicit || DOT_THEME_PACKS[DOT_THEME_PACKS.length - 1];
  let bestScore = explicit ? 100 : -1;
  if (!explicit) {
    DOT_THEME_PACKS.forEach((p) => {
      const s = p.keywords.reduce((a, kw) => a + (normalized.includes(kw) ? 1 : 0), 0);
      if (s > bestScore) { bestScore = s; best = p; }
    });
  }
  const confidence = explicit ? "high" : bestScore > 0 ? "medium" : best.id === "generic" ? "low" : "medium";
  return { packId: best.id, packLabel: best.label, motifPool: [...(best?.motifIds || [])], keywordScore: bestScore, confidence };
}

export function inferDotThemeFromTitle(bookTitle, nicheHint, nicheId = "auto") {
  const title = String(bookTitle || "").trim();
  const niche = String(nicheHint || "").trim();
  const combined = [niche, title].filter(Boolean).join(" ");
  const profile = resolveThemeProfile(combined || niche || title || "dot marker", nicheId);
  const filtered = themeTokens(combined).filter((t) => !DOT_TITLE_STOPWORDS.has(t));
  const strict = resolveMotifPoolFromKeywords(filtered, profile.motifPool);
  const motifPool = strict.length ? strict : [...profile.motifPool];
  const suggestedTheme = niche || (filtered.length ? filtered.slice(0, 4).join(" ") : profile.packLabel);
  const confidence = strict.length ? "high" : profile.confidence === "high" ? "medium" : profile.confidence;
  return { profile, motifPool, suggestedTheme, effectiveTheme: suggestedTheme || profile.packLabel, confidence };
}

// ── Word Search ─────────────────────────────────────────────

function makeEmptyGrid(size) { return Array.from({ length: size }, () => Array.from({ length: size }, () => "")); }

export function canPlaceWord(word, row, col, direction, grid, size) {
  const [dr, dc] = DIRECTIONS[direction];
  for (let i = 0; i < word.length; i += 1) { const rr = row + dr * i, cc = col + dc * i; if (rr < 0 || rr >= size || cc < 0 || cc >= size) return false; if (grid[rr][cc] && grid[rr][cc] !== word[i]) return false; }
  return true;
}

export function placeWord(word, row, col, direction, grid) {
  const [dr, dc] = DIRECTIONS[direction];
  for (let i = 0; i < word.length; i += 1) { grid[row + dr * i][col + dc * i] = word[i]; }
}

export function cellsForWord(entry) {
  const [dr, dc] = DIRECTIONS[entry.direction];
  return Array.from({ length: entry.text.length }, (_, i) => ({ row: entry.row + dr * i, col: entry.col + dc * i }));
}

export function createWordSearchState(size, words = STARTER_WORDS, randomFn = Math.random) {
  const s = Math.min(18, Math.max(10, Number(size) || 12));
  const grid = makeEmptyGrid(s);
  const placed = [];
  let nextId = 1;
  const dirs = Object.keys(DIRECTIONS);
  [...words].sort((a, b) => b.length - a.length).forEach((raw) => {
    const w = raw.toUpperCase().replace(/[^A-Z]/g, ""); if (w.length < 2) return;
    let ok = false;
    for (let t = 0; t < 260 && !ok; t += 1) {
      const d = dirs[Math.floor(randomFn() * dirs.length)], r = Math.floor(randomFn() * s), c = Math.floor(randomFn() * s);
      if (!canPlaceWord(w, r, c, d, grid, s)) continue;
      placeWord(w, r, c, d, grid); placed.push({ id: String(nextId), text: w, row: r, col: c, direction: d }); nextId += 1; ok = true;
    }
  });
  for (let r = 0; r < s; r += 1) for (let c = 0; c < s; c += 1) if (!grid[r][c]) grid[r][c] = randomLetter(randomFn);
  return { size: s, grid, words: placed, nextWordId: nextId, highlightedWordId: null, revision: 1 };
}

export function fillWordSearchGaps(grid) {
  return grid.map((row) => row.map((ch) => ch && /^[A-Z]$/.test(ch) ? ch : randomLetter()));
}

// ── Maze ────────────────────────────────────────────────────

export function generateMazeState(rowsInput, colsInput, randomFn = Math.random) {
  const rows = Math.min(40, Math.max(8, Number(rowsInput) || 16));
  const cols = Math.min(40, Math.max(8, Number(colsInput) || 16));
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ walls: { N: true, E: true, S: true, W: true }, visited: false })));
  const stack = [{ row: 0, col: 0 }]; cells[0][0].visited = true;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nbrs = [{ row: cur.row - 1, col: cur.col }, { row: cur.row + 1, col: cur.col }, { row: cur.row, col: cur.col - 1 }, { row: cur.row, col: cur.col + 1 }]
      .filter((n) => n.row >= 0 && n.row < rows && n.col >= 0 && n.col < cols && !cells[n.row][n.col].visited);
    if (!nbrs.length) { stack.pop(); continue; }
    const next = nbrs[Math.floor(randomFn() * nbrs.length)];
    // carve
    if (next.row === cur.row - 1) { cells[cur.row][cur.col].walls.N = false; cells[next.row][next.col].walls.S = false; }
    else if (next.row === cur.row + 1) { cells[cur.row][cur.col].walls.S = false; cells[next.row][next.col].walls.N = false; }
    else if (next.col === cur.col - 1) { cells[cur.row][cur.col].walls.W = false; cells[next.row][next.col].walls.E = false; }
    else if (next.col === cur.col + 1) { cells[cur.row][cur.col].walls.E = false; cells[next.row][next.col].walls.W = false; }
    cells[next.row][next.col].visited = true; stack.push(next);
  }
  cells.forEach((row) => row.forEach((c) => delete c.visited));
  return { rows, cols, cells, entrance: { row: 0, col: 0 }, exit: { row: rows - 1, col: cols - 1 }, solutionPath: [], revision: 1 };
}

export function solveMazePath(mazeState) {
  const queue = [mazeState.entrance];
  const visited = new Set([`${mazeState.entrance.row}:${mazeState.entrance.col}`]);
  const parent = new Map();
  while (queue.length) {
    const cur = queue.shift();
    if (cur.row === mazeState.exit.row && cur.col === mazeState.exit.col) {
      const path = []; let c = `${cur.row}:${cur.col}`;
      while (c) { const [r, cc] = c.split(":").map(Number); path.push({ row: r, col: cc }); c = parent.get(c); }
      return path.reverse();
    }
    const cell = mazeState.cells[cur.row][cur.col];
    Object.entries(ORTHO_DIRECTIONS).forEach(([dir, [dr, dc]]) => {
      if (cell.walls[dir]) return;
      const nr = cur.row + dr, nc = cur.col + dc;
      if (nr < 0 || nr >= mazeState.rows || nc < 0 || nc >= mazeState.cols) return;
      const key = `${nr}:${nc}`; if (visited.has(key)) return;
      visited.add(key); parent.set(key, `${cur.row}:${cur.col}`); queue.push({ row: nr, col: nc });
    });
  }
  return [];
}

export function validateMazeState(mazeState) {
  const queue = [mazeState.entrance];
  const visited = new Set([`${mazeState.entrance.row}:${mazeState.entrance.col}`]);
  while (queue.length) {
    const cur = queue.shift();
    const cell = mazeState.cells[cur.row][cur.col];
    Object.entries(ORTHO_DIRECTIONS).forEach(([dir, [dr, dc]]) => {
      if (cell.walls[dir]) return;
      const nr = cur.row + dr, nc = cur.col + dc;
      if (nr < 0 || nr >= mazeState.rows || nc < 0 || nc >= mazeState.cols) return;
      const key = `${nr}:${nc}`; if (visited.has(key)) return;
      visited.add(key); queue.push({ row: nr, col: nc });
    });
  }
  const total = mazeState.rows * mazeState.cols;
  const reachable = visited.has(`${mazeState.exit.row}:${mazeState.exit.col}`);
  const isolated = total - visited.size;
  if (!reachable) return { tone: "error", text: "Exit is unreachable from entrance." };
  if (isolated > 0) return { tone: "warn", text: `${isolated} isolated cells detected.` };
  return { tone: "ok", text: "Maze is fully connected and solvable." };
}

export function drawMazeCanvas(canvas, mazeState) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height, margin = 14;
  const cw = (w - margin * 2) / mazeState.cols, ch = (h - margin * 2) / mazeState.rows;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#10243b"; ctx.lineWidth = 2;
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  for (let r = 0; r < mazeState.rows; r += 1) for (let c = 0; c < mazeState.cols; c += 1) {
    const x = margin + c * cw, y = margin + r * ch, walls = mazeState.cells[r][c].walls;
    if (walls.N) line(x, y, x + cw, y); if (walls.E) line(x + cw, y, x + cw, y + ch);
    if (walls.S) line(x, y + ch, x + cw, y + ch); if (walls.W) line(x, y, x, y + ch);
  }
  const marker = (cell, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(margin + cell.col * cw + cw / 2, margin + cell.row * ch + ch / 2, Math.max(4, Math.min(cw, ch) * 0.2), 0, Math.PI * 2); ctx.fill(); };
  marker(mazeState.entrance, "#1b9e98"); marker(mazeState.exit, "#e85d2e");
  if (mazeState.solutionPath.length) {
    ctx.strokeStyle = "rgba(232, 93, 46, 0.75)"; ctx.lineWidth = Math.max(2, Math.min(cw, ch) * 0.2); ctx.beginPath();
    mazeState.solutionPath.forEach((s, i) => { const px = margin + s.col * cw + cw / 2, py = margin + s.row * ch + ch / 2; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.stroke();
  }
}

// ── Dot Marker Generation ───────────────────────────────────

function samplePointInRegion(region, randomFn = Math.random) {
  const bounds = regionBounds(region);
  for (let a = 0; a < 80; a += 1) { const x = randomBetween(bounds.minX, bounds.maxX, randomFn), y = randomBetween(bounds.minY, bounds.maxY, randomFn); if (regionContains(region, x, y)) return { x, y }; }
  return { x: clamp((bounds.minX + bounds.maxX) / 2, 0.05, 0.95), y: clamp((bounds.minY + bounds.maxY) / 2, 0.05, 0.95) };
}

function pickWeightedRegion(regions, randomFn = Math.random) {
  const weighted = regions.map((r) => ({ region: r, area: Math.max(0.0001, regionArea(r)) }));
  const total = weighted.reduce((s, i) => s + i.area, 0);
  let cursor = randomFn() * total;
  for (let i = 0; i < weighted.length; i += 1) { cursor -= weighted[i].area; if (cursor <= 0) return weighted[i].region; }
  return weighted[weighted.length - 1].region;
}

function createDotMotifSlots(count, x, y, w, h) {
  if (count <= 1) return [{ x: x + w * 0.2, y: y + h * 0.08, w: w * 0.6, h: h * 0.8 }];
  if (count === 2) return [{ x: x + w * 0.05, y: y + h * 0.12, w: w * 0.42, h: h * 0.74 }, { x: x + w * 0.53, y: y + h * 0.12, w: w * 0.42, h: h * 0.74 }];
  return [{ x: x + w * 0.03, y: y + h * 0.08, w: w * 0.42, h: h * 0.4 }, { x: x + w * 0.55, y: y + h * 0.08, w: w * 0.42, h: h * 0.4 }, { x: x + w * 0.24, y: y + h * 0.5, w: w * 0.52, h: h * 0.42 }];
}

function pickMotifCount(dotsPerPage) { return dotsPerPage <= 14 ? 1 : dotsPerPage <= 26 ? 2 : 3; }

function pickUniqueMotifs(pool, count, pageNumber, randomFn = Math.random) {
  if (!pool.length) return ["star"];
  if (pool.length <= count) return Array.from({ length: count }, (_, i) => pool[(pageNumber - 1 + i) % pool.length]);
  const selected = [], available = [...pool];
  while (selected.length < count && available.length) { const i = Math.floor(randomFn() * available.length); selected.push(available[i]); available.splice(i, 1); }
  return selected;
}

function jitterMotifSlot(slot, safeX, safeY, safeW, safeH, randomFn = Math.random) {
  const scale = randomBetween(0.88, 1.12, randomFn);
  const jx = slot.w * randomBetween(-0.08, 0.08, randomFn), jy = slot.h * randomBetween(-0.08, 0.08, randomFn);
  const w = slot.w * scale, h = slot.h * scale;
  return { x: clamp(slot.x + jx, safeX, safeX + safeW - w), y: clamp(slot.y + jy, safeY, safeY + safeH - h), w, h };
}

function createDotSceneBlueprint(config, profile, motifPool, motifCount, pageNumber, randomFn = Math.random) {
  const pack = DOT_SCENE_MATRIX[profile.packId] || DOT_SCENE_MATRIX.generic;
  const motifIds = pickUniqueMotifs(motifPool, motifCount, pageNumber, randomFn);
  const pick = (arr) => arr[(pageNumber - 1 + Math.floor(randomFn() * arr.length)) % arr.length];
  const action = pick(pack.actions), setting = pick(pack.settings), mood = pick(pack.moods), camera = pick(DOT_CAMERA_ANGLES);
  return { motifIds, action, setting, mood, camera, caption: `${action} ${setting}`, signature: `${profile.packId}|${motifIds.join("+")}|${action}|${setting}|${mood}|${camera}` };
}

export function generateDotPage(config, pageNumber, randomFn = Math.random) {
  const trim = getTrimSize(config.trimId);
  const w = Math.round(trim.widthIn * DOT_CANVAS_PPI), h = Math.round(trim.heightIn * DOT_CANVAS_PPI);
  const mx = Math.max(30, Math.round(0.4 * DOT_CANVAS_PPI)), my = Math.max(30, Math.round(0.45 * DOT_CANVAS_PPI));
  const profile = resolveThemeProfile(config.theme, config.nicheId);
  const pool = (Array.isArray(config.motifPool) ? config.motifPool.filter((id) => Boolean(DOT_MOTIFS[id])) : []).length
    ? config.motifPool.filter((id) => Boolean(DOT_MOTIFS[id]))
    : profile.motifPool.length ? profile.motifPool : DOT_THEME_PACKS.find((p) => p.id === "generic")?.motifIds || ["star"];
  const points = [];
  const motifCount = pickMotifCount(config.dotsPerPage);
  const safeX = mx + 18, safeY = my + 18, safeW = w - safeX * 2, safeH = h - safeY * 2;
  const slots = createDotMotifSlots(motifCount, safeX, safeY, safeW, safeH);
  const scene = createDotSceneBlueprint(config, profile, pool, motifCount, pageNumber, randomFn);
  const motifs = slots.map((slot, i) => {
    const id = scene.motifIds[i] || scene.motifIds[0] || pool[0];
    const m = DOT_MOTIFS[id] || DOT_MOTIFS.star;
    const s = jitterMotifSlot(slot, safeX, safeY, safeW, safeH, randomFn);
    return { id: `${pageNumber}-m${i + 1}`, motifId: id, label: m.label, x: s.x, y: s.y, w: s.w, h: s.h, regions: m.regions };
  });
  const target = motifs.map(() => Math.floor(config.dotsPerPage / motifs.length));
  let rem = config.dotsPerPage - target.reduce((s, v) => s + v, 0), cur = 0;
  while (rem > 0) { target[cur % target.length] += 1; cur += 1; rem -= 1; }
  motifs.forEach((motif, mi) => {
    let att = 0;
    while (points.length < config.dotsPerPage && target[mi] > 0 && att < 2200) {
      att += 1;
      const region = pickWeightedRegion(motif.regions, randomFn);
      const sample = samplePointInRegion(region, randomFn);
      const radius = randomBetween(config.minRadius, config.maxRadius, randomFn);
      const x = motif.x + sample.x * motif.w, y = motif.y + sample.y * motif.h;
      if (x - radius < mx || x + radius > w - mx || y - radius < my || y + radius > h - my) continue;
      if (points.some((p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < p.radius + radius + config.minGap)) continue;
      points.push({ id: `${pageNumber}-${points.length + 1}`, x, y, radius, label: points.length + 1, motifId: motif.id }); target[mi] -= 1;
    }
  });
  // Fallback passes omitted for brevity — same logic as original
  let fb = 0;
  while (points.length < config.dotsPerPage && fb < config.dotsPerPage * 400) {
    fb += 1;
    const motif = motifs[Math.floor(randomFn() * motifs.length)]; const radius = randomBetween(config.minRadius, config.maxRadius, randomFn);
    if (motif.w <= radius * 2 || motif.h <= radius * 2) continue;
    const x = randomBetween(motif.x + radius, motif.x + motif.w - radius, randomFn), y = randomBetween(motif.y + radius, motif.y + motif.h - radius, randomFn);
    if (x - radius < mx || x + radius > w - mx || y - radius < my || y + radius > h - my) continue;
    if (points.some((p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < p.radius + radius + config.minGap)) continue;
    points.push({ id: `${pageNumber}-${points.length + 1}`, x, y, radius, label: points.length + 1, motifId: motif.id });
  }
  let gfb = 0;
  while (points.length < config.dotsPerPage && gfb < config.dotsPerPage * 500) {
    gfb += 1; const radius = randomBetween(config.minRadius, config.maxRadius, randomFn);
    const x = randomBetween(mx + radius, w - mx - radius, randomFn), y = randomBetween(my + radius + 42, h - my - radius, randomFn);
    if (points.some((p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < p.radius + radius + config.minGap)) continue;
    points.push({ id: `${pageNumber}-${points.length + 1}`, x, y, radius, label: points.length + 1, motifId: "fallback" });
  }
  return { id: `dot-page-${pageNumber}`, title: `${(config.bookTitle || config.theme || "Dot Marker").trim()} Page ${pageNumber}`, trimId: trim.id, themePackId: profile.packId, themePackLabel: profile.packLabel, scene, width: w, height: h, marginX: mx, marginY: my, motifs, points };
}

export function generateDotPages(config, randomFn = Math.random) {
  const used = new Set();
  return Array.from({ length: config.pageCount }, (_, i) => {
    let page = null;
    for (let a = 0; a < 12; a += 1) {
      const c = generateDotPage(config, i + 1, randomFn);
      const sig = c.scene?.signature || `${c.themePackId}|${c.motifs.map((m) => m.motifId).join("+")}`;
      if (!used.has(sig) || a === 11) { used.add(sig); page = c; break; }
    }
    return page || generateDotPage(config, i + 1, randomFn);
  });
}

// ── Dot-to-Dot ──────────────────────────────────────────────

export function getDotToDotDifficulty(level) { return getDotToDotDifficultyProfile(level); }

export function getDotToDotBaseName(config) { return config.bookTitle?.trim() || config.theme?.trim() || "dot-to-dot"; }
export function getDotSuiteBaseName(config) { return config.bookTitle?.trim() || config.theme?.trim() || "dot-marker"; }

export function getDotToDotMetrics(points, targetMinGapPx) {
  return getDotToDotPathMetrics(points, { targetMinGapPx });
}

function buildDotToDotPointsForMotif(motif, targetDots, minGapPx, randomFn = Math.random) {
  const abs = Array.isArray(motif.regions) ? motif.regions.map((r) => toAbsoluteRegion(r, motif)) : [];
  return buildBestDotToDotPath({ absoluteRegions: abs, targetDots, minGapPx, bounds: { x: motif.x, y: motif.y, w: motif.w, h: motif.h }, attempts: 6, randomFn });
}

export function normalizeTracePoints(points) {
  if (!Array.isArray(points)) return [];
  return points.map((p) => ({ x: Number(p?.x), y: Number(p?.y) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).map((p) => ({ x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) }));
}

export function normalizeDotToDotImageTrace(trace) {
  if (!trace || typeof trace !== "object") return null;
  const pts = normalizeTracePoints(trace.points);
  if (pts.length < 8) return null;
  const guide = normalizeTracePoints(trace.guidePoints);
  const previewDataUrl =
    typeof trace.previewDataUrl === "string" && trace.previewDataUrl.startsWith("data:image/")
      ? trace.previewDataUrl
      : "";
  const sourceImageUrl = typeof trace.sourceImageUrl === "string" ? trace.sourceImageUrl : "";
  return {
    name: String(trace.name || "image-trace"),
    points: pts,
    guidePoints: guide.length >= 3 ? guide : pts.slice(0, Math.min(420, pts.length)),
    previewDataUrl,
    sourceImageUrl,
    diagnostics: trace.diagnostics && typeof trace.diagnostics === "object" ? trace.diagnostics : {}
  };
}

function resolveDotToDotSourceMode(config, { imageTrace, libraryAsset, readyLibraryCount } = {}) {
  const preferred = String(config?.sourceMode || "").trim();
  const hasSingleTrace =
    Boolean(imageTrace) &&
    Array.isArray(imageTrace.points) &&
    imageTrace.points.length >= 8;
  const hasLibraryTrace =
    Boolean(libraryAsset) &&
    Array.isArray(libraryAsset.trace?.points) &&
    libraryAsset.trace.points.length >= 8;
  if (preferred === "single_trace" && hasSingleTrace) return "single_trace";
  if (preferred === "bulk_library" && hasLibraryTrace) return "bulk_library";
  if (preferred === "bulk_library" && !hasLibraryTrace && readyLibraryCount > 0) return "bulk_library";
  if (preferred === "single_trace" && !hasSingleTrace && !config.allowAiFallback) return "single_trace";
  if ((config.useImageTrace || preferred === "single_trace") && hasSingleTrace) return "single_trace";
  if (preferred === "bulk_library" && !readyLibraryCount && !config.allowAiFallback) return "bulk_library";
  return "theme_ai";
}

function targetDotsFromDifficulty(difficulty, randomFn = Math.random, complexityHint = 0.5) {
  const range = Math.max(1, difficulty.maxDots - difficulty.minDots);
  const clampedHint = clamp(complexityHint, 0, 1);
  const base = difficulty.minDots + Math.floor(range * (0.22 + clampedHint * 0.68));
  const jitter = Math.floor(randomBetween(-Math.max(2, range * 0.08), Math.max(2, range * 0.08), randomFn));
  return clamp(base + jitter, difficulty.minDots, difficulty.maxDots);
}

function rotateNormalizedTrace(points, shift) {
  if (!Array.isArray(points) || points.length <= 1) return points || [];
  const safeShift = ((shift % points.length) + points.length) % points.length;
  return [...points.slice(safeShift), ...points.slice(0, safeShift)];
}

function selectTraceCoverage(points, coverage = 1, randomFn = Math.random) {
  if (!Array.isArray(points) || points.length < 8) return points || [];
  const clampedCoverage = clamp(Number(coverage) || 1, 0.4, 1);
  if (clampedCoverage >= 0.995) return [...points];
  const keepCount = clamp(Math.floor(points.length * clampedCoverage), 8, points.length);
  const shiftLimit = Math.max(0, points.length - keepCount);
  const shift = shiftLimit > 0 ? Math.floor(randomFn() * shiftLimit) : 0;
  return rotateNormalizedTrace(points, shift).slice(0, keepCount);
}

function estimateNormalizedTracePathLengthPx(points, bounds) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = (points[i].x - points[i - 1].x) * bounds.w;
    const dy = (points[i].y - points[i - 1].y) * bounds.h;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

export function generateDotToDotPage(
  config,
  pageNumber,
  randomFn = Math.random,
  imageTrace = null,
  libraryAsset = null,
  readyLibraryCount = 0
) {
  const trim = getTrimSize(config.trimId);
  const w = Math.round(trim.widthIn * DOT_CANVAS_PPI), h = Math.round(trim.heightIn * DOT_CANVAS_PPI);
  const mx = Math.max(30, Math.round(0.4 * DOT_CANVAS_PPI)), my = Math.max(30, Math.round(0.45 * DOT_CANVAS_PPI));
  const inference = inferDotThemeFromTitle(config.bookTitle, config.theme);
  const difficulty = getDotToDotDifficulty(config.difficulty);
  const slot = createDotMotifSlots(1, mx + 28, my + 70, w - (mx + 28) * 2, h - (my + 88) * 2)[0];
  const normalizedSingleTrace = normalizeDotToDotImageTrace(imageTrace);
  const normalizedLibraryTrace = normalizeDotToDotImageTrace(libraryAsset?.trace);
  const sourceMode = resolveDotToDotSourceMode(config, {
    imageTrace: normalizedSingleTrace,
    libraryAsset: normalizedLibraryTrace ? { trace: normalizedLibraryTrace } : null,
    readyLibraryCount
  });
  const useSingleTrace = sourceMode === "single_trace" && Boolean(normalizedSingleTrace);
  const useLibraryTrace = sourceMode === "bulk_library" && Boolean(normalizedLibraryTrace);
  const activeTrace = useLibraryTrace ? normalizedLibraryTrace : useSingleTrace ? normalizedSingleTrace : null;
  const libraryTags = Array.isArray(libraryAsset?.tags) ? libraryAsset.tags.map((tag) => String(tag)) : [];
  const traceIsAiGenerated = libraryTags.includes("ai-generated");
  const closeTracePath = sourceMode !== "single_trace" && (traceIsAiGenerated || useLibraryTrace);
  const tracePreviewUrl =
    activeTrace?.previewDataUrl ||
    activeTrace?.sourceImageUrl ||
    libraryAsset?.previewDataUrl ||
    libraryAsset?.sourceImageUrl ||
    "";
  const pool = inference.motifPool.length ? inference.motifPool : ["star"];
  const motifId = activeTrace ? "image-trace" : pool[(pageNumber - 1 + Math.floor(randomFn() * pool.length)) % pool.length];
  const motifBase = DOT_MOTIFS[motifId] || DOT_MOTIFS.star;
  const motif = {
    id: `d2d-${pageNumber}-m1`,
    motifId,
    label: useLibraryTrace
      ? `Library: ${libraryAsset?.name || "line-art"}`
      : useSingleTrace
        ? `Trace: ${activeTrace.name}`
        : motifBase.label,
    x: slot.x,
    y: slot.y,
    w: slot.w,
    h: slot.h,
    regions: activeTrace ? [{ kind: "polygon", points: activeTrace.guidePoints }] : motifBase.regions
  };
  const complexityHint = clamp(Number(libraryAsset?.qa?.score || 50) / 100, 0, 1);
  let targetDots = targetDotsFromDifficulty(difficulty, randomFn, complexityHint);
  const traceCoverage = activeTrace
    ? sourceMode === "single_trace"
      ? 0.74
      : traceIsAiGenerated
        ? 1
        : 0.9
    : 1;
  const tracePathPoints = activeTrace
    ? selectTraceCoverage(activeTrace.points, traceCoverage, randomFn)
    : [];
  if (tracePathPoints.length >= 8) {
    const pathLengthPx = estimateNormalizedTracePathLengthPx(tracePathPoints, {
      w: slot.w,
      h: slot.h
    });
    const spacingFactor = closeTracePath ? 1.05 : 1.35;
    const practicalMaxDots = Math.max(
      8,
      Math.floor(pathLengthPx / Math.max(8, difficulty.minGapPx * spacingFactor))
    );
    targetDots = clamp(Math.min(targetDots, practicalMaxDots), 8, difficulty.maxDots);
  }
  let bestPoints = [], bestQuality = -1;
  for (let a = 0; a < 6; a += 1) {
    const raw = activeTrace
      ? buildPathFromNormalizedTrace({
          normalizedPoints: tracePathPoints,
          targetDots,
          minGapPx: difficulty.minGapPx,
          bounds: { x: motif.x, y: motif.y, w: motif.w, h: motif.h },
          closed: closeTracePath,
          attempts: 4,
          randomFn
        })
      : buildDotToDotPointsForMotif(motif, targetDots, difficulty.minGapPx, randomFn);
    const pts = raw.map((p, i) => ({ id: `${pageNumber}-${i + 1}`, x: p.x, y: p.y, label: i + 1 }));
    const m = getDotToDotMetrics(pts, difficulty.minGapPx);
    if (m.qualityScore > bestQuality) { bestQuality = m.qualityScore; bestPoints = pts; }
    if (m.minStep >= difficulty.minGapPx && m.crossingCount === 0) { bestPoints = pts; break; }
  }
  return {
    id: `d2d-page-${pageNumber}`,
    title: `${(config.bookTitle || config.theme || "Dot to Dot").trim()} Page ${pageNumber}`,
    trimId: trim.id,
    themePackId: activeTrace ? "image-trace" : inference.profile.packId,
    themePackLabel: useLibraryTrace ? "Library Trace" : activeTrace ? "Image Trace" : inference.profile.packLabel,
    difficulty: config.difficulty,
    sourceMode,
    sourceAssetId: useLibraryTrace ? libraryAsset?.id || null : null,
    tracePreviewUrl: tracePreviewUrl || null,
    recipe: {
      sourceMode,
      sourceAssetId: useLibraryTrace ? libraryAsset?.id || null : null,
      sourceTraceName: activeTrace?.name || null,
      difficulty: config.difficulty,
      targetDots,
      minGapPx: difficulty.minGapPx
    },
    width: w,
    height: h,
    marginX: mx,
    marginY: my,
    motif,
    points: bestPoints
  };
}

export function generateDotToDotPages(config, randomFn = Math.random, imageTrace = null, lineArtLibrary = []) {
  const sourceMode = String(config?.sourceMode || "");
  const normalizedLibrary = normalizeLineArtLibrary(lineArtLibrary);
  const readyLibrary = normalizedLibrary.filter((asset) => asset.status === "ready");
  const assignments =
    sourceMode === "bulk_library"
      ? selectLineArtAssetsForPages(readyLibrary, config.pageCount)
      : [];

  return Array.from({ length: config.pageCount }, (_, i) =>
    generateDotToDotPage(
      config,
      i + 1,
      randomFn,
      imageTrace,
      assignments[i] || null,
      readyLibrary.length
    )
  );
}

// ── QC / Evaluation ─────────────────────────────────────────

export function evaluateDotPage(page, config) {
  if (!page) return [];
  let minGap = Infinity;
  for (let i = 0; i < page.points.length; i += 1) for (let j = i + 1; j < page.points.length; j += 1) {
    const d = Math.sqrt((page.points[i].x - page.points[j].x) ** 2 + (page.points[i].y - page.points[j].y) ** 2) - page.points[i].radius - page.points[j].radius;
    if (d < minGap) minGap = d;
  }
  const minDia = page.points.length ? Math.min(...page.points.map((p) => p.radius * 2)) : 0;
  const minDiaMm = (minDia / DOT_CANVAS_PPI) * 25.4;
  const safeMargin = page.points.every((p) => p.x - p.radius >= page.marginX && p.x + p.radius <= page.width - page.marginX && p.y - p.radius >= page.marginY && p.y + p.radius <= page.height - page.marginY);
  const motifCoverage = page.points.length ? (page.points.filter((p) => Boolean(p.motifId)).length / page.points.length) * 100 : 0;
  return [
    { label: "QC-DM1 Min Dot Diameter", value: `${minDiaMm.toFixed(1)} mm`, status: minDiaMm >= 12 ? "PASS" : "WARN" },
    { label: "QC-DM2 Min Dot Spacing", value: Number.isFinite(minGap) ? `${minGap.toFixed(1)} px` : "N/A", status: minGap >= config.minGap ? "PASS" : "WARN" },
    { label: "QC-DM3 Dot Count", value: `${page.points.length} dots`, status: page.points.length >= Math.floor(config.dotsPerPage * 0.8) ? "PASS" : "WARN" },
    { label: "QC-DM4 Safe Margin", value: safeMargin ? "Inside trim-safe area" : "Some dots cross safe area", status: safeMargin ? "PASS" : "WARN" },
    { label: "QC-DM5 Motif Coverage", value: `${motifCoverage.toFixed(0)}%`, status: motifCoverage >= 85 ? "PASS" : "WARN" }
  ];
}

export function evaluateDotToDotPage(page, config) {
  if (!page || !Array.isArray(page.points)) return [];
  const difficulty = getDotToDotDifficulty(config.difficulty);
  const metrics = getDotToDotMetrics(page.points, difficulty.minGapPx);
  const sourceMode = page.sourceMode || config.sourceMode || "theme_ai";
  return [
    { label: "QC-D2D1 Dot Count Range", value: `${page.points.length} dots`, status: page.points.length >= difficulty.minDots && page.points.length <= difficulty.maxDots ? "PASS" : "WARN" },
    { label: "QC-D2D2 Min Step Spacing", value: Number.isFinite(metrics.minStep) ? `${metrics.minStep.toFixed(1)} px` : "N/A", status: metrics.minStep >= difficulty.minGapPx ? "PASS" : "WARN" },
    { label: "QC-D2D3 Number Sequence", value: metrics.contiguousLabels ? "Contiguous labels" : "Broken numbering", status: metrics.contiguousLabels ? "PASS" : "WARN" },
    { label: "QC-D2D4 Theme Motif", value: page.motif?.label || "Unknown motif", status: page.motif?.label ? "PASS" : "WARN" },
    { label: "QC-D2D5 Path Crossings", value: `${metrics.crossingCount} crossings`, status: metrics.crossingCount === 0 ? "PASS" : "WARN" },
    { label: "QC-D2D6 Path Quality", value: `${metrics.qualityScore}/100`, status: metrics.qualityScore >= 75 ? "PASS" : "WARN" },
    { label: "QC-D2D7 Source Mode", value: sourceMode, status: sourceMode ? "PASS" : "WARN" }
  ];
}

// ── Workspace defaults ──────────────────────────────────────

export function createDefaultWorkspace() {
  const wsSize = 12, mazeRows = 16, mazeCols = 16;
  const dotConfig = { ...DEFAULT_DOT_CONFIG };
  const dotToDotConfig = { ...DEFAULT_DOT_TO_DOT_CONFIG };
  const dotToDotLibrary = [];
  return {
    wsSize,
    wsForm: { word: "", row: 0, col: 0, direction: "E" },
    wsState: createWordSearchState(wsSize, STARTER_WORDS, createSeededRandom(10101)),
    mazeRows, mazeCols,
    mazeEdit: { row: 0, col: 0, direction: "N", action: "remove" },
    mazeTerminals: { entrance: "0,0", exit: `${mazeRows - 1},${mazeCols - 1}` },
    mazeState: generateMazeState(mazeRows, mazeCols, createSeededRandom(20202)),
    dotConfig,
    dotPages: generateDotPages(dotConfig, createSeededRandom(30303)),
    activeDotPage: 0,
    dotToDotConfig,
    dotToDotImageTrace: null,
    dotToDotLibrary,
    dotToDotPages: generateDotToDotPages(dotToDotConfig, createSeededRandom(40404), null, dotToDotLibrary),
    activeDotToDotPage: 0,
    dotToDotPreviewMode: "puzzle"
  };
}

export function normalizeWorkspaceSnapshot(snapshot, fallback) {
  const fb = fallback || createDefaultWorkspace();
  if (!snapshot || typeof snapshot !== "object") return cloneData(fb);
  const dc = { ...fb.dotConfig, ...(snapshot.dotConfig || {}) };
  dc.pageCount = clamp(Number(dc.pageCount) || fb.dotConfig.pageCount, 1, 80);
  const dpRaw =
    Array.isArray(snapshot.dotPages) && snapshot.dotPages.length
      ? snapshot.dotPages
      : generateDotPages(dc, createSeededRandom(30303));
  const dp = Array.isArray(dpRaw) ? dpRaw.slice(0, dc.pageCount) : [];
  const d2dc = { ...fb.dotToDotConfig, ...(snapshot.dotToDotConfig || {}) };
  d2dc.pageCount = clamp(Number(d2dc.pageCount) || fb.dotToDotConfig.pageCount, 1, 120);
  d2dc.sourceMode = ["theme_ai", "single_trace", "bulk_library"].includes(d2dc.sourceMode)
    ? d2dc.sourceMode
    : "theme_ai";
  d2dc.difficulty = getDotToDotDifficulty(d2dc.difficulty).id;
  const trace = normalizeDotToDotImageTrace(snapshot.dotToDotImageTrace);
  const library = normalizeLineArtLibrary(snapshot.dotToDotLibrary || fb.dotToDotLibrary || []);
  d2dc.useImageTrace =
    (Boolean(d2dc.useImageTrace) || d2dc.sourceMode === "single_trace") &&
    Boolean(trace);
  const d2dpRaw =
    Array.isArray(snapshot.dotToDotPages) && snapshot.dotToDotPages.length
      ? snapshot.dotToDotPages
      : generateDotToDotPages(d2dc, createSeededRandom(40404), trace, library);
  const d2dp = Array.isArray(d2dpRaw) ? d2dpRaw.slice(0, d2dc.pageCount) : [];
  return {
    wsSize: Number(snapshot.wsSize) || fb.wsSize,
    wsForm: { ...fb.wsForm, ...(snapshot.wsForm || {}) },
    wsState: snapshot.wsState || fb.wsState,
    mazeRows: Number(snapshot.mazeRows) || fb.mazeRows,
    mazeCols: Number(snapshot.mazeCols) || fb.mazeCols,
    mazeEdit: { ...fb.mazeEdit, ...(snapshot.mazeEdit || {}) },
    mazeTerminals: { ...fb.mazeTerminals, ...(snapshot.mazeTerminals || {}) },
    mazeState: snapshot.mazeState || fb.mazeState,
    dotConfig: dc, dotPages: dp,
    activeDotPage: Math.min(Math.max(0, Number(snapshot.activeDotPage) || 0), Math.max(0, dp.length - 1)),
    dotToDotConfig: d2dc, dotToDotImageTrace: trace, dotToDotLibrary: library, dotToDotPages: d2dp,
    activeDotToDotPage: Math.min(Math.max(0, Number(snapshot.activeDotToDotPage) || 0), Math.max(0, d2dp.length - 1)),
    dotToDotPreviewMode: snapshot.dotToDotPreviewMode === "solution" ? "solution" : "puzzle"
  };
}

// ── Misc helpers ────────────────────────────────────────────

export function mapWordSearchApiStateToLocal(apiState, fallbackState) {
  if (!apiState || !Array.isArray(apiState.grid) || !Array.isArray(apiState.words)) return fallbackState;
  const words = apiState.words.map((w, i) => ({ id: w.id || String(i + 1), text: w.text || "", row: w.start?.row ?? 0, col: w.start?.col ?? 0, direction: w.direction || "E" }));
  return { size: apiState.grid_size || fallbackState.size, grid: apiState.grid, words, nextWordId: words.length + 1, highlightedWordId: null, revision: apiState.revision || fallbackState.revision || 1 };
}

export function summarizeQcItems(items, passMessage) {
  const errors = items.filter((i) => i.severity === "error").length;
  const warnings = items.filter((i) => i.severity === "warning").length;
  if (errors > 0) return { tone: "error", text: `QC returned ${errors} errors and ${warnings} warnings.` };
  if (warnings > 0) return { tone: "warn", text: `QC returned ${warnings} warnings.` };
  return { tone: "ok", text: passMessage };
}

export function getMotifAssetPaths(motif) {
  if (!motif?.motifId) return [];
  return DOT_MOTIF_ASSETS[motif.motifId]?.paths || [];
}

export function applyAiReferencesToPages(pages, items) {
  if (!Array.isArray(pages) || !pages.length) return pages || [];
  const usable = Array.isArray(items) ? items.filter((i) => typeof i?.imageUrl === "string" && i.imageUrl.length > 0) : [];
  if (!usable.length) return pages;
  return pages.map((p, i) => {
    const src = usable[i % usable.length];
    return { ...p, aiReferenceUrl: src.imageUrl, aiReferenceLineArtUrl: src.lineArtPreviewUrl || "", aiReferencePrompt: src.prompt || "", aiReferenceSubject: src.subject || "" };
  });
}
