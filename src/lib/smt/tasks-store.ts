import { deleteRows, getRow, insertRow, selectRows, updateRows } from "@/lib/data/table-store";
import { SmtValidationError, parseDate } from "@/lib/smt/datasets";
import { ENGINEER_LEVELS, ENGINEER_ROLES, OPEN_STATUSES, TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, type Engineer, type Task, type TaskUpdate } from "@/lib/smt/team-types";
import { todayVn } from "@/lib/smt/types";

// Ghi công việc / kỹ sư. Mọi thao tác kèm is_demo của chế độ đang xem: sửa ở Demo không chạm dữ liệu thật
// (và ngược lại) vì điều kiện cập nhật luôn có cả id lẫn is_demo.

type Row = Record<string, unknown> & { id: string };

const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const pick = <T extends string>(v: unknown, list: Array<{ id: T }>, fallback: T): T => (list.some((x) => x.id === v) ? (v as T) : fallback);
const int = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
};
const hours = (v: unknown) => Math.max(0, Math.min(10_000, Math.round((Number(v) || 0) * 2) / 2));
const dateOrNull = (v: unknown) => (v === null || v === "" ? null : parseDate(String(v ?? "")));

// ---------- Kỹ sư ----------
export function normalizeEngineer(input: Record<string, unknown>, partial: boolean) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => !partial || k in input;
  if (has("code")) out.code = text(input.code, 20).toUpperCase();
  if (has("name")) out.name = text(input.name, 80);
  if (has("role")) out.role = pick(input.role, ENGINEER_ROLES, "process");
  if (has("level")) out.level = pick(input.level, ENGINEER_LEVELS, "mid");
  if (has("lines")) out.lines = text(input.lines, 200).toUpperCase().replace(/\s+/g, "");
  if (has("capacity_h")) out.capacity_h = Math.max(0, Math.min(80, Number(input.capacity_h) || 40));
  if (has("joined_on")) out.joined_on = dateOrNull(input.joined_on);
  if (has("active")) out.active = input.active !== false;
  if (has("note")) out.note = text(input.note, 500);
  if (!partial && !out.name) throw new SmtValidationError("Nhập tên kỹ sư.");
  return out;
}

export async function saveEngineer(demo: boolean, input: Record<string, unknown>, id?: string) {
  const row = normalizeEngineer(input, Boolean(id));
  const now = new Date().toISOString();
  if (!id && !row.code) {
    const all = await selectRows<Engineer>("smt_engineers", { eq: { is_demo: demo }, columns: "code", limit: 500 });
    const max = all.reduce((m, e) => Math.max(m, Number(e.code.replace(/\D/g, "")) || 0), 0);
    row.code = `KS${String(max + 1).padStart(2, "0")}`;
  }
  if (row.code) {
    const dup = await selectRows<Engineer>("smt_engineers", { eq: { is_demo: demo, code: String(row.code) }, limit: 1 });
    if (dup[0] && dup[0].id !== id) throw new SmtValidationError(`Mã kỹ sư "${row.code}" đã tồn tại.`);
  }
  if (id) {
    const n = await updateRows("smt_engineers", { id, is_demo: demo }, { ...row, updated_at: now });
    if (!n) throw new SmtValidationError("Không tìm thấy kỹ sư.");
    return getRow<Engineer>("smt_engineers", id);
  }
  return insertRow("smt_engineers", { ...row, is_demo: demo, updated_at: now });
}

export async function deleteEngineer(demo: boolean, id: string) {
  // Việc của người bị xoá vẫn giữ lại (assignee = null) để không mất lịch sử.
  await deleteRows("smt_engineers", { id, is_demo: demo });
}

// ---------- Công việc ----------
export function normalizeTask(input: Record<string, unknown>, partial: boolean) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => !partial || k in input;
  if (has("title")) out.title = text(input.title, 200);
  if (has("description")) out.description = text(input.description, 4000);
  if (has("category")) out.category = pick(input.category, TASK_CATEGORIES, "other");
  if (has("priority")) out.priority = pick(input.priority, TASK_PRIORITIES, "medium");
  if (has("difficulty")) out.difficulty = int(input.difficulty, 1, 5, 2);
  if (has("assignee_id")) out.assignee_id = text(input.assignee_id, 64) || null;
  if (has("line")) out.line = text(input.line, 20).toUpperCase();
  if (has("ref_code")) out.ref_code = text(input.ref_code, 40);
  if (has("status")) out.status = pick(input.status, TASK_STATUSES, "todo");
  if (has("progress")) out.progress = int(input.progress, 0, 100, 0);
  if (has("assigned_on")) out.assigned_on = dateOrNull(input.assigned_on) ?? todayVn();
  for (const k of ["start_on", "due_on", "done_on", "follow_up_on"]) if (has(k)) out[k] = dateOrNull(input[k]);
  if (has("estimate_h")) out.estimate_h = hours(input.estimate_h);
  if (has("actual_h")) out.actual_h = hours(input.actual_h);
  // Chưa chấm = null (không được tự gán điểm mặc định, sẽ làm lệch điểm Chất lượng).
  if (has("quality_score")) out.quality_score = input.quality_score === null || input.quality_score === undefined || input.quality_score === "" ? null : int(input.quality_score, 1, 5, 3);
  if (has("rework_count")) out.rework_count = int(input.rework_count, 0, 50, 0);
  if ("approved" in input) out.approved = input.approved !== false;
  if (!partial && !out.title) throw new SmtValidationError("Nhập tên công việc.");
  return out;
}

