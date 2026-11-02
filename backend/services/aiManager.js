const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { GoogleGenAI } = require("@google/genai");
const OpenAI = require("openai");

// =====================================================
// AI RESPONSE CACHE (Bộ nhớ đệm trong RAM tránh gọi trùng)
// =====================================================
const promptCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút

function getCachedResponse(prompt) {
  const hash = String(prompt).trim();
  const cached = promptCache.get(hash);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.text;
  }
  return null;
}

function setCachedResponse(prompt, text) {
  const hash = String(prompt).trim();
  promptCache.set(hash, {
    text,
    timestamp: Date.now(),
  });

  // Dọn dẹp cache nếu quá 500 mục
  if (promptCache.size > 500) {
    const firstKey = promptCache.keys().next().value;
    promptCache.delete(firstKey);
  }
}

// =====================================================
// 1. GEMINI PROVIDER (Hỗ trợ xoay nhiều API Key & Model)
// =====================================================
function parseGeminiKeys() {
  const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

const geminiKeys = parseGeminiKeys();
let currentGeminiKeyIndex = 0;
const geminiClients = geminiKeys.map((key) => new GoogleGenAI({ apiKey: key }));

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

async function callGemini(prompt) {
  if (geminiClients.length === 0) {
    throw new Error("No Gemini API keys configured");
  }

  let lastErr = null;

  // Thử lần lượt các API key hiện có
  for (let keyAttempt = 0; keyAttempt < geminiClients.length; keyAttempt++) {
    const keyIdx = (currentGeminiKeyIndex + keyAttempt) % geminiClients.length;
    const client = geminiClients[keyIdx];

    // Thử các model của Gemini
    for (const model of GEMINI_MODELS) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
        });

        if (!response) continue;

        let text = "";
        if (typeof response.text === "function") {
          text = response.text();
        } else if (typeof response.text === "string") {
          text = response.text;
        } else if (response.candidates?.[0]?.content?.parts) {
          text = response.candidates[0].content.parts.map((p) => p.text || "").join("");
        }

        if (text && text.trim()) {
          currentGeminiKeyIndex = keyIdx; // Giữ lại key đang hoạt động tốt
          return { text: text.trim(), provider: `Gemini (${model}, Key #${keyIdx + 1})` };
        }
      } catch (err) {
        lastErr = err;
        const msg = String(err.message || "").toLowerCase();
        const isRateLimit =
          msg.includes("429") ||
          msg.includes("quota") ||
          msg.includes("resource_exhausted") ||
          msg.includes("rate limit") ||
          msg.includes("high demand") ||
          msg.includes("overloaded");

        if (isRateLimit) {
          console.warn(
            `[AI Manager] Gemini Key #${keyIdx + 1} (${model}) bị limit/hết quota. Đang chuyển...`
          );
          break; // Đổi key tiếp theo
        }
      }
    }
  }

  throw lastErr || new Error("Tất cả Gemini API keys đều bị limited hoặc lỗi.");
}

// =====================================================
// 2. GROQ PROVIDER (Miễn phí, cực nhanh, 30 RPM / 14,400 RPD)
// =====================================================
let groqClient = null;
if (process.env.GROQ_API_KEY) {
  groqClient = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
  console.log("-> Groq AI Provider: Đã kích hoạt (Llama-3.3-70b / Llama-3.1-8b)");
}

async function callGroq(prompt) {
  if (!groqClient) throw new Error("Groq not configured");

  const groqModels = [
    process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
  ];

  let lastErr = null;
  for (const model of groqModels) {
    try {
      const res = await groqClient.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const text = res.choices?.[0]?.message?.content;
      if (text && text.trim()) {
        return { text: text.trim(), provider: `Groq (${model})` };
      }
    } catch (err) {
      lastErr = err;
      console.warn(`[Groq] Model ${model} failed (${err.message}). Trying next Groq model...`);
    }
  }

  throw lastErr || new Error("All Groq models failed");
}

