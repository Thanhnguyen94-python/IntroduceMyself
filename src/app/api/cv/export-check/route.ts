import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { isAdminRequest } from "@/lib/admin-guard";
import { checkLoginAllowed, clearLoginFailures, clientKeyFrom, recordLoginFailure } from "@/lib/login-rate-limit";

export const dynamic = "force-dynamic";

// Kiểm tra quyền xuất PDF CV ở server (trước đây mật khẩu nằm trong code chạy trên trình duyệt).
//  - Admin đã đăng nhập: luôn được xuất.
//  - Khách: phải nhập đúng CV_EXPORT_PASSWORD (biến môi trường). Không đặt biến -> chỉ admin xuất được.

function matches(input: string, expected: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET() {
  return NextResponse.json({ admin: await isAdminRequest() });
}

export async function POST(request: Request) {
  if (await isAdminRequest()) return NextResponse.json({ ok: true });

  const rateKey = clientKeyFrom(request, "cv-export");
  const gate = checkLoginAllowed(rateKey);
  if (!gate.allowed) return NextResponse.json({ ok: false, message: "rate-limited" }, { status: 429 });

  const expected = (process.env.CV_EXPORT_PASSWORD ?? "").trim();
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const input = String(body.password ?? "").trim();

  if (expected && input && matches(input, expected)) {
    clearLoginFailures(rateKey);
    return NextResponse.json({ ok: true });
  }
  recordLoginFailure(rateKey);
  return NextResponse.json({ ok: false }, { status: 401 });
}
