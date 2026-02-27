import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const BUDGET_FILE = path.join(process.cwd(), "db", "runtime", "ai-budget.json");
const WAIT_MS = 1500;
const MAX_POLLS = 30;
const KIE_WAIT_MS = 2000;
const KIE_MAX_POLLS = 45;

const NICHE_SUBJECTS = {
  farm: ["happy kitten", "friendly puppy", "baby chick", "smiling cow", "playful bunny"],
  vehicles: ["race car", "monster truck", "fire truck", "construction bulldozer", "city bus"],
  ocean: ["happy dolphin", "friendly fish", "sea turtle", "playful octopus", "little shark"],
  space: ["cute astronaut", "rocket ship", "friendly alien", "planet with rings", "moon rover"],
  dino: ["t-rex dinosaur", "triceratops dinosaur", "stegosaurus dinosaur", "baby dino", "pterodactyl"],
  holiday: ["snowman", "pumpkin", "valentine heart character", "reindeer", "gift box"],
  generic: ["cute animal", "playful character", "storybook object", "friendly creature", "adventure scene"]
};

const SCENE_ACTIONS = ["playing", "exploring", "celebrating", "smiling", "waving", "adventuring"];
const SCENE_SETTINGS = [
  "in a simple outdoor scene",
  "in a playful storybook scene",
  "with a minimal background",
  "in a bright kid-friendly setting",
  "in a clean printable scene"
];
const CAMERAS = ["front view", "storybook angle", "wide view", "close focus"];
const PROMPT_STYLE_BLOCK =
  "Printable coloring-book line art for dot-to-dot extraction: black ink outlines only, white background, single dominant subject, clean closed outer contour, minimal interior detail, thick smooth lines, kid-friendly composition.";
