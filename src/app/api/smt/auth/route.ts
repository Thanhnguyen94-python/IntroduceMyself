import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_OPTIONS, SMT_SESSION_COOKIE, changeOwnPassword, createSessionToken, currentAccount, verifyLogin } from "@/lib/smt/accounts";
import { apiFail } from "@/lib/smt/api-helpers";
import { checkLoginAllowed, clearLoginFailures, clientKeyFrom, recordLoginFailure } from "@/lib/login-rate-limit";

export const dynamic = "force-dynamic";

// Đăng nhập tài khoản Trợ lý / Kỹ sư của SMT Workspace (không dùng cho /admin).
// POST {username, password} · PATCH {oldPassword, newPassword} (đổi mật khẩu) · DELETE = đăng xuất
export async function POST(request: Request) {
  const key = clientKeyFrom(request, "smt-login");
  const gate = checkLoginAllowed(key);
  if (!gate.allowed) return NextResponse.json({ message: `Đăng nhập sai quá nhiều lần. Thử lại sau ${Math.ceil(gate.retryAfterSec / 60)} phút.` }, { status: 429 });
  const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
  try {
    const account = await verifyLogin(String(body.username ?? ""), String(body.password ?? ""));
    if (!account) {
      recordLoginFailure(key);
      return NextResponse.json({ message: "Sai tên đăng nhập hoặc mật khẩu, hoặc tài khoản đã bị khoá." }, { status: 401 });
    }
    clearLoginFailures(key);
    const res = NextResponse.json({ ok: true, mustChangePassword: account.must_change_password });
    res.cookies.set({ name: SMT_SESSION_COOKIE, value: createSessionToken(account), ...SESSION_COOKIE_OPTIONS });
    return res;
  } catch (error) {
    return apiFail(error, "Lỗi máy chủ khi đăng nhập.");
  }
}

export async function PATCH(request: Request) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ message: "Cần đăng nhập." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { oldPassword?: string; newPassword?: string };
  try {
    const token = await changeOwnPassword(account, String(body.oldPassword ?? ""), String(body.newPassword ?? ""));
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ name: SMT_SESSION_COOKIE, value: token, ...SESSION_COOKIE_OPTIONS });
    return res;
  } catch (error) {
    return apiFail(error, "Đổi mật khẩu thất bại.");
  }
}

export async function DELETE() {
  (await cookies()).delete(SMT_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
