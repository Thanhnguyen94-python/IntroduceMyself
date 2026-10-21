import { NextResponse } from "next/server";
import { apiFail, deny } from "@/lib/smt/api-helpers";
import { assertCanDelete } from "@/lib/smt/delete-grants";
import { can } from "@/lib/smt/permissions";
import { deleteEngineer, saveEngineer } from "@/lib/smt/tasks-store";
import { workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";

// Hồ sơ kỹ sư (/smt/doi-ngu). Admin + trợ lý; xoá của trợ lý cần admin cho phép. Ghi vào chế độ đang xem.
async function guard() {
  const ctx = await workspaceContext();
  if (!can(ctx.actor, "engineers.manage")) return { error: deny("Chỉ quản lý / trợ lý quản lý được danh sách kỹ sư.", ctx.actor ? 403 : 401) };
  if (!ctx.canEdit) return { error: deny("Dữ liệu demo chưa được lưu vào database nên chưa sửa được.", 409) };
  return { ctx };
}

export async function POST(request: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return deny("Không có dữ liệu.", 400);
  try {
    return NextResponse.json({ ok: true, item: await saveEngineer(g.ctx.demo, body) });
  } catch (error) {
    return apiFail(error, "Lưu thất bại.");
  }
}

export async function PATCH(request: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as (Record<string, unknown> & { id?: string }) | null;
  if (!body?.id) return deny("Missing id.", 400);
  const { id, ...patch } = body;
  try {
    return NextResponse.json({ ok: true, item: await saveEngineer(g.ctx.demo, patch, String(id)) });
  } catch (error) {
    return apiFail(error, "Lưu thất bại.");
  }
}

export async function DELETE(request: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return deny("Missing id.", 400);
  try {
    await assertCanDelete(g.ctx.actor);
    await deleteEngineer(g.ctx.demo, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFail(error, "Xoá thất bại.");
  }
}