const PROMPT_NEGATIVE_BLOCK =
  "No grayscale, no color, no shading, no gradients, no shadows, no halftones, no textures, no photo style, no text, no watermark, no frame, no logo, no busy background, no tiny floating elements.";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function readBudgetState() {
  try {
    const raw = await readFile(BUDGET_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid budget file");
    if (parsed.date !== getTodayKey()) {
      return { date: getTodayKey(), spentUsd: 0, runs: 0 };
    }
    return {
      date: parsed.date,
      spentUsd: Number(parsed.spentUsd) || 0,
      runs: Number(parsed.runs) || 0
    };
  } catch {
    return { date: getTodayKey(), spentUsd: 0, runs: 0 };
  }
}

async function writeBudgetState(state) {
  const dir = path.dirname(BUDGET_FILE);
  await mkdir(dir, { recursive: true });
  await writeFile(BUDGET_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function toThemeSeed(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function parseQualityLevel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "draft" || normalized === "fast") return "draft";
  if (normalized === "high" || normalized === "best") return "high";
  return "standard";
}

function parseModelName(model) {
  const normalized = String(model || "").trim();
  const [slug] = normalized.split(":");
  const parts = slug.split("/").filter(Boolean);
  return parts.length >= 2 ? parts[1] : slug;
}

function parseKieAspectRatio(aspectRatio) {
  const raw = String(aspectRatio || "").trim();
  const supported = new Set(["21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "16:21"]);
  if (supported.has(raw)) return raw;
  if (raw === "2:3") return "3:4";
  if (raw === "3:2") return "4:3";
  if (raw === "9:21") return "16:21";
  if (raw === "21:16") return "21:9";
  return "3:4";
}

function parseKieQuality(quality) {
  if (quality === "high") return "high";
  return "basic";
}

function buildPrompts({ bookTitle, theme, nicheId, count }) {
  const themeSeed = toThemeSeed(theme || bookTitle || "dot marker coloring");
  const subjectPool = NICHE_SUBJECTS[nicheId] || NICHE_SUBJECTS.generic;
  const prompts = [];

  for (let i = 0; i < count; i += 1) {
    const subject = subjectPool[i % subjectPool.length];
    const action = SCENE_ACTIONS[(i + subject.length) % SCENE_ACTIONS.length];
    const setting = SCENE_SETTINGS[(i + themeSeed.length) % SCENE_SETTINGS.length];
    const camera = CAMERAS[i % CAMERAS.length];
    const scene = `${subject} ${action} ${setting}`;
    const prompt = [
      PROMPT_STYLE_BLOCK,
      `Theme: ${themeSeed}.`,
      `Main subject: ${scene}.`,
      `Composition: ${camera}, centered single focal subject, balanced whitespace, no extra objects.`,
      `Line treatment: one clear outer silhouette contour, thick uniform contour lines, very sparse interior lines suitable for tracing.`,
      `Keep all important artwork inside safe margins near page center.`,
      PROMPT_NEGATIVE_BLOCK
    ].join(" ");

    prompts.push({
      index: i + 1,
      subject,
      action,
      setting,
      camera,
      prompt
    });
  }

  return prompts;
}

function parseModel(model) {
  const normalized = String(model || "").trim();
  const [slug] = normalized.split(":");
  const parts = slug.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Invalid REPLICATE_MODEL: ${normalized}`);
  }
  return { owner: parts[0], name: parts[1] };
}

function extractImageUrl(output) {
  const tryExtractFromObject = (value) => {
    if (!value || typeof value !== "object") return null;
    if (typeof value.url === "string" && value.url.length > 0) return value.url;
    if (typeof value.image === "string" && value.image.length > 0) return value.image;
    if (typeof value.href === "string" && value.href.length > 0) return value.href;
    if (typeof value.src === "string" && value.src.length > 0) return value.src;
    if (typeof value.output === "string" && value.output.length > 0) return value.output;
    if (Array.isArray(value.output)) {
      const nested = extractImageUrl(value.output);
      if (nested) return nested;
    }
    return null;
  };

  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && item.length > 0) return item;
      const nested = tryExtractFromObject(item);
      if (nested) return nested;
    }
    return null;
  }
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const nested = tryExtractFromObject(output);
    if (nested) return nested;
  }
  return null;
}

async function pollPrediction(getUrl, token) {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    const response = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });
    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      const detail = data?.detail || raw || `Replicate poll failed (${response.status})`;
      throw new Error(detail);
    }
    if (data.status === "succeeded") return data;
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data?.error || "Prediction failed");
    }
    await sleep(WAIT_MS);
  }
  throw new Error("Prediction timed out");
}

async function runReplicatePrompt({ token, model, prompt, aspectRatio }) {
  const { owner, name } = parseModel(model);
  const lowerName = String(name || "").toLowerCase();
  const isDevFamily = lowerName.includes("dev");
  const isSchnellFamily = lowerName.includes("schnell");
  const input = {
    prompt,
    aspect_ratio: aspectRatio,
    num_outputs: 1,
    output_format: "png",
    output_quality: 100
  };

  if (isDevFamily) {
    input.num_inference_steps = 40;
    input.guidance_scale = 3.5;
    input.go_fast = false;
  } else if (isSchnellFamily) {
    input.num_inference_steps = 4;
    input.go_fast = false;
  }

  const response = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=20"
    },
    body: JSON.stringify({
      input
    }),
    cache: "no-store"
  });
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("replicate_auth_failed: invalid API token or access denied.");
    }
    if (response.status === 402) {
      throw new Error("replicate_payment_required: your Replicate account has insufficient credits or billing is not enabled.");
    }
    throw new Error(data?.detail || raw || `Replicate request failed (${response.status})`);
  }

  if (data.status === "succeeded") {
    return {
      predictionId: data.id,
      imageUrl: extractImageUrl(data.output),
      status: data.status
    };
  }

  const getUrl = data?.urls?.get;
  if (!getUrl) {
    throw new Error("Replicate did not return a poll URL");
  }
  const finalData = await pollPrediction(getUrl, token);
  return {
    predictionId: finalData.id,
    imageUrl: extractImageUrl(finalData.output),
    status: finalData.status
  };
}

function firstUrlFromArray(values) {
  if (!Array.isArray(values)) return null;
  for (const item of values) {
    if (typeof item === "string" && item) return item;
    if (item && typeof item === "object") {
      const nested =
        (typeof item.url === "string" && item.url) ||
        (typeof item.href === "string" && item.href) ||
        (typeof item.src === "string" && item.src);
      if (nested) return nested;
    }
  }
  return null;
}

function parseResultJsonPayload(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") {
        try {
          return JSON.parse(parsed);
        } catch {
          return null;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function extractKieImageUrl(responsePayload, depth = 0) {
  if (!responsePayload || typeof responsePayload !== "object") return null;
  if (depth > 4) return null;

  if (typeof responsePayload.resultImageUrl === "string" && responsePayload.resultImageUrl) {
    return responsePayload.resultImageUrl;
  }
  if (typeof responsePayload.imageUrl === "string" && responsePayload.imageUrl) {
    return responsePayload.imageUrl;
  }

  const arrayCandidates = [
    responsePayload.resultUrls,
    responsePayload.result_urls,
    responsePayload.images,
    responsePayload.outputs,
    responsePayload.result
  ];
  for (const candidate of arrayCandidates) {
    const first = firstUrlFromArray(candidate);
    if (first) return first;
  }

  const parsedResultJson = parseResultJsonPayload(responsePayload.resultJson);
  if (parsedResultJson) {
    const fromResultJson = extractKieImageUrl(parsedResultJson, depth + 1);
    if (fromResultJson) return fromResultJson;
  }

  const nestedCandidates = [responsePayload.response, responsePayload.data, responsePayload.result];
  for (const nested of nestedCandidates) {
    if (nested && typeof nested === "object") {
      const nestedUrl = extractKieImageUrl(nested, depth + 1);
      if (nestedUrl) return nestedUrl;
    }
  }

  return extractImageUrl(responsePayload);
}

async function pollKieMarketTask(baseUrl, token, taskId) {
  const cleanBase = String(baseUrl || "").replace(/\/+$/, "");
  for (let attempt = 0; attempt < KIE_MAX_POLLS; attempt += 1) {
    const statusUrl = `${cleanBase}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;
    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });
    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      const detail = data?.msg || data?.message || data?.error || raw || `KIE poll failed (${response.status})`;
      throw new Error(detail);
    }
    const statusCode = Number(data?.code);
    if (statusCode !== 0 && statusCode !== 200) {
      throw new Error(data?.msg || data?.message || "KIE status check failed.");
    }

    const task = data?.data || {};
    const state = String(task?.state || "").toLowerCase();
    if (state === "success") {
      return task;
    }
    if (state === "fail") {
      const err = task?.failMsg || task?.errorMessage || "KIE generation failed.";
      throw new Error(err);
    }
    await sleep(KIE_WAIT_MS);
  }
  throw new Error("KIE generation timed out");
}

