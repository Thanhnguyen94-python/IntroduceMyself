import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getAdminConfig() {
  return {
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "Thanh94@@",
    sessionSecret: process.env.ADMIN_SESSION_SECRET ?? "change-this-secret-in-production"
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
  return safeCompare(username, config.username) && safeCompare(password, config.password);
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
