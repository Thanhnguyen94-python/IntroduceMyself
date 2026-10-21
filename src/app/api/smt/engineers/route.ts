import { NextResponse } from "next/server";
import { SmtValidationError } from "@/lib/smt/datasets";
import { deleteEngineer, saveEngineer } from "@/lib/smt/tasks-store";
import { workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";

// Danh sách kỹ sư (/smt/doi-ngu). Chỉ admin; ghi vào chế độ đang xem (demo / thật).
async function guard() {
  const ctx = await workspaceContext();
  if (!ctx.isAdmin) return { error: NextResponse.json({ message: "Cần đăng nhập admin." }, { status: 401 }) };
  if (!ctx.canEdit) return { error: NextResponse.json({ message: "Dữ liệu demo chưa được lưu vào database nên chưa sửa được." }, { status: 409 }) };
  return { ctx };
}

function fail(error: unknown, fallback: string) {
  const status = error instanceof SmtValidationError ? 400 : 500;
  return NextResponse.json({ message: error instanceof Error ? error.message : fallback }, { status });
}

export async function POST(request: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "Không có dữ liệu." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, item: await saveEngineer(g.ctx.demo, body) });
  } catch (error) {
    return fail(error, "Lưu thất bại.");
  }
}

export async function PATCH(request: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as (Record<string, unknown> & { id?: string }) | null;
  if (!body?.id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  const { id, ...patch } = body;
  try {
    return NextResponse.json({ ok: true, item: await saveEngineer(g.ctx.demo, patch, String(id)) });
  } catch (error) {
    return fail(error, "Lưu thất bại.");
  }
}

export async function DELETE(request: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  try {
    await deleteEngineer(g.ctx.demo, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "Xoá thất bại.");
  }
}
