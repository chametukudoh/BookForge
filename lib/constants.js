/** Shared constants: single source of truth for the app. */
import {
  clamp,
  randomBetween,
  createSeededRandom,
  safeSlug,
  escapeXml,
  cloneData,
  generateLocalId
} from "./utils.js";

export const DIRECTIONS = {
  N: [-1, 0],
  S: [1, 0],
  E: [0, 1],
  W: [0, -1],
  NE: [-1, 1],
  NW: [-1, -1],
  SE: [1, 1],
  SW: [1, -1]
};

export const ORTHO_DIRECTIONS = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1]
};

export const OPPOSITE = { N: "S", S: "N", E: "W", W: "E" };

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const STARTER_WORDS = [
  "PUBLISH", "EDITOR", "KDP", "MARGIN", "PUZZLE",
  "EXPORT", "STYLE", "PROMPT", "LAYOUT", "GUTTER"
];

export const DOT_CANVAS_PPI = 100;
export const AI_EXPORT_PPI = 300;

export const KDP_TRIM_SIZES = [
  { id: "8.5x11", label: "8.5 x 11 in (Letter)", widthIn: 8.5, heightIn: 11 },
  { id: "8x10", label: "8 x 10 in", widthIn: 8, heightIn: 10 },
  { id: "8.5x8.5", label: "8.5 x 8.5 in (Square)", widthIn: 8.5, heightIn: 8.5 },
  { id: "7.5x9.25", label: "7.5 x 9.25 in", widthIn: 7.5, heightIn: 9.25 },
  { id: "7x10", label: "7 x 10 in", widthIn: 7, heightIn: 10 },
  { id: "6x9", label: "6 x 9 in", widthIn: 6, heightIn: 9 }
];

export const LOCAL_WORKSPACE_STORAGE_KEY = "bookforge.local.workspace.v1";

export const DEFAULT_DOT_CONFIG = {
  bookTitle: "",
  nicheId: "auto",
  pageCount: 18,
  dotsPerPage: 20,
  minRadius: 22,
  maxRadius: 36,
  minGap: 14,
  theme: "Farm Friends",
  trimId: "8.5x11",
  motifPool: []
};

export const DEFAULT_DOT_TO_DOT_CONFIG = {
  bookTitle: "",
  theme: "Farm Friends",
  pageCount: 20,
  trimId: "8.5x11",
  difficulty: "kids",
  sourceMode: "theme_ai",
  useOnlyLibraryAssets: false,
  allowAiFallback: false,
  useImageTrace: false
};

export function randomLetter(randomFn = Math.random) {
  return ALPHABET[Math.floor(randomFn() * ALPHABET.length)];
}

export function getTrimSize(trimId) {
  return KDP_TRIM_SIZES.find((trim) => trim.id === trimId) || KDP_TRIM_SIZES[0];
}

export function downloadTextFile(filename, content, mimeType) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadDataUrlFile(filename, dataUrl) {
  if (typeof window === "undefined") return;
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function badgeFromTone(tone) {
  if (tone === "error") return { className: "error", label: "FAIL" };
  if (tone === "warn") return { className: "warn", label: "WARN" };
  return { className: "ok", label: "PASS" };
}

export {
  clamp,
  randomBetween,
  createSeededRandom,
  safeSlug,
  escapeXml,
  cloneData,
  generateLocalId
};
