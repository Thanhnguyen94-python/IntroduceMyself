// Giới hạn số lần đăng nhập sai để chống dò mật khẩu.
// Lưu trong bộ nhớ của từng instance server: không tuyệt đối trên serverless nhưng chặn được dò hàng loạt.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

type Entry = { failures: number; firstAt: number };
const attempts = new Map<string, Entry>();

function prune(now: number) {
  if (attempts.size < 500) return;
  for (const [key, entry] of attempts) {
    if (now - entry.firstAt > WINDOW_MS) attempts.delete(key);
  }
}

export function checkLoginAllowed(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) return { allowed: true, retryAfterSec: 0 };
  if (entry.failures < MAX_FAILURES) return { allowed: true, retryAfterSec: 0 };
  return { allowed: false, retryAfterSec: Math.ceil((entry.firstAt + WINDOW_MS - now) / 1000) };
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  prune(now);
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) attempts.set(key, { failures: 1, firstAt: now });
  else entry.failures += 1;
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

export function clientKeyFrom(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}
