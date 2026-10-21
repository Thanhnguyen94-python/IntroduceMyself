import { NextResponse } from "next/server";
import { getAdminUsername } from "@/lib/admin-guard";
import { SmtValidationError } from "@/lib/smt/datasets";
import { addTaskNote, createTask, deleteTask, returnTask, updateTask } from "@/lib/smt/tasks-store";
import { workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";

// Công việc của đội kỹ sư (/smt/cong-viec). Chỉ admin được ghi; ghi vào chế độ đang xem (demo / thật).
async function guard() {
  const ctx = await workspaceContext();
  if (!ctx.isAdmin) return { error: NextResponse.json({ message: "Cần đăng nhập admin." }, { status: 401 }) };
  if (!ctx.canEdit) return { error: NextResponse.json({ message: "Dữ liệu demo chưa được lưu vào database (Admin → SMT → Dữ liệu demo) nên chưa sửa được." }, { status: 409 }) };
  return { ctx, author: (await getAdminUsername()) || "admin" };
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
    return NextResponse.json({ ok: true, item: await createTask(g.ctx.demo, body, g.author) });
  } catch (error) {
    return fail(error, "Tạo công việc thất bại.");
  }
}

// PATCH {id, ...trường cần sửa, note?}  ·  {id, action: "return", note}  ·  {id, action: "note", note, hours}
export async function PATCH(request: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as (Record<string, unknown> & { id?: string; action?: string; note?: string }) | null;
  if (!body?.id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  const { id, action, note, ...patch } = body;
  try {
    const item =
      action === "return"
        ? await returnTask(g.ctx.demo, String(id), g.author, String(note ?? ""))
        : action === "note"
          ? await addTaskNote(g.ctx.demo, String(id), { note, hours: patch.hours, author: g.author })
          : await updateTask(g.ctx.demo, String(id), patch, g.author, String(note ?? ""));
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return fail(error, "Cập nhật thất bại.");
  }
}

export async function DELETE(request: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  try {
    await deleteTask(g.ctx.demo, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "Xoá thất bại.");
  }
}
