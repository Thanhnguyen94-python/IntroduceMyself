import { NextResponse } from "next/server";
import { getAdminUsername } from "@/lib/admin-guard";
import { hashAdminPassword, verifyAdminCredentials } from "@/lib/admin-session";
import { checkLoginAllowed, clearLoginFailures, clientKeyFrom, recordLoginFailure } from "@/lib/login-rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MIN_LENGTH = 10;

// Đổi mật khẩu admin: phải nhập đúng mật khẩu hiện tại, lưu hash bcrypt vào admin_profiles.password_hash.
export async function POST(request: Request) {
  const username = await getAdminUsername();
  if (!username) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rateKey = clientKeyFrom(request, `admin-password:${username}`);
  const gate = checkLoginAllowed(rateKey);
  if (!gate.allowed) {
    return NextResponse.json({ message: `Nhập sai quá nhiều lần. Thử lại sau ${Math.ceil(gate.retryAfterSec / 60)} phút.` }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { currentPassword?: string; newPassword?: string };
  const currentPassword = String(body.currentPassword ?? "").trim();
  const newPassword = String(body.newPassword ?? "").trim();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ message: "Vui lòng nhập đủ mật khẩu hiện tại và mật khẩu mới." }, { status: 400 });
  }
  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json({ message: `Mật khẩu mới phải có ít nhất ${MIN_LENGTH} ký tự.` }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ message: "Mật khẩu mới phải khác mật khẩu hiện tại." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        message:
          "Đang chạy local không có Supabase nên không lưu được mật khẩu vào database. Hãy đổi ADMIN_PASSWORD trong file .env.local rồi khởi động lại server."
      },
      { status: 400 }
    );
  }

  const check = await verifyAdminCredentials(username, currentPassword);
  if (!check.ok) {
    if (check.reason === "db-query-failed") {
      return NextResponse.json({ message: "Lỗi database, chưa đổi được mật khẩu. Thử lại sau." }, { status: 503 });
    }
    recordLoginFailure(rateKey);
    return NextResponse.json({ message: "Mật khẩu hiện tại không đúng." }, { status: 400 });
  }
  clearLoginFailures(rateKey);

  const identifier = username.trim().toLowerCase();
  const { data, error } = await supabase
    .from("admin_profiles")
    .update({ password_hash: hashAdminPassword(newPassword), updated_at: new Date().toISOString() })
    .eq("is_active", true)
    .or(`username.eq.${identifier},email.eq.${identifier}`)
    .select("id");

  if (error) {
    console.error("[admin-password] update failed", error.message);
    return NextResponse.json({ message: "Không cập nhật được database. Xem log server." }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ message: "Không tìm thấy tài khoản trong admin_profiles." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
