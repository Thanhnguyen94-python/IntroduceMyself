"use client";

// Id ngẫu nhiên cho từng trình duyệt (không chứa thông tin cá nhân), dùng chung cho thống kê / chat / hỏi đáp.
const VISITOR_KEY = "mj_vid";
const SESSION_KEY = "mj_sid";

function randomId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getVisitorId(): { id: string; isNew: boolean } {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return { id: existing, isNew: false };
    const id = randomId();
    window.localStorage.setItem(VISITOR_KEY, id);
    return { id, isNew: true };
  } catch {
    return { id: "anonymous", isNew: false };
  }
}

export function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = randomId();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "nosession";
  }
}

// Tôn trọng tuỳ chọn "Do Not Track" / "Global Privacy Control" của trình duyệt.
export function trackingAllowed() {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack !== "1" && nav.globalPrivacyControl !== true;
}

export function readStoredJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStoredJson(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // trình duyệt chặn localStorage -> bỏ qua
  }
}
