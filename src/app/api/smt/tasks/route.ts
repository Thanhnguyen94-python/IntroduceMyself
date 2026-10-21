import { NextResponse } from "next/server";
import { getRow } from "@/lib/data/table-store";
import { apiFail, deny } from "@/lib/smt/api-helpers";
import { assertCanDelete } from "@/lib/smt/delete-grants";
import { can } from "@/lib/smt/permissions";
import { addTaskNote, createTask, deleteTask, returnTask, updateTask } from "@/lib/smt/tasks-store";
import type { Task } from "@/lib/smt/team-types";
import { workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";

// Công việc của đội kỹ sư (/smt/cong-viec). Ghi vào chế độ đang xem (demo / thật). Quyền (permissions.ts):
//  - Admin   : mọi thao tác, kể cả nghiệm thu / chấm điểm / trả lại.
//  - Trợ lý  : giao, sửa, duyệt việc đề xuất. Không nghiệm thu. Xoá cần admin cho phép.
//  - Kỹ sư   : chỉ dữ liệu thật; đề xuất việc cho mình, cập nhật việc của mình (không sửa hạn / độ khó / điểm).

// Trường kỹ sư được tự sửa trên việc của mình.
const ENGINEER_FIELDS = new Set(["status", "progress"]);
const ENGINEER_STATUSES = new Set(["doing", "blocked", "review"]);
const REVIEW_FIELDS = ["quality_score", "rework_count", "done_on"];

async function context() {
  const ctx = await workspaceContext();
  if (!ctx.actor) return { error: deny("Cần đăng nhập.", 401) };
  if (ctx.demo && !ctx.staff) return { error: deny("Ở chế độ Demo chỉ quản lý / trợ lý được thử thao tác.") };
  if (ctx.demo && !ctx.stored) return { error: deny("Dữ liệu demo chưa được lưu vào database (Admin → SMT → Dữ liệu demo) nên chưa sửa được.", 409) };
  return { ctx, actor: ctx.actor };
}

async function ownTask(id: string, demo: boolean) {
  const t = await getRow<Task & { is_demo?: boolean }>("smt_tasks", id);
  return t && Boolean(t.is_demo) === demo ? t : null;
}

export async function POST(request: Request) {
  const g = await context();
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return deny("Không có dữ liệu.", 400);
  try {
    if (can(g.actor, "tasks.manage")) return NextResponse.json({ ok: true, item: await createTask(g.ctx.demo, body, g.actor.name) });
    // Kỹ sư: việc phát sinh tự đề xuất -> giao cho chính mình, chờ duyệt.
    if (!g.actor.engineerId) return deny("Tài khoản chưa gắn với hồ sơ kỹ sư. Nhờ admin gắn trong Quản trị → Tài khoản.");
    const { title, description, category, line, due_on, estimate_h, ref_code } = body;
    return NextResponse.json({ ok: true, item: await createTask(g.ctx.demo, { title, description, category, line, due_on, estimate_h, ref_code, priority: "medium", difficulty: 2 }, g.actor.name, { assignee_id: g.actor.engineerId, approved: false, status: "todo" }) });
  } catch (error) {
    return apiFail(error, "Tạo công việc thất bại.");
  }
}

// PATCH {id, ...trường cần sửa, note?}  ·  {id, action: "return", note}  ·  {id, action: "note", note, hours}
export async function PATCH(request: Request) {
  const g = await context();
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as (Record<string, unknown> & { id?: string; action?: string; note?: string }) | null;
  if (!body?.id) return deny("Missing id.", 400);
  const { id, action, note, ...patch } = body;
  const { ctx, actor } = g;
  try {
    const task = await ownTask(String(id), ctx.demo);
    if (!task) return deny("Không tìm thấy công việc.", 404);
    const mine = Boolean(actor.engineerId && task.assignee_id === actor.engineerId);

    if (!can(actor, "tasks.manage")) {
      if (!mine) return deny("Bạn chỉ cập nhật được việc của mình.");
      if (action === "return") return deny("Chỉ quản lý trả lại việc.");
      const bad = Object.keys(patch).filter((k) => k !== "hours" && !ENGINEER_FIELDS.has(k));
      if (bad.length) return deny(`Kỹ sư không sửa được: ${bad.join(", ")}.`);
      if (patch.status !== undefined && !ENGINEER_STATUSES.has(String(patch.status))) return deny("Kỹ sư chỉ chuyển được: Đang làm / Bị chặn / Gửi nghiệm thu.");
      if (patch.status !== undefined && task.status === "done") return deny("Việc đã nghiệm thu, nhờ quản lý mở lại.");
    } else if (!can(actor, "tasks.review")) {
      // Trợ lý: mọi thứ trừ nghiệm thu / chấm điểm / trả lại.
      if (action === "return" || patch.status === "done" || REVIEW_FIELDS.some((k) => k in patch)) return deny("Nghiệm thu và chấm điểm chỉ quản lý (admin) làm.");
      if (task.status === "done" && patch.status !== undefined) return deny("Việc đã nghiệm thu, chỉ admin mở lại được.");
    }

    const item =
      action === "return"
        ? await returnTask(ctx.demo, String(id), actor.name, String(note ?? ""))
        : action === "note"
          ? await addTaskNote(ctx.demo, String(id), { note, hours: patch.hours, author: actor.name })
          : await updateTask(ctx.demo, String(id), patch, actor.name, String(note ?? ""));
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return apiFail(error, "Cập nhật thất bại.");
  }
}

export async function DELETE(request: Request) {
  const g = await context();
  if ("error" in g) return g.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return deny("Missing id.", 400);
  try {
    const task = await ownTask(id, g.ctx.demo);
    if (!task) return deny("Không tìm thấy công việc.", 404);
    // Kỹ sư huỷ được đề xuất của chính mình khi chưa duyệt.
    const ownProposal = task.approved === false && Boolean(g.actor.engineerId) && task.assignee_id === g.actor.engineerId;
    if (!ownProposal) await assertCanDelete(g.actor);
    await deleteTask(g.ctx.demo, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFail(error, "Xoá thất bại.");
  }
}
