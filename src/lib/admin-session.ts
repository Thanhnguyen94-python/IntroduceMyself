import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

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

export function verifyAdminCredentials(username: string, password: string) {
  const config = getAdminConfig();
  return safeCompare(username.trim(), config.username) && safeCompare(password.trim(), config.password);
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
