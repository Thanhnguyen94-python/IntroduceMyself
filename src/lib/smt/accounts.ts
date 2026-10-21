import { cache } from "react";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { compareSync } from "bcryptjs";
import { getAdminUsername, isAdminRequest } from "@/lib/admin-guard";
import { hashAdminPassword, signScoped, verifyScoped } from "@/lib/admin-session";
import { deleteRows, getRow, insertRow, selectRows, updateRows } from "@/lib/data/table-store";
import { SmtValidationError } from "@/lib/smt/datasets";
import type { SmtActor, SmtRole } from "@/lib/smt/permissions";

// Tài khoản Trợ lý / Kỹ sư của SMT Workspace (bảng smt_accounts). Admin dùng tài khoản admin hiện có.
// Phiên đăng nhập: cookie "smt_session" = base64url("<id>.<version>.<hết hạn>.<chữ ký>"), ký bằng
// ADMIN_SESSION_SECRET với scope "smt" -> không dùng thay cookie admin được, và không vào được /admin.

export const SMT_SESSION_COOKIE = "smt_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const SCOPE = "smt-account";

export type SmtAccount = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: Exclude<SmtRole, "admin">;
  engineer_id: string | null;
  active: boolean;
  must_change_password: boolean;
  session_version: number;
  last_login_at: string | null;
  created_at?: string;
};

export type PublicAccount = Omit<SmtAccount, "password_hash">;
export const publicAccount = ({ password_hash: _hash, ...rest }: SmtAccount): PublicAccount => rest;

const USERNAME = /^[a-z0-9._-]{3,40}$/;

export function createSessionToken(account: Pick<SmtAccount, "id" | "session_version">) {
  const payload = `${account.id}.${account.session_version}.${Date.now() + SESSION_TTL_MS}`;
  const sig = signScoped(SCOPE, payload);
  if (!sig) throw new Error("ADMIN_SESSION_SECRET chưa được cấu hình.");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function parseToken(token?: string) {
  if (!token) return null;
  try {
    const [id, version, exp, sig] = Buffer.from(token, "base64url").toString("utf-8").split(".");
    if (!id || !version || !exp || !sig || Date.now() > Number(exp)) return null;
    return verifyScoped(SCOPE, `${id}.${version}.${exp}`, sig) ? { id, version: Number(version) } : null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL_MS / 1000 };

// Tài khoản đang đăng nhập (đã kiểm tra còn hoạt động + đúng phiên bản phiên).
export const currentAccount = cache(async (): Promise<SmtAccount | null> => {
  const parsed = parseToken((await cookies()).get(SMT_SESSION_COOKIE)?.value);
  if (!parsed) return null;
  const account = await getRow<SmtAccount>("smt_accounts", parsed.id).catch(() => null);
  if (!account || !account.active || Number(account.session_version) !== parsed.version) return null;
  return account;
});

// Người đang thao tác trong /smt: admin (đăng nhập /admin) ưu tiên, sau đó tài khoản SMT.
export const currentActor = cache(async (): Promise<SmtActor | null> => {
  if (await isAdminRequest()) return { role: "admin", id: "admin", name: (await getAdminUsername()) || "admin", engineerId: null };
  const a = await currentAccount();
  return a ? { role: a.role, id: a.id, name: a.display_name || a.username, engineerId: a.engineer_id, mustChangePassword: a.must_change_password } : null;
});

export async function verifyLogin(username: string, password: string) {
  const u = username.trim().toLowerCase();
  if (!USERNAME.test(u) || !password) return null;
  const [account] = await selectRows<SmtAccount>("smt_accounts", { eq: { username: u }, limit: 1 });
  if (!account || !account.active || !compareSync(password, account.password_hash)) return null;
  await updateRows("smt_accounts", { id: account.id }, { last_login_at: new Date().toISOString() });
  return account;
}

// Mật khẩu tạm dễ đọc qua điện thoại (bỏ ký tự dễ nhầm 0/O, 1/l).
export function tempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(10), (b) => chars[b % chars.length]).join("");
}

