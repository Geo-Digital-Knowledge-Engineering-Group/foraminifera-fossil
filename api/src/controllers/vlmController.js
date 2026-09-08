/**
 * vlmController.js
 *
 * POST /api/vlm/observe
 *   Body: {
 *     imageBase64: string (raw base64 or data URL),
 *     mimeType: "image/jpeg" | "image/png" | "image/webp",
 *     locality?, age?, optics?, scale?, views?,
 *     runScore?: boolean
 *   }
 *
 * Calls Gemini free-tier generateContent, parses Vision Observer JSON,
 * optionally forwards observations to the existing scoring engine.
 */

require("dotenv").config();

const { buildVisionObserverPrompt } = require("../prompts/visionObserver");
const diagnoseController = require("./diagnoseController");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_BASE =
  process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_CHARS = 12 * 1024 * 1024; // ~9 MB binary after base64

function stripDataUrl(input) {
  if (!input || typeof input !== "string") return { mimeType: null, data: "" };
  const match = input.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) return { mimeType: match[1], data: match[2].replace(/\s/g, "") };
  return { mimeType: null, data: input.replace(/\s/g, "") };
}

function extractJson(text) {
  if (!text) throw new Error("Model boş yanıt döndü.");
  const trimmed = String(text).trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model JSON üretmedi.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizeObservations(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const observations = {};
  for (let i = 1; i <= 21; i += 1) {
    const id = `CHR_${String(i).padStart(2, "0")}`;
    const item = src[id] || {};
    const state = item.state || "NOT_OBSERVABLE";
    const value = item.value === "" ? null : item.value ?? null;
    observations[id] = {
      value,
      state,
      reason: item.reason || "",
    };
  }
  return observations;
}

async function callGemini({ prompt, mimeType, data }) {
  if (!GEMINI_API_KEY) {
    const err = new Error(
      "GEMINI_API_KEY tanımlı değil. api/.env dosyasına Google AI Studio anahtarını ekleyin."
    );
    err.status = 503;
    throw err;
  }

  const url = `${GEMINI_BASE}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error?.status ||
      `Gemini HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status === 429 ? 429 : 502;
    err.details = payload?.error || payload;
    throw err;
  }

  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n") || "";
  return { text, raw: payload, model: GEMINI_MODEL };
}

exports.status = async (_req, res) => {
  res.json({
    configured: Boolean(GEMINI_API_KEY),
    model: GEMINI_MODEL,
    provider: "google-gemini",
    freeTierNote:
      "Google AI Studio ücretsiz katmanı. Kota dolunca 429 döner; kart gerekmez.",
  });
};

exports.observe = async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType: mimeFromBody,
      locality,
      age,
      optics,
      scale,
      views,
      runScore,
    } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: "imageBase64 gerekli.",
      });
    }

    const parsed = stripDataUrl(imageBase64);
    const mimeType = parsed.mimeType || mimeFromBody || "image/jpeg";
    if (!ALLOWED_MIME.has(mimeType)) {
      return res.status(400).json({
        success: false,
        error: `Desteklenmeyen mimeType: ${mimeType}`,
      });
    }
    if (!parsed.data || parsed.data.length > MAX_IMAGE_CHARS) {
      return res.status(400).json({
        success: false,
        error: "Görüntü çok büyük veya boş. 8 MB altı JPEG/PNG kullanın.",
      });
    }

    const prompt = buildVisionObserverPrompt({
      locality,
      age,
      optics,
      scale,
      views,
    });

    const gemini = await callGemini({
      prompt,
      mimeType,
      data: parsed.data,
    });

    const parsedJson = extractJson(gemini.text);
    const observations = normalizeObservations(parsedJson.observations);
    parsedJson.observations = observations;

    let score = null;
    if (runScore) {
      score = await runScoreEngine(req, observations, parsedJson.module);
    }

    return res.json({
      success: true,
      model: gemini.model,
      observation: parsedJson,
      score,
    });
  } catch (error) {
    console.error("VLM observe error:", error);
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || "VLM isteği başarısız.",
    });
  }
};

function runScoreEngine(origReq, observations, moduleName) {
  return new Promise((resolve) => {
    const fakeReq = {
      body: {
        observations,
        module:
          moduleName && moduleName !== "UNKNOWN" ? moduleName : undefined,
      },
    };
    const fakeRes = {
      status() {
        return this;
      },
      json(payload) {
        resolve(payload);
        return this;
      },
    };
    Promise.resolve(diagnoseController.score(fakeReq, fakeRes)).catch((err) => {
      resolve({ success: false, error: err.message });
    });
  });
}
