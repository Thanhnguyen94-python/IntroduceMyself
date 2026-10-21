import { NextResponse } from "next/server";
import { currentActor } from "@/lib/smt/accounts";
import { apiFail, deny } from "@/lib/smt/api-helpers";
import { generateReport, listReports } from "@/lib/smt/auto-reports";
import { can } from "@/lib/smt/permissions";
import { readWorkspaceSettings } from "@/lib/smt/workspace-settings";

export const dynamic = "force-dynamic";

// POST {hours?: 24} -> admin / trợ lý tạo báo cáo ngay cho N giờ vừa qua (ngoài lịch).
export async function POST(request: Request) {
  const actor = await currentActor();
  if (!can(actor, "schedule.edit")) return deny("Chỉ quản lý / trợ lý tạo báo cáo.", actor ? 403 : 401);
  const body = (await request.json().catch(() => ({}))) as { hours?: number };
  const hours = Math.min(24 * 31, Math.max(1, Math.round(Number(body.hours) || 24)));
  const to = new Date();
  const from = new Date(to.getTime() - hours * 3600_000);
  try {
    const s = await readWorkspaceSettings();
    const item = await generateReport(hours > 48 ? "weekly" : "daily", `manual ${to.toISOString()}`, from.toISOString(), to.toISOString(), s.aiSummary);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return apiFail(error, "Tạo báo cáo thất bại.");
  }
}

export async function GET() {
  if (!(await currentActor())) return deny("Cần đăng nhập.", 401);
  return NextResponse.json({ items: await listReports() });
}