function checkPassword(pw: string) {
  if (pw.length < 8) throw new SmtValidationError("Mật khẩu tối thiểu 8 ký tự.");
  if (pw.length > 100) throw new SmtValidationError("Mật khẩu quá dài.");
}

export async function listAccounts() {
  return (await selectRows<SmtAccount>("smt_accounts", { order: ["username", "asc"], limit: 500 })).map(publicAccount);
}

export async function createAccount(input: { username?: unknown; display_name?: unknown; role?: unknown; engineer_id?: unknown }) {
  const username = String(input.username ?? "").trim().toLowerCase();
  if (!USERNAME.test(username)) throw new SmtValidationError("Tên đăng nhập 3-40 ký tự: chữ thường không dấu, số, dấu . _ -");
  const role = input.role === "assistant" ? "assistant" : "engineer";
  const dup = await selectRows<SmtAccount>("smt_accounts", { eq: { username }, limit: 1 });
  if (dup[0]) throw new SmtValidationError(`Tên đăng nhập "${username}" đã có.`);
  const password = tempPassword();
  const row = await insertRow("smt_accounts", {
    username,
    display_name: String(input.display_name ?? "").trim().slice(0, 80) || username,
    password_hash: hashAdminPassword(password),
    role,
    engineer_id: role === "engineer" ? String(input.engineer_id ?? "") || null : null,
    active: true,
    must_change_password: true,
    session_version: 1,
    last_login_at: null,
    updated_at: new Date().toISOString()
  });
  return { account: publicAccount(row as unknown as SmtAccount), password };
}

export async function updateAccount(id: string, input: { display_name?: unknown; role?: unknown; engineer_id?: unknown; active?: unknown }) {
  const current = await getRow<SmtAccount>("smt_accounts", id);
  if (!current) throw new SmtValidationError("Không tìm thấy tài khoản.");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.display_name !== undefined) patch.display_name = String(input.display_name).trim().slice(0, 80) || current.username;
  if (input.role !== undefined) patch.role = input.role === "assistant" ? "assistant" : "engineer";
  if (input.engineer_id !== undefined) patch.engineer_id = String(input.engineer_id ?? "") || null;
  if ((patch.role ?? current.role) === "assistant") patch.engineer_id = null;
  // Khoá tài khoản hoặc đổi quyền -> đăng xuất mọi thiết bị đang dùng tài khoản này.
  if ((input.active !== undefined && Boolean(input.active) !== current.active) || (patch.role && patch.role !== current.role)) {
    patch.active = input.active === undefined ? current.active : Boolean(input.active);
    patch.session_version = Number(current.session_version) + 1;
  }
  await updateRows("smt_accounts", { id }, patch);
  return publicAccount((await getRow<SmtAccount>("smt_accounts", id))!);
}

export async function resetAccountPassword(id: string) {
  const current = await getRow<SmtAccount>("smt_accounts", id);
  if (!current) throw new SmtValidationError("Không tìm thấy tài khoản.");
  const password = tempPassword();
  await updateRows("smt_accounts", { id }, { password_hash: hashAdminPassword(password), must_change_password: true, session_version: Number(current.session_version) + 1, updated_at: new Date().toISOString() });
  return password;
}

export async function deleteAccount(id: string) {
  await deleteRows("smt_accounts", { id });
}

// Người dùng tự đổi mật khẩu. Trả về token mới (phiên bản tăng -> các thiết bị khác bị đăng xuất).
export async function changeOwnPassword(account: SmtAccount, oldPassword: string, newPassword: string) {
  if (!compareSync(oldPassword, account.password_hash)) throw new SmtValidationError("Mật khẩu hiện tại không đúng.");
  checkPassword(newPassword);
  if (newPassword === oldPassword) throw new SmtValidationError("Mật khẩu mới phải khác mật khẩu cũ.");
  const version = Number(account.session_version) + 1;
  await updateRows("smt_accounts", { id: account.id }, { password_hash: hashAdminPassword(newPassword), must_change_password: false, session_version: version, updated_at: new Date().toISOString() });
  return createSessionToken({ id: account.id, session_version: version });
}