async function nextTaskCode(demo: boolean, date: string) {
  const stem = `T-${date.slice(2, 4)}${date.slice(5, 7)}-`;
  const rows = await selectRows<{ code: string }>("smt_tasks", { eq: { is_demo: demo }, columns: "code", limit: 20_000 });
  const max = rows.filter((r) => r.code?.startsWith(stem)).reduce((m, r) => Math.max(m, Number(r.code.slice(stem.length)) || 0), 0);
  return `${stem}${String(max + 1).padStart(3, "0")}`;
}

async function log(demo: boolean, taskId: string, entry: Partial<TaskUpdate>) {
  await insertRow("smt_task_updates", { task_id: taskId, at: todayVn(), kind: "note", status: "", progress: null, hours: 0, author: "", note: "", ...entry, is_demo: demo, updated_at: new Date().toISOString() });
}

// extra: các trường do server quyết định theo quyền (vd việc kỹ sư đề xuất: approved = false, giao cho chính họ).
export async function createTask(demo: boolean, input: Record<string, unknown>, author: string, extra: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = { ...normalizeTask(input, false), approved: true, created_by: author, ...extra };
  const code = await nextTaskCode(demo, String(row.assigned_on));
  if (row.status === "doing" && !row.start_on) row.start_on = todayVn();
  const task = (await insertRow("smt_tasks", { ...row, code, is_demo: demo, updated_at: new Date().toISOString() })) as unknown as Task;
  await log(demo, task.id, { kind: "status", status: String(row.status), note: row.approved === false ? "Đề xuất việc (chờ duyệt)" : "Giao việc", author });
  return task;
}

// Sửa việc + tự ghi nhật ký khi đổi trạng thái / tiến độ.
export async function updateTask(demo: boolean, id: string, input: Record<string, unknown>, author: string, note = "") {
  const current = await getRow<Row>("smt_tasks", id);
  if (!current || Boolean(current.is_demo) !== demo) throw new SmtValidationError("Không tìm thấy công việc.");
  const patch = normalizeTask(input, true);
  const before = current as unknown as Task;
  const status = (patch.status as Task["status"] | undefined) ?? before.status;
  if (patch.status && patch.status !== before.status) {
    if (status === "doing" && !before.start_on && !patch.start_on) patch.start_on = todayVn();
    if (status === "review") patch.progress = 100;
    if (status === "done") {
      patch.progress = 100;
      if (!before.done_on && !patch.done_on) patch.done_on = todayVn();
    }
    if (OPEN_STATUSES.includes(status)) patch.done_on = null;
  }
  await updateRows("smt_tasks", { id, is_demo: demo }, { ...patch, updated_at: new Date().toISOString() });
  if (patch.approved === true && before.approved === false) await log(demo, id, { kind: "status", status: status, author, note: "Đã duyệt việc đề xuất" });
  if (patch.status && patch.status !== before.status) await log(demo, id, { kind: status === "done" ? "review" : "status", status, progress: (patch.progress as number) ?? null, author, note: note || (status === "done" && patch.quality_score ? `Nghiệm thu: ${patch.quality_score}/5` : "") });
  else if (patch.progress !== undefined && patch.progress !== before.progress) await log(demo, id, { kind: "progress", progress: patch.progress as number, author, note });
  else if (note) await log(demo, id, { kind: "note", author, note });
  return getRow<Task>("smt_tasks", id);
}

// Quản lý trả lại việc đang chờ nghiệm thu: +1 lần làm lại, về "Đang làm".
export async function returnTask(demo: boolean, id: string, author: string, note: string) {
  const current = await getRow<Task & { is_demo: boolean }>("smt_tasks", id);
  if (!current || Boolean(current.is_demo) !== demo) throw new SmtValidationError("Không tìm thấy công việc.");
  await updateRows("smt_tasks", { id, is_demo: demo }, { status: "doing", progress: 80, done_on: null, rework_count: (Number(current.rework_count) || 0) + 1, updated_at: new Date().toISOString() });
  await log(demo, id, { kind: "rework", status: "doing", author, note: note || "Trả lại làm lại" });
  return getRow<Task>("smt_tasks", id);
}

export async function addTaskNote(demo: boolean, id: string, input: { note?: unknown; hours?: unknown; author?: unknown }) {
  const current = await getRow<Task & { is_demo: boolean }>("smt_tasks", id);
  if (!current || Boolean(current.is_demo) !== demo) throw new SmtValidationError("Không tìm thấy công việc.");
  const h = hours(input.hours);
  const note = text(input.note, 1000);
  if (!note && !h) throw new SmtValidationError("Nhập nội dung hoặc số giờ.");
  await log(demo, id, { kind: "note", note, hours: h, author: text(input.author, 80) });
  if (h) await updateRows("smt_tasks", { id, is_demo: demo }, { actual_h: (Number(current.actual_h) || 0) + h, updated_at: new Date().toISOString() });
  return getRow<Task>("smt_tasks", id);
}

export async function deleteTask(demo: boolean, id: string) {
  await deleteRows("smt_task_updates", { task_id: id, is_demo: demo });
  await deleteRows("smt_tasks", { id, is_demo: demo });
}
