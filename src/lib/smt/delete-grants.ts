import { getRow, insertRow, selectRows, updateRows } from "@/lib/data/table-store";
import { notifyAdmin } from "@/lib/notify";
import { SmtValidationError, isDatasetKey } from "@/lib/smt/datasets";
import { can, type SmtActor } from "@/lib/smt/permissions";
import { deleteDatasetRow } from "@/lib/smt/store";
import { deleteEngineer, deleteTask } from "@/lib/smt/tasks-store";
import { softDeleteMessage } from "@/lib/smt/chat-store";
import { addDays, todayVn } from "@/lib/smt/types";

// Trợ lý xoá dữ liệu: lần đầu bấm xoá -> gửi yêu cầu cho admin. Admin duyệt kèm thời hạn:
//  - once  : chỉ xoá đúng các dòng trong yêu cầu (thực hiện ngay khi duyệt)
//  - day   : xoá ngay + được xoá thẳng đến 23:59 hôm nay (giờ VN)
//  - month : xoá ngay + được xoá thẳng trong 30 ngày
// Hết hạn -> bấm xoá lại phải xin quyền. Admin luôn xoá thẳng.

export type DeleteTarget = { kind: "dataset" | "task" | "engineer" | "chat"; dataset?: string; ids: string[]; label: string; demo: boolean };
export type DeleteScope = "once" | "day" | "month";

export type DeleteRequest = {
  id: string;
  account_id: string;
  requester: string;
  target: DeleteTarget;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  scope: DeleteScope | null;
  expires_at: string | null;
  decided_by: string;
  decided_at: string | null;
  executed: boolean;
  created_at: string;
};

export const SCOPES: Array<{ id: DeleteScope; vi: string; en: string }> = [
  { id: "once", vi: "Chỉ lần này", en: "This time only" },
  { id: "day", vi: "Trong hôm nay", en: "For today" },
  { id: "month", vi: "Trong 1 tháng", en: "For 1 month" }
];

export class NeedGrantError extends Error {
  code = "need_grant";
}

// Hạn quyền đang còn của trợ lý (null = không có).
export async function activeGrant(accountId: string): Promise<DeleteRequest | null> {
  const rows = await selectRows<DeleteRequest>("smt_delete_requests", { eq: { account_id: accountId, status: "approved" }, order: ["expires_at", "desc"], limit: 20 });
  const now = new Date().toISOString();
  return rows.find((r) => r.scope !== "once" && r.expires_at && r.expires_at > now) ?? null;
}

// Gọi trước mọi thao tác xoá trong /smt.
export async function assertCanDelete(actor: SmtActor | null) {
  if (can(actor, "delete.direct")) return;
  if (!can(actor, "delete.request")) throw new SmtValidationError("Bạn không có quyền xoá.");
  if (!(await activeGrant(actor!.id))) throw new NeedGrantError("Cần admin cho phép xoá. Gửi yêu cầu xin quyền?");
}

export async function requestDelete(actor: SmtActor, target: DeleteTarget, reason: string, origin: string) {
  if (!can(actor, "delete.request")) throw new SmtValidationError("Bạn không có quyền gửi yêu cầu xoá.");
  if (!target.ids?.length) throw new SmtValidationError("Không có dòng nào để xoá.");
  if (target.kind === "dataset" && !isDatasetKey(String(target.dataset))) throw new SmtValidationError("Bộ dữ liệu không hợp lệ.");
  const clean: DeleteTarget = { kind: target.kind, dataset: target.dataset, ids: target.ids.slice(0, 500).map(String), label: String(target.label ?? "").slice(0, 200), demo: Boolean(target.demo) };
  const row = await insertRow("smt_delete_requests", { account_id: actor.id, requester: actor.name, target: clean, reason: reason.trim().slice(0, 500), status: "pending", scope: null, expires_at: null, decided_by: "", decided_at: null, executed: false, updated_at: new Date().toISOString() });
  await notifyAdmin({
    channel: "chat",
    title: `🗑 ${actor.name} xin quyền xoá dữ liệu SMT`,
    fields: [
      ["Dữ liệu", clean.label || clean.kind],
      ["Số dòng", String(clean.ids.length)],
      ["Chế độ", clean.demo ? "Demo" : "Thực tế"]
    ],
    message: reason || "(không ghi lý do)",
    link: `${origin}/smt/quan-tri#xoa`
  }).catch((e) => console.error("[smt] notify delete request failed", e));
  return row;
}

async function execute(target: DeleteTarget) {
  for (const id of target.ids) {
    if (target.kind === "dataset" && isDatasetKey(String(target.dataset))) await deleteDatasetRow(target.dataset as never, id);
    if (target.kind === "task") await deleteTask(target.demo, id);
    if (target.kind === "engineer") await deleteEngineer(target.demo, id);
    if (target.kind === "chat") await softDeleteMessage(id);
  }
}

export async function decideRequest(admin: SmtActor, id: string, approve: boolean, scope: DeleteScope) {
  if (!can(admin, "delete.decide")) throw new SmtValidationError("Chỉ admin duyệt được.");
  const req = await getRow<DeleteRequest>("smt_delete_requests", id);
  if (!req || req.status !== "pending") throw new SmtValidationError("Yêu cầu không còn chờ duyệt.");
  const now = new Date();
  if (!approve) {
    await updateRows("smt_delete_requests", { id }, { status: "rejected", decided_by: admin.name, decided_at: now.toISOString(), updated_at: now.toISOString() });
    return;
  }
  // Hết ngày theo giờ VN (UTC+7): 23:59:59 hôm nay = 16:59:59 UTC.
  const expires = scope === "once" ? now.toISOString() : scope === "day" ? `${todayVn()}T16:59:59.000Z` : new Date(`${addDays(todayVn(), 30)}T16:59:59.000Z`).toISOString();
  await execute(req.target);
  await updateRows("smt_delete_requests", { id }, { status: "approved", scope, expires_at: expires, executed: true, decided_by: admin.name, decided_at: now.toISOString(), updated_at: now.toISOString() });
}

export async function listRequests(actor: SmtActor) {
  const q = can(actor, "delete.decide") ? {} : { eq: { account_id: actor.id } };
  return selectRows<DeleteRequest>("smt_delete_requests", { ...q, order: ["created_at", "desc"], limit: 100 });
}

export async function cancelRequest(actor: SmtActor, id: string) {
  const req = await getRow<DeleteRequest>("smt_delete_requests", id);
  if (!req || req.account_id !== actor.id || req.status !== "pending") throw new SmtValidationError("Không huỷ được yêu cầu này.");
  await updateRows("smt_delete_requests", { id }, { status: "cancelled", updated_at: new Date().toISOString() });
}

export async function pendingCount() {
  return (await selectRows<{ id: string }>("smt_delete_requests", { eq: { status: "pending" }, columns: "id", limit: 200 })).length;
}
