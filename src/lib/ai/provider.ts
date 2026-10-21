// Kết nối AI dùng chung, không gắn cứng nhà cung cấp. Cấu hình bằng biến môi trường (Vercel → Settings →
// Environment Variables, hoặc .env.local khi chạy máy):
//
//   AI_PROVIDER = anthropic | openai     (openai = mọi dịch vụ tương thích OpenAI Chat Completions:
//                                         OpenAI, Gemini OpenAI-compat, OpenRouter, Groq, Ollama...)
//   AI_API_KEY  = khoá API
//   AI_MODEL    = tên model (anthropic bỏ trống = DEFAULT_MODEL; openai bắt buộc đặt)
//   AI_BASE_URL = (tuỳ chọn) đổi endpoint, vd https://openrouter.ai/api/v1
//
// Chưa đặt AI_API_KEY -> aiStatus().configured = false, mọi tính năng AI tự tắt, web vẫn chạy bình thường.

export type AiProvider = "anthropic" | "openai";

// openai-compatible: không đoán tên model (mỗi dịch vụ khác nhau) -> bắt buộc đặt AI_MODEL.
const DEFAULT_MODEL: Record<AiProvider, string> = { anthropic: "claude-sonnet-5-5", openai: "" };
const DEFAULT_BASE: Record<AiProvider, string> = { anthropic: "https://api.anthropic.com/v1", openai: "https://api.openai.com/v1" };

function config() {
  const provider: AiProvider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase() === "openai" ? "openai" : "anthropic";
  const key = (process.env.AI_API_KEY ?? "").trim();
  return {
    provider,
    key,
    model: (process.env.AI_MODEL ?? "").trim() || DEFAULT_MODEL[provider],
    base: ((process.env.AI_BASE_URL ?? "").trim() || DEFAULT_BASE[provider]).replace(/\/+$/, "")
  };
}

// Thông tin hiển thị cho admin (không bao giờ trả khoá ra ngoài).
export function aiStatus() {
  const c = config();
  return { configured: Boolean(c.key && c.model), provider: c.provider, model: c.model, base: c.base };
}

export async function aiComplete(system: string, user: string, maxTokens = 1500): Promise<string> {
  const c = config();
  if (!c.key || !c.model) throw new Error("Chưa cấu hình AI_API_KEY / AI_MODEL.");
  const res =
    c.provider === "anthropic"
      ? await fetch(`${c.base}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": c.key, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: c.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] })
        })
      : await fetch(`${c.base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.key}` },
          body: JSON.stringify({ model: c.model, max_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] })
        });
  const data = (await res.json().catch(() => ({}))) as {
    content?: Array<{ type: string; text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`AI lỗi ${res.status}: ${data.error?.message ?? "không rõ"}`);
  return c.provider === "anthropic" ? (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim() : (data.choices?.[0]?.message?.content ?? "").trim();
}