// =====================================================
// 3. OPENROUTER PROVIDER (100+ models, có nhiều model free)
// =====================================================
let openRouterClient = null;
if (process.env.OPENROUTER_API_KEY) {
  openRouterClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
  console.log("-> OpenRouter AI Provider: Đã kích hoạt");
}

async function callOpenRouter(prompt) {
  if (!openRouterClient) throw new Error("OpenRouter not configured");

  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  const res = await openRouterClient.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned empty text");

  return { text: text.trim(), provider: `OpenRouter (${model})` };
}

// =====================================================
// 4. OPENAI PROVIDER (ChatGPT / GPT-4o-mini)
// =====================================================
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log("-> OpenAI Provider: Đã kích hoạt (GPT-4o-mini)");
}

async function callOpenAI(prompt) {
  if (!openaiClient) throw new Error("OpenAI not configured");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await openaiClient.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const text = res.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned empty text");

  return { text: text.trim(), provider: `OpenAI (${model})` };
}

// =====================================================
// 5. DEEPSEEK PROVIDER (Rẻ, thông minh)
// =====================================================
let deepseekClient = null;
if (process.env.DEEPSEEK_API_KEY) {
  deepseekClient = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
  console.log("-> DeepSeek AI Provider: Đã kích hoạt");
}

async function callDeepSeek(prompt) {
  if (!deepseekClient) throw new Error("DeepSeek not configured");

  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const res = await deepseekClient.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const text = res.choices?.[0]?.message?.content;
  if (!text) throw new Error("DeepSeek returned empty text");

  return { text: text.trim(), provider: `DeepSeek (${model})` };
}

// =====================================================
// CHUỖI GỌI AI THÔNG MINH (MULTI-PROVIDER FALLBACK CHAIN)
// =====================================================
async function askAI(prompt) {
  // 1. Kiểm tra cache trước
  const cached = getCachedResponse(prompt);
  if (cached) {
    return cached;
  }

  // Danh sách các provider theo thứ tự ưu tiên
  const providers = [];

  // Ưu tiên Groq (siêu nhanh, phản hồi tức thì và không bị hạn chế)
  if (groqClient) {
    providers.push({ name: "Groq", fn: () => callGroq(prompt) });
  }

  // Dự phòng Gemini nếu có key
  if (geminiClients.length > 0) {
    providers.push({ name: "Gemini", fn: () => callGemini(prompt) });
  }

  // Dự phòng OpenRouter
  if (openRouterClient) {
    providers.push({ name: "OpenRouter", fn: () => callOpenRouter(prompt) });
  }

  // Dự phòng DeepSeek
  if (deepseekClient) {
    providers.push({ name: "DeepSeek", fn: () => callDeepSeek(prompt) });
  }

  // Dự phòng OpenAI
  if (openaiClient) {
    providers.push({ name: "OpenAI", fn: () => callOpenAI(prompt) });
  }

  if (providers.length === 0) {
    throw new Error("Chưa cấu hình bất kỳ AI Provider nào (Gemini, Groq, OpenRouter, OpenAI, DeepSeek).");
  }

  let lastError = null;

  // Chạy lần lượt qua từng provider nếu bị lỗi hoặc rate limit
  for (const provider of providers) {
    try {
      const result = await provider.fn();
      console.log(`[AI Response] Thành công từ: ${result.provider}`);
      setCachedResponse(prompt, result.text);
      return result.text;
    } catch (err) {
      lastError = err;
      console.warn(
        `[AI Manager] Provider ${provider.name} thất bại (${err.message}). Đang thử provider dự phòng tiếp theo...`
      );
    }
  }

  throw lastError || new Error("Tất cả các AI providers đều thất bại.");
}

module.exports = {
  askAI,
  geminiKeysCount: geminiClients.length,
  hasGroq: !!groqClient,
  hasOpenRouter: !!openRouterClient,
  hasOpenAI: !!openaiClient,
  hasDeepSeek: !!deepseekClient,
};
