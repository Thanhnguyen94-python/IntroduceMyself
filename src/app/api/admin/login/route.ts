import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  verifyAdminCredentials
} from "@/lib/admin-session";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body?.username ?? "");
    const password = String(body?.password ?? "");
    const authResult = await verifyAdminCredentials(username, password);

    if (!authResult.ok) {
      const message =
        authResult.reason === "supabase-not-configured"
          ? "Supabase auth is not configured on server."
          : authResult.reason === "db-query-failed" || authResult.reason === "rpc-failed"
            ? "Database auth check failed. Please check server logs."
            : "Invalid credentials.";

      return NextResponse.json({ message, reason: authResult.reason }, { status: 401 });
    }

    const token = createAdminSessionToken(username);
    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    console.error("[admin-login] unexpected route error", error);
    return NextResponse.json({ message: "Server error during login.", reason: "server-error" }, { status: 500 });
  }
}
