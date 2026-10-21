import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { compareSync, genSaltSync, hashSync } from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";

// =====================================================================
// Xác thực Admin - nguyên tắc "fail securely":
//  - KHÔNG có mật khẩu viết cứng trong mã nguồn.
//  - Production: chỉ xác thực qua Supabase (bảng admin_profiles, hash bcrypt).
//    Database lỗi / chưa cấu hình  -> từ chối đăng nhập.
//  - Local dev không có Supabase: chỉ cho đăng nhập khi đặt ADMIN_PASSWORD trong .env.local.
//  - ADMIN_SESSION_SECRET bắt buộc trên production (thiếu -> không cấp/không chấp nhận session).
// =====================================================================

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_VALUES = new Set(["", "change_me_strong_password", "change_me_very_long_random_secret", "change-this-secret-in-production"]);

export type AdminVerifyResult = {
  ok: boolean;
  reason:
    | "ok"
    | "missing-input"
    | "supabase-not-configured"
    | "session-secret-missing"
    | "db-query-failed"
    | "password-mismatch"
    | "invalid-credentials";
};

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

// Secret ngẫu nhiên cho local dev khi chưa đặt ADMIN_SESSION_SECRET (khởi động lại server = đăng nhập lại).
let devSecret: string | null = null;

function getSessionSecret(): string | null {
  const fromEnv = (process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (fromEnv && !PLACEHOLDER_VALUES.has(fromEnv) && fromEnv.length >= MIN_SECRET_LENGTH) return fromEnv;

  if (isProductionRuntime()) {
    console.error(`[admin-auth] ADMIN_SESSION_SECRET thiếu hoặc quá ngắn (cần >= ${MIN_SECRET_LENGTH} ký tự). Từ chối mọi session admin.`);
    return null;
  }
  if (!devSecret) devSecret = randomBytes(32).toString("hex");
  return devSecret;
}

export function isSessionConfigured() {
  return getSessionSecret() !== null;
}

function getLocalEnvCredentials() {
  const username = (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!username || PLACEHOLDER_VALUES.has(password)) return null;
  return { username, password };
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

// Chỉ cho phép ký tự an toàn để không chèn được điều kiện vào bộ lọc PostgREST `.or(...)`.
function sanitizeIdentifier(input: string) {
  const value = input.trim().toLowerCase();
  return /^[a-z0-9._@+-]{1,120}$/.test(value) ? value : "";
}

function isBcryptHash(hash: string) {
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}

// bcryptjs sinh "$2b$"; đổi sang "$2a$" (cùng thuật toán) để hàm SQL verify_admin_login (pgcrypto) đọc được.
export function hashAdminPassword(password: string) {
  return hashSync(password, genSaltSync(10).replace(/^\$2b\$/, "$2a$"));
}

export async function verifyAdminCredentials(username: string, password: string): Promise<AdminVerifyResult> {
  const identifier = sanitizeIdentifier(username);
  const cleanPassword = password.trim();
  if (!identifier || !cleanPassword) return { ok: false, reason: "missing-input" };
  if (!isSessionConfigured()) return { ok: false, reason: "session-secret-missing" };

  const { url, serviceRoleKey } = getSupabaseEnv();

  if (!url || !serviceRoleKey) {
    if (isProductionRuntime()) {
      console.error("[admin-auth] Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trên production.");
      return { ok: false, reason: "supabase-not-configured" };
    }
    const local = getLocalEnvCredentials();
    if (!local) return { ok: false, reason: "supabase-not-configured" };
    const matched = safeCompare(identifier, local.username) && safeCompare(cleanPassword, local.password);
    return { ok: matched, reason: matched ? "ok" : "invalid-credentials" };
  }

  try {
    const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("id,password_hash")
      .eq("is_active", true)
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .limit(1);

    if (error) {
      // Fail securely: không có đường dự phòng nào khi database lỗi.
      console.error("[admin-auth] admin_profiles query failed:", error.message);
      return { ok: false, reason: "db-query-failed" };
    }

    const row = Array.isArray(data) ? data[0] : null;
    const storedHash = String(row?.password_hash ?? "");
    if (!row || !storedHash) return { ok: false, reason: "invalid-credentials" };

    if (isBcryptHash(storedHash)) {
      const matched = compareSync(cleanPassword, storedHash);
      return { ok: matched, reason: matched ? "ok" : "password-mismatch" };
    }

    // Dữ liệu cũ lưu mật khẩu dạng thô: so sánh 1 lần rồi nâng cấp ngay lên bcrypt.
    const matched = safeCompare(cleanPassword, storedHash);
    if (matched) {
      await supabase.from("admin_profiles").update({ password_hash: hashAdminPassword(cleanPassword) }).eq("id", row.id);
      console.warn("[admin-auth] Đã nâng cấp mật khẩu dạng thô lên bcrypt.");
    }
    return { ok: matched, reason: matched ? "ok" : "password-mismatch" };
  } catch (error) {
    console.error("[admin-auth] unexpected verify error", error);
    return { ok: false, reason: "db-query-failed" };
  }
}

export function createAdminSessionToken(username: string) {
  const secret = getSessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${username}.${expiresAt}`;
  return Buffer.from(`${payload}.${signPayload(payload, secret)}`).toString("base64url");
}

// Token = base64url("<username>.<expiresAt>.<signature>"). Username có thể chứa dấu "." (email),
// nên tách 2 phần cuối từ bên phải.
function parseSessionToken(token?: string | null) {
  if (!token) return null;
  const secret = getSessionSecret();
  if (!secret) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const sigIdx = decoded.lastIndexOf(".");
    const expIdx = decoded.lastIndexOf(".", sigIdx - 1);
    if (sigIdx <= 0 || expIdx <= 0) return null;

    const username = decoded.slice(0, expIdx);
    const expiresAtRaw = decoded.slice(expIdx + 1, sigIdx);
    const signature = decoded.slice(sigIdx + 1);
    if (!username || !expiresAtRaw || !signature) return null;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

    return safeCompare(signature, signPayload(`${username}.${expiresAtRaw}`, secret)) ? { username } : null;
  } catch {
    return null;
  }
}

// Ký / kiểm tra chuỗi cho phiên khác (vd tài khoản SMT) bằng cùng secret nhưng có "scope" riêng:
// token SMT không bao giờ dùng được làm cookie admin (chữ ký khác nhau).
export function signScoped(scope: string, payload: string) {
  const secret = getSessionSecret();
  if (!secret) return null;
  return signPayload(`${scope}|${payload}`, secret);
}

export function verifyScoped(scope: string, payload: string, signature: string) {
  const expected = signScoped(scope, payload);
  return expected !== null && safeCompare(signature, expected);
}

export function verifyAdminSessionToken(token?: string | null) {
  return parseSessionToken(token) !== null;
}

export function getAdminSessionUsername(token?: string | null) {
  return parseSessionToken(token)?.username ?? null;
}
