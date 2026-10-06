import { createHmac, timingSafeEqual } from "crypto";
import { compareSync } from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type AdminVerifyResult = {
  ok: boolean;
  reason:
    | "missing-input"
    | "supabase-not-configured"
    | "db-query-failed"
    | "password-mismatch"
    | "rpc-failed"
    | "invalid-credentials";
};

function getAdminConfig() {
  const username = (process.env.ADMIN_USERNAME ?? process.env.ADMIN_USER ?? "admin").trim();
  const password = (process.env.ADMIN_PASSWORD ?? process.env.ADMIN_PASS ?? "Thanh94@@").trim();
  const sessionSecret = (process.env.ADMIN_SESSION_SECRET ?? "change-this-secret-in-production").trim();

  return {
    username,
    password,
    sessionSecret
  };
}

function signPayload(payload: string) {
  const { sessionSecret } = getAdminConfig();
  return createHmac("sha256", sessionSecret).update(payload).digest("hex");
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export async function verifyAdminCredentials(username: string, password: string): Promise<AdminVerifyResult> {
  try {
    const identifier = username.trim().toLowerCase();
    const cleanPassword = password.trim();
    const envConfig = getAdminConfig();

    if (!identifier || !cleanPassword) {
      return { ok: false, reason: "missing-input" };
    }

    const { url, serviceRoleKey } = getSupabaseEnv();

    if (!url || !serviceRoleKey) {
      console.error("[admin-auth] Supabase env is missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
      return { ok: false, reason: "supabase-not-configured" };
    }

    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data: profileRows, error: profileError } = await supabase
      .from("admin_profiles")
      .select("username,email,password_hash,is_active")
      .eq("is_active", true)
      .or(`username.eq.${identifier},email.eq.${identifier}`)
      .limit(1);

    if (profileError) {
      console.error("[admin-auth] admin_profiles query failed", profileError.message);
    }

    if (profileError) {
      const envMatched =
        safeCompare(identifier, envConfig.username.toLowerCase()) && safeCompare(cleanPassword, envConfig.password);
      if (envMatched) {
        console.warn("[admin-auth] Supabase query failed, fallback to ENV admin credentials.");
        return { ok: true, reason: "invalid-credentials" };
      }

      return { ok: false, reason: "db-query-failed" };
    }

    if (Array.isArray(profileRows) && profileRows.length > 0) {
      const matchedProfile = profileRows[0];

      if (matchedProfile?.password_hash) {
        try {
          const storedHash = String(matchedProfile.password_hash);
          if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
            const matched = compareSync(cleanPassword, storedHash);
            return {
              ok: matched,
              reason: matched ? "invalid-credentials" : "password-mismatch"
            };
          }

          const matched = safeCompare(cleanPassword, storedHash);
          return {
            ok: matched,
            reason: matched ? "invalid-credentials" : "password-mismatch"
          };
        } catch (error) {
          console.error("[admin-auth] bcrypt compare failed", error);
          return { ok: false, reason: "db-query-failed" };
        }
      }

      return { ok: false, reason: "invalid-credentials" };
    }

    return { ok: false, reason: "invalid-credentials" };
  } catch (error) {
    console.error("[admin-auth] unexpected verify error", error);

    const identifier = username.trim().toLowerCase();
    const cleanPassword = password.trim();
    const envConfig = getAdminConfig();
    const envMatched =
      safeCompare(identifier, envConfig.username.toLowerCase()) && safeCompare(cleanPassword, envConfig.password);
    if (envMatched) {
      console.warn("[admin-auth] unexpected error, fallback to ENV admin credentials.");
      return { ok: true, reason: "invalid-credentials" };
    }

    return { ok: false, reason: "db-query-failed" };
  }
}

export function createAdminSessionToken(username: string) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${username}.${expiresAt}`;
  const signature = signPayload(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyAdminSessionToken(token?: string | null) {
  if (!token) return false;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [username, expiresAtRaw, signature] = decoded.split(".");
    if (!username || !expiresAtRaw || !signature) return false;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

    const payload = `${username}.${expiresAtRaw}`;
    const expectedSignature = signPayload(payload);
    return safeCompare(signature, expectedSignature);
  } catch {
    return false;
  }
}
