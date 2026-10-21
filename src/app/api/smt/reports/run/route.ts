import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { ensureDueReports } from "@/lib/smt/auto-reports";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gọi định kỳ từ bên ngoài (Vercel Cron, GitHub Actions, cron-job.org...) để báo cáo được tạo đúng giờ
// kể cả khi không ai mở web. Bảo vệ bằng CRON_SECRET:
//   GET /api/smt/reports/run   Header: Authorization: Bearer <CRON_SECRET>   (Vercel Cron tự gửi header này)
// Không đặt CRON_SECRET -> endpoint tắt (báo cáo vẫn được tạo khi có người mở /smt).
export async function GET(request: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  const got = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (secret.length < 16 || got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, created: await ensureDueReports(false) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Thất bại." }, { status: 500 });
  }
}