async function pollKieFluxKontextTask(baseUrl, token, taskId) {
  const cleanBase = String(baseUrl || "").replace(/\/+$/, "");
  for (let attempt = 0; attempt < KIE_MAX_POLLS; attempt += 1) {
    const statusUrl = `${cleanBase}/api/v1/flux/kontext/record-info?taskId=${encodeURIComponent(taskId)}`;
    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });
    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      const detail = data?.msg || data?.error || raw || `KIE poll failed (${response.status})`;
      throw new Error(detail);
    }
    if (Number(data?.code) !== 200) {
      throw new Error(data?.msg || "KIE status check failed.");
    }

    const task = data?.data || {};
    const successFlag = Number(task?.successFlag);
    if (successFlag === 1) {
      return task;
    }
    if (successFlag === 2 || successFlag === 3) {
      const err =
        task?.errorMessage ||
        task?.response?.errorMessage ||
        `KIE generation failed with successFlag=${successFlag}.`;
      throw new Error(err);
    }

    await sleep(KIE_WAIT_MS);
  }
  throw new Error("KIE generation timed out");
}

async function runKiePrompt({ token, model, prompt, aspectRatio, quality }) {
  const baseUrl = process.env.KIE_API_BASE_URL || "https://api.kie.ai";
  const cleanBase = String(baseUrl).replace(/\/+$/, "");
  const modelName = String(model || "").trim();
  const lowerModel = modelName.toLowerCase();
  const useMarketJobApi = lowerModel.includes("seedream/");

  if (useMarketJobApi) {
    const response = await fetch(`${cleanBase}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelName,
        input: {
          prompt,
          aspect_ratio: parseKieAspectRatio(aspectRatio),
          quality: parseKieQuality(quality)
        }
      }),
      cache: "no-store"
    });
    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }
    const statusCode = Number(data?.code);
    if (!response.ok || (statusCode !== 0 && statusCode !== 200)) {
      const detail = data?.msg || data?.message || data?.error || raw || `KIE request failed (${response.status})`;
      throw new Error(detail);
    }
    const taskId = data?.data?.taskId;
    if (!taskId) throw new Error("KIE did not return taskId");
    const task = await pollKieMarketTask(baseUrl, token, taskId);
    const resultPayload = parseResultJsonPayload(task?.resultJson) || task;
    const imageUrl = extractKieImageUrl(resultPayload);
    if (!imageUrl) {
      const payloadKeys =
        resultPayload && typeof resultPayload === "object"
          ? Object.keys(resultPayload).slice(0, 12).join(",")
          : "";
      throw new Error(
        `KIE task succeeded but did not return an image URL (taskId=${taskId}, payloadKeys=${payloadKeys}).`
      );
    }
    return {
      taskId,
      imageUrl,
      status: "succeeded"
    };
  }

  const response = await fetch(`${cleanBase}/api/v1/flux/kontext/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      aspectRatio: parseKieAspectRatio(aspectRatio),
      model
    }),
    cache: "no-store"
  });
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!response.ok || Number(data?.code) !== 200) {
    const detail = data?.msg || data?.error || raw || `KIE request failed (${response.status})`;
    throw new Error(detail);
  }

  const taskId = data?.data?.taskId;
  if (!taskId) throw new Error("KIE did not return taskId");
  const task = await pollKieFluxKontextTask(baseUrl, token, taskId);
  const imageUrl = extractKieImageUrl(task?.response || task);
  if (!imageUrl) {
    throw new Error("KIE task succeeded but did not return an image URL.");
  }
  return {
    taskId,
    imageUrl,
    status: "succeeded"
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const bookTitle = String(body?.bookTitle || "").trim();
    const theme = String(body?.theme || "").trim();
    const nicheId = String(body?.nicheId || "generic").trim() || "generic";
    const count = clamp(Number(body?.count) || 4, 1, 24);
    const aspectRatio = String(body?.aspectRatio || "3:4");
    const quality = parseQualityLevel(body?.quality);

    if (!bookTitle && !theme) {
      return Response.json(
        { ok: false, error: "bookTitle_or_theme_required" },
        { status: 400 }
      );
    }

    const budgetCap = Number(process.env.AI_DAILY_BUDGET_USD || 2);
    const estCostPerImage = Number(process.env.REPLICATE_EST_COST_PER_IMAGE_USD || 0.05);
    const kieToken = process.env.KIE_AI_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const legacyModel = String(process.env.REPLICATE_MODEL || "").trim();
    const modelByQuality = {
      draft:
        process.env.REPLICATE_MODEL_DRAFT ||
        legacyModel ||
        "black-forest-labs/flux-schnell",
      standard:
        process.env.REPLICATE_MODEL_STANDARD ||
        legacyModel ||
        "black-forest-labs/flux-dev",
      high:
        process.env.REPLICATE_MODEL_HIGH ||
        process.env.REPLICATE_MODEL_STANDARD ||
        legacyModel ||
        "black-forest-labs/flux-dev"
    };
    const replicateModel = modelByQuality[quality];
    const kieModelByQuality = {
      draft: process.env.KIE_MODEL_DRAFT || "seedream/4.5-text-to-image",
      standard: process.env.KIE_MODEL_STANDARD || "seedream/4.5-text-to-image",
      high: process.env.KIE_MODEL_HIGH || "seedream/4.5-text-to-image"
    };
    const kieModel = kieModelByQuality[quality];
    const primaryProvider = kieToken ? "kie" : replicateToken ? "replicate" : "none";
    const fallbackProvider = primaryProvider === "kie" && replicateToken ? "replicate" : "none";

    const budget = await readBudgetState();
    const projected = budget.spentUsd + count * estCostPerImage;
    if (projected > budgetCap) {
      return Response.json(
        {
          ok: false,
          error: "daily_budget_exceeded",
          budget: {
            date: budget.date,
            spentUsd: budget.spentUsd,
            capUsd: budgetCap,
            estimatedNextRunUsd: count * estCostPerImage
          }
        },
        { status: 429 }
      );
    }

    const prompts = buildPrompts({
      bookTitle,
      theme,
      nicheId,
      count
    });

    if (!kieToken && !replicateToken) {
      return Response.json({
        ok: true,
        mode: "plan_only",
        prompts,
        model: primaryProvider === "kie" ? kieModel : replicateModel,
        provider: primaryProvider,
        quality,
        budget: {
          date: budget.date,
          spentUsd: budget.spentUsd,
          capUsd: budgetCap
        }
      });
    }

    const items = [];
    const errors = [];
    let attempts = 0;
    let cursor = 0;
    const nextPrompt = () => {
      if (cursor >= prompts.length) return null;
      const promptItem = prompts[cursor];
      cursor += 1;
      return promptItem;
    };

    const generatePromptItem = async (promptItem) => {
      let result = null;
      let providerUsed = primaryProvider;
      if (primaryProvider === "kie") {
        try {
          result = await runKiePrompt({
            token: kieToken,
            model: kieModel,
            prompt: promptItem.prompt,
            aspectRatio,
            quality
          });
          providerUsed = "kie";
        } catch (primaryError) {
          if (fallbackProvider !== "replicate") throw primaryError;
          try {
            result = await runReplicatePrompt({
              token: replicateToken,
              model: replicateModel,
              prompt: promptItem.prompt,
              aspectRatio
            });
            providerUsed = "replicate";
          } catch (fallbackError) {
            const primaryMsg =
              primaryError instanceof Error ? primaryError.message : "Unknown KIE error";
            const fallbackMsg =
              fallbackError instanceof Error ? fallbackError.message : "Unknown Replicate error";
            throw new Error(
              `KIE primary failed: ${primaryMsg}; Replicate fallback failed: ${fallbackMsg}`
            );
          }
        }
      } else {
        result = await runReplicatePrompt({
          token: replicateToken,
          model: replicateModel,
          prompt: promptItem.prompt,
          aspectRatio
        });
        providerUsed = "replicate";
      }
      return {
        ...promptItem,
        predictionId: result?.predictionId || result?.taskId || null,
        provider: providerUsed,
        imageUrl: result?.imageUrl || ""
      };
    };

    const parallelLimit = clamp(
      Number(process.env.AI_GENERATION_CONCURRENCY || (primaryProvider === "kie" ? 3 : 4)) || 3,
      1,
      6
    );
    const workerCount = Math.min(parallelLimit, prompts.length);
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (true) {
          const promptItem = nextPrompt();
          if (!promptItem) break;
          attempts += 1;
          try {
            const generated = await generatePromptItem(promptItem);
            items.push(generated);
          } catch (error) {
            errors.push({
              index: promptItem.index,
              message: error instanceof Error ? error.message : "Unknown generation error"
            });
          }
        }
      })
    );
    items.sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
    errors.sort((a, b) => Number(a.index || 0) - Number(b.index || 0));

    const nextBudget = {
      date: budget.date,
      spentUsd: Number((budget.spentUsd + attempts * estCostPerImage).toFixed(4)),
      runs: budget.runs + 1
    };
    await writeBudgetState(nextBudget);

    if (!items.length) {
      const firstError = errors[0]?.message || "No image URLs were returned by the model.";
      return Response.json(
        {
          ok: false,
          error: "ai_generation_failed",
          detail: firstError,
          model: primaryProvider === "kie" ? kieModel : replicateModel,
          modelName:
            primaryProvider === "kie"
              ? parseModelName(kieModel)
              : parseModelName(replicateModel),
          provider: primaryProvider,
          fallbackProvider,
          quality,
          items: [],
          errors,
          budget: {
            date: nextBudget.date,
            spentUsd: nextBudget.spentUsd,
            capUsd: budgetCap,
            estimatedCostPerImageUsd: estCostPerImage
          }
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      mode: "generated",
      model: primaryProvider === "kie" ? kieModel : replicateModel,
      modelName:
        primaryProvider === "kie"
          ? parseModelName(kieModel)
          : parseModelName(replicateModel),
      provider: primaryProvider,
      fallbackProvider,
      quality,
      items,
      errors,
      budget: {
        date: nextBudget.date,
        spentUsd: nextBudget.spentUsd,
        capUsd: budgetCap,
        estimatedCostPerImageUsd: estCostPerImage
      }
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown server error"
      },
      { status: 500 }
    );
  }
}
