import { createHash } from "crypto";

// Giới hạn tần suất đơn giản trong bộ nhớ (theo từng instance server) để chặn spam form công khai.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}

// IP chỉ dùng làm khoá chống spam, băm một chiều, không lưu xuống database.
export function clientFingerprint(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}|${process.env.ADMIN_SESSION_SECRET ?? ""}`).digest("hex").slice(0, 24);
}

// Cắt chuỗi và bỏ ký tự điều khiển cho dữ liệu người dùng nhập.
export function cleanText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}
