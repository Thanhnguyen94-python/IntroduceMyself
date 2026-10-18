import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, verifyAdminCredentials } from "@/lib/admin-session";
import { checkLoginAllowed, clearLoginFailures, clientKeyFrom, recordLoginFailure } from "@/lib/login-rate-limit";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  "supabase-not-configured": "Máy chủ chưa cấu hình xác thực (Supabase hoặc ADMIN_PASSWORD cho môi trường local).",
  "session-secret-missing": "Máy chủ chưa cấu hình ADMIN_SESSION_SECRET (tối thiểu 32 ký tự).",
  "db-query-failed": "Không kiểm tra được tài khoản do lỗi database. Vui lòng thử lại sau.",
  "missing-input": "Vui lòng nhập tài khoản và mật khẩu."
};

export async function POST(request: Request) {
  const rateKey = clientKeyFrom(request, "admin-login");
  const gate = checkLoginAllowed(rateKey);
  if (!gate.allowed) {
    return NextResponse.json(
      { message: `Đăng nhập sai quá nhiều lần. Thử lại sau ${Math.ceil(gate.retryAfterSec / 60)} phút.`, reason: "rate-limited" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body?.username ?? "");
    const password = String(body?.password ?? "");
    const result = await verifyAdminCredentials(username, password);

    if (!result.ok) {
      // Lỗi cấu hình/hạ tầng không tính là đoán sai mật khẩu.
      if (result.reason === "invalid-credentials" || result.reason === "password-mismatch") recordLoginFailure(rateKey);
      const status = result.reason === "db-query-failed" || result.reason.endsWith("configured") || result.reason === "session-secret-missing" ? 503 : 401;
      return NextResponse.json({ message: MESSAGES[result.reason] ?? "Sai tài khoản hoặc mật khẩu.", reason: result.reason }, { status });
    }

    clearLoginFailures(rateKey);
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: createAdminSessionToken(username.trim().toLowerCase()),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return response;
  } catch (error) {
    console.error("[admin-login] unexpected route error", error);
    return NextResponse.json({ message: "Lỗi máy chủ khi đăng nhập.", reason: "server-error" }, { status: 500 });
  }
}
