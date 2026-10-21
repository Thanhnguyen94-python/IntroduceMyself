import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai/provider";
import { currentActor } from "@/lib/smt/accounts";
import { apiFail, deny } from "@/lib/smt/api-helpers";
import { can } from "@/lib/smt/permissions";
import { readWorkspaceSettings, writeWorkspaceSettings, type WorkspaceSettings } from "@/lib/smt/workspace-settings";

export const dynamic = "force-dynamic";

// Lịch báo cáo tự động: admin + trợ lý sửa. Bật tóm tắt AI: chỉ admin.
export async function GET() {
  const actor = await currentActor();
  if (!can(actor, "schedule.edit")) return deny("Unauthorized", 401);
  return NextResponse.json({ settings: await readWorkspaceSettings(), ai: aiStatus() });
}

export async function PUT(request: Request) {
  const actor = await currentActor();
  if (!can(actor, "schedule.edit")) return deny("Unauthorized", 401);
  const body = (await request.json().catch(() => null)) as { settings?: Partial<WorkspaceSettings> } | null;
  if (!body?.settings) return deny("Invalid payload.", 400);
  try {
    const current = await readWorkspaceSettings();
    // Trợ lý không đổi được công tắc AI (liên quan chi phí / dữ liệu gửi ra ngoài).
    const aiSummary = can(actor, "ai.configure") ? Boolean(body.settings.aiSummary) : current.aiSummary;
    return NextResponse.json({ ok: true, settings: await writeWorkspaceSettings({ ...current, ...body.settings, aiSummary }) });
  } catch (error) {
    return apiFail(error, "Lưu thất bại.");
  }
}
