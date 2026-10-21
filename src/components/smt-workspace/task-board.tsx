"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/smt/smt-charts";
import { TaskForm, type TaskDraft } from "@/components/smt-workspace/task-form";
import { deleteOrRequest } from "@/components/smt-workspace/delete-request";
import { followUps, taskPoints } from "@/lib/smt/team-metrics";
import { OPEN_STATUSES, TASK_CATEGORIES, categoryOf, priorityOf, statusOf, type Engineer, type Task, type TaskStatus, type TaskUpdate } from "@/lib/smt/team-types";
import { addDays, daysBetween, dmy } from "@/lib/smt/types";

// Bảng công việc của đội kỹ sư: "Cần theo dõi" (để không quên việc đã giao), Kanban, danh sách, chi tiết.
// Người xem không phải admin: chỉ đọc. Admin: giao việc, cập nhật, nghiệm thu / trả lại.

// Quyền của người đang xem (xem permissions.ts): manage = giao / sửa mọi việc (admin, trợ lý),
// review = nghiệm thu / chấm điểm (admin), engineerId = kỹ sư cập nhật việc của mình, propose = đề xuất việc.
export type BoardPerm = { manage: boolean; review: boolean; engineerId: string | null; propose: boolean; demo: boolean };

type Props = { engineers: Engineer[]; tasks: Task[]; updates: TaskUpdate[]; today: string; perm: BoardPerm; editHint: string; lines: string[]; initialLine?: string; initialEngineer?: string; initialTitle?: string };

const BOARD: TaskStatus[] = ["todo", "doing", "blocked", "review", "done"];
type Watch = "overdue" | "review" | "blocked" | "followUp" | "dueSoon" | "stale";
const WATCH: Array<{ id: Watch; icon: string; vi: string; en: string; hint: { vi: string; en: string } }> = [
  { id: "overdue", icon: "⏰", vi: "Quá hạn", en: "Overdue", hint: { vi: "Đã qua hạn mà chưa xong", en: "Past due, not done" } },
  { id: "review", icon: "📥", vi: "Chờ bạn nghiệm thu", en: "Awaiting your review", hint: { vi: "Kỹ sư báo xong, bạn cần kiểm tra", en: "Engineer says done – check it" } },
  { id: "blocked", icon: "⛔", vi: "Bị chặn", en: "Blocked", hint: { vi: "Cần bạn gỡ vướng", en: "Needs you to unblock" } },
  { id: "followUp", icon: "🔔", vi: "Đến hẹn hỏi lại", en: "Follow-up due", hint: { vi: "Ngày hỏi lại đã đến", en: "Follow-up date reached" } },
  { id: "dueSoon", icon: "📅", vi: "Đến hạn 7 ngày tới", en: "Due in 7 days", hint: { vi: "Sắp đến hạn", en: "Coming up" } },
  { id: "stale", icon: "💤", vi: "7 ngày không cập nhật", en: "No update for 7 days", hint: { vi: "Đang làm nhưng im lặng", en: "In progress but silent" } }
];

async function api(method: string, body?: unknown, query = "") {
  const res = await fetch(`/api/smt/tasks${query}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new Error(data.message || "Thất bại.");
  return data;
}

export function TaskBoard({ engineers, tasks, updates, today, perm, editHint, lines, initialLine = "", initialEngineer = "", initialTitle = "" }: Props) {
  const t = useT();
  const router = useRouter();
  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ] = useState("");
  const [eng, setEng] = useState(initialEngineer);
  const [line, setLine] = useState(initialLine);
  const [cat, setCat] = useState("");
  const [watch, setWatch] = useState<Watch | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const newDraft = (): TaskDraft => ({ title: initialTitle, category: "other", priority: "medium", difficulty: 2, assignee_id: perm.manage ? eng || null : perm.engineerId, line, assigned_on: today, due_on: addDays(today, 7), estimate_h: 4 });
  // Mở sẵn form khi đến từ "→ Việc" trong chat (?title=...).
  const [form, setForm] = useState<TaskDraft | null>(() => (initialTitle && (perm.manage || perm.propose) ? newDraft() : null));
  const canAct = (task: Task) => perm.manage || Boolean(perm.engineerId && task.assignee_id === perm.engineerId);

  const person = (id: string | null) => engineers.find((e) => e.id === id);
  const follow = useMemo(() => followUps(tasks, updates, today), [tasks, updates, today]);
  const watchIds = watch ? new Set(follow[watch].map((x) => x.id)) : null;

  const filtered = tasks.filter((x) => {
    if (watchIds && !watchIds.has(x.id)) return false;
    if (eng && x.assignee_id !== eng) return false;
    if (line && x.line !== line) return false;
    if (cat && x.category !== cat) return false;
    if (q && !`${x.code} ${x.title} ${x.ref_code}`.toLowerCase().includes(q.toLowerCase())) return false;
    // Cột "Hoàn thành" mặc định chỉ hiện 14 ngày gần nhất cho gọn.
    if (x.status === "done" && !allDone && !watch && x.done_on && x.done_on < addDays(today, -14)) return false;
    return x.status !== "cancelled" || allDone;
  });
  const open = tasks.find((x) => x.id === openId) ?? null;

  async function save(draft: TaskDraft) {
    if (draft.id) await api("PATCH", draft);
    else await api("POST", draft);
    setForm(null);
    router.refresh();
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Công việc đội kỹ sư", "Engineering team tasks")}</h1>
          <p className="muted text-sm">
            {tasks.filter((x) => OPEN_STATUSES.includes(x.status)).length} {t("việc đang mở", "open tasks")} · {tasks.filter((x) => x.status === "done").length} {t("đã xong", "done")} · {engineers.filter((e) => e.active).length} {t("kỹ sư", "engineers")}
          </p>
        </div>
        {perm.manage || perm.propose ? (
          <button type="button" className="btn-primary" onClick={() => setForm(newDraft())} title={perm.manage ? undefined : t("Việc phát sinh của bạn, chờ quản lý duyệt mới tính điểm", "Your ad-hoc task; counts after approval")}>
            + {perm.manage ? t("Giao việc", "Assign task") : t("Đề xuất việc", "Propose task")}
          </button>
        ) : (
          <p className="muted max-w-sm text-right text-xs">{editHint}</p>
        )}
      </div>

      <section className="card space-y-2">
        <h2 className="text-sm font-semibold">{t("Cần theo dõi hôm nay", "Needs your attention today")}</h2>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {WATCH.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWatch(watch === w.id ? null : w.id)}
              aria-pressed={watch === w.id}
              className={`rounded-xl border p-2 text-left transition hover:border-brand-400 ${watch === w.id ? "!border-brand-500 bg-brand-50 dark:bg-slate-800" : ""}`}
              style={{ borderColor: "var(--border)" }}
              title={t(w.hint.vi, w.hint.en)}
            >
              <span className="block text-xs">
                {w.icon} {t(w.vi, w.en)}
              </span>
              <span className={`text-2xl font-semibold tabular-nums ${follow[w.id].length && (w.id === "overdue" || w.id === "review") ? "text-red-600 dark:text-red-400" : ""}`}>{follow[w.id].length}</span>
            </button>
          ))}
        </div>
        {watch && (
          <p className="muted text-xs">
            {t("Đang lọc theo", "Filtered by")}: {t(WATCH.find((w) => w.id === watch)!.vi, WATCH.find((w) => w.id === watch)!.en)} ·{" "}
            <button type="button" className="font-semibold underline" onClick={() => setWatch(null)}>
              {t("bỏ lọc", "clear")}
            </button>
          </p>
        )}
      </section>

      <div className="card flex flex-wrap items-center gap-2">
        <input className="input w-full sm:w-56" placeholder={t("Tìm mã / tên việc…", "Search code / title…")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Tìm", "Search")} />
        <select className="input w-auto" value={eng} onChange={(e) => setEng(e.target.value)} aria-label={t("Kỹ sư", "Engineer")}>
          <option value="">{t("Tất cả kỹ sư", "All engineers")}</option>
          {engineers.map((e) => (
            <option key={e.id} value={e.id}>
              {e.code} · {e.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={line} onChange={(e) => setLine(e.target.value)} aria-label="Line">
          <option value="">{t("Tất cả line", "All lines")}</option>
          {lines.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t("Loại", "Category")}>
          <option value="">{t("Mọi loại việc", "All categories")}</option>
          {TASK_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {t(c.vi, c.en)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={allDone} onChange={(e) => setAllDone(e.target.checked)} />
          {t("Hiện cả việc cũ / đã huỷ", "Show old / cancelled")}
        </label>
        <div className="ml-auto flex gap-1" role="group" aria-label={t("Kiểu xem", "View")}>
          {(["board", "list"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`chip ${view === v ? "!border-brand-500 font-semibold text-brand-700 dark:text-brand-200" : ""}`}>
              {v === "board" ? "Kanban" : t("Danh sách", "List")}
            </button>
          ))}
        </div>
      </div>

      {view === "board" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="grid min-w-[1000px] grid-cols-5 gap-3">
            {BOARD.map((s) => {
              const col = filtered.filter((x) => x.status === s).sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"));
              return (
                <section key={s} className="space-y-2 rounded-2xl border p-2" style={{ borderColor: "var(--border)" }} aria-label={t(statusOf(s).vi, statusOf(s).en)}>
                  <h2 className="flex items-center justify-between px-1 text-sm font-semibold">
                    {t(statusOf(s).vi, statusOf(s).en)} <span className="muted tabular-nums">{col.length}</span>
                  </h2>
                  <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-0.5">
                    {col.map((x) => (
                      <TaskCard key={x.id} task={x} who={person(x.assignee_id)} today={today} onOpen={() => setOpenId(x.id)} />
                    ))}
                    {!col.length && <p className="muted px-1 text-xs">—</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card -mx-0 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="muted text-left text-xs">
                <th className="py-2">{t("Mã", "Code")}</th>
                <th className="py-2">{t("Công việc", "Task")}</th>
                <th className="py-2">{t("Người làm", "Assignee")}</th>
                <th className="py-2">{t("Trạng thái", "Status")}</th>
                <th className="py-2 text-right">{t("Điểm", "Points")}</th>
                <th className="py-2 text-right">{t("Tiến độ", "Progress")}</th>
                <th className="py-2">{t("Hạn", "Due")}</th>
              </tr>
            </thead>
            <tbody>
              {[...filtered]
                .sort((a, b) => Number(OPEN_STATUSES.includes(b.status)) - Number(OPEN_STATUSES.includes(a.status)) || (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"))
                .map((x) => (
                  <tr key={x.id} className="cursor-pointer border-t hover:bg-brand-50 dark:hover:bg-slate-800" style={{ borderColor: "var(--border)" }} onClick={() => setOpenId(x.id)}>
                    <td className="py-1.5 font-mono text-xs">{x.code}</td>
                    <td className="py-1.5">
                      {categoryOf(x.category).icon} {x.title}
                    </td>
                    <td className="py-1.5">{person(x.assignee_id)?.name ?? "—"}</td>
                    <td className="py-1.5">{t(statusOf(x.status).vi, statusOf(x.status).en)}</td>
                    <td className="py-1.5 text-right tabular-nums">{taskPoints(x).toFixed(1)}</td>
                    <td className="py-1.5 text-right tabular-nums">{x.progress}%</td>
                    <td className="py-1.5">
                      <DueLabel task={x} today={today} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!filtered.length && <p className="muted py-4 text-center text-sm">{t("Không có công việc phù hợp.", "No matching tasks.")}</p>}
        </div>
      )}

      {open && (
        <Drawer onClose={() => setOpenId(null)}>
          <TaskDetail task={open} who={person(open.assignee_id)} updates={updates.filter((u) => u.task_id === open.id)} today={today} perm={perm} canAct={canAct(open)} onEdit={() => setForm({ ...open })} onDone={() => router.refresh()} onDeleted={() => (setOpenId(null), router.refresh())} />
        </Drawer>
      )}
      {form && (
        <Drawer onClose={() => setForm(null)}>
          <TaskForm initial={form} engineers={engineers} lines={lines} proposal={!perm.manage} onCancel={() => setForm(null)} onSave={save} />
        </Drawer>
      )}
    </div>
  );
}

function DueLabel({ task, today }: { task: Task; today: string }) {
  const t = useT();
  if (!task.due_on) return <span className="muted">—</span>;
  if (task.status === "done") {
    const late = task.done_on && task.done_on > task.due_on;
    return <span className={late ? "text-amber-700 dark:text-amber-300" : "muted"}>{late ? `! ${t("trễ", "late")} ${daysBetween(task.due_on, task.done_on!)}d` : `✓ ${dmy(task.done_on)}`}</span>;
  }
  const left = daysBetween(today, task.due_on);
  if (left < 0) return <span className="font-semibold text-red-600 dark:text-red-400">✕ {t("quá", "over")} {-left}d</span>;
  return <span className={left <= 2 ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>{dmy(task.due_on)}</span>;
}

function Initials({ name }: { name?: string }) {
  const parts = (name ?? "?").split(" ");
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold" style={{ borderColor: "var(--border)" }} title={name} aria-hidden>
      {(parts[parts.length - 1]?.[0] ?? "?").toUpperCase()}
    </span>
  );
}

function TaskCard({ task, who, today, onOpen }: { task: Task; who?: Engineer; today: string; onOpen: () => void }) {
  const t = useT();
  const pri = priorityOf(task.priority);
  return (
    <button type="button" onClick={onOpen} className="block w-full rounded-xl border p-2.5 text-left text-sm transition hover:border-brand-400" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <span className="muted flex items-center justify-between gap-2 font-mono text-[11px]">
        <span>
          {categoryOf(task.category).icon} {task.code}
          {task.line && ` · ${task.line}`}
        </span>
        {(task.priority === "urgent" || task.priority === "high") && <span className="rounded border px-1 font-sans font-semibold" style={{ borderColor: "var(--border)" }}>{task.priority === "urgent" ? "‼" : "!"} {t(pri.vi, pri.en)}</span>}
      </span>
      <span className="mt-1 block font-medium leading-snug">
        {task.approved === false && <span className="mr-1 rounded border border-dashed px-1 text-[10px] font-semibold" style={{ borderColor: "var(--viz-1)" }}>{t("Đề xuất", "Proposed")}</span>}
        {task.title}
      </span>
      {task.status !== "done" && task.status !== "todo" && (
        <span className="mt-2 block h-1.5 rounded-full" style={{ background: "var(--viz-1-wash)" }} aria-label={`${task.progress}%`}>
          <span className="block h-1.5 rounded-r-[4px]" style={{ width: `${Math.max(3, task.progress)}%`, background: "var(--viz-1)" }} />
        </span>
      )}
      <span className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5">
          <Initials name={who?.name} />
          <span className="truncate">{who?.name ?? t("Chưa giao", "Unassigned")}</span>
        </span>
        <DueLabel task={task} today={today} />
      </span>
    </button>
  );
}

function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose} role="dialog" aria-modal="true">
      <div className="h-full w-full max-w-xl overflow-y-auto p-5 shadow-2xl" style={{ background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border" style={{ borderColor: "var(--border)" }} aria-label="Đóng">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TaskDetail({ task, who, updates, today, perm, canAct, onEdit, onDone, onDeleted }: { task: Task; who?: Engineer; updates: TaskUpdate[]; today: string; perm: BoardPerm; canAct: boolean; onEdit: () => void; onDone: () => void; onDeleted: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(0);
  const [score, setScore] = useState(4);
  const [progress, setProgress] = useState(task.progress);
  const [error, setError] = useState("");
  const isOpen = OPEN_STATUSES.includes(task.status);

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await api("PATCH", { id: task.id, ...body });
      setNote("");
      setHours(0);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thất bại.");
    } finally {
      setBusy(false);
    }
  }

  // Đổi tiến độ và ghi giờ có thể cùng lúc: gửi 2 lần để không mất số giờ.
  async function saveUpdate() {
    if (progress !== task.progress) await run({ progress, note });
    if (hours) await run({ action: "note", note: progress !== task.progress ? "" : note, hours });
    else if (progress === task.progress) await run({ action: "note", note });
  }

  async function remove() {
    if (!confirm(t(`Xoá ${task.code}?`, `Delete ${task.code}?`))) return;
    setBusy(true);
    try {
      // Trợ lý chưa được cho phép xoá -> gửi yêu cầu cho admin.
      const r = await deleteOrRequest(`/api/smt/tasks?id=${task.id}`, { kind: "task", ids: [task.id], label: `${task.code} ${task.title}`, demo: perm.demo });
      if (r === "deleted") onDeleted();
      else setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thất bại.");
      setBusy(false);
    }
  }

  const facts: Array<[string, React.ReactNode]> = [
    [t("Người làm", "Assignee"), who ? `${who.code} · ${who.name}` : "—"],
    [t("Trạng thái", "Status"), t(statusOf(task.status).vi, statusOf(task.status).en)],
    [t("Loại · Ưu tiên · Độ khó", "Category · Priority · Difficulty"), `${t(categoryOf(task.category).vi, categoryOf(task.category).en)} · ${t(priorityOf(task.priority).vi, priorityOf(task.priority).en)} · ${task.difficulty}/5`],
    [t("Điểm việc", "Task points"), taskPoints(task).toFixed(1)],
    [t("Giao · Bắt đầu · Hạn", "Assigned · Start · Due"), `${dmy(task.assigned_on)} · ${dmy(task.start_on) || "—"} · ${dmy(task.due_on) || "—"}`],
    [t("Hoàn thành", "Done"), task.done_on ? <DueLabel task={task} today={today} /> : "—"],
    [t("Giờ ước tính / thực tế", "Estimate / actual h"), `${task.estimate_h} / ${task.actual_h}`],
    [t("Nghiệm thu · Làm lại", "Review score · Rework"), `${task.quality_score ?? "—"}/5 · ${task.rework_count}`],
    [t("Hỏi lại ngày", "Follow up on"), dmy(task.follow_up_on) || "—"],
    [t("Liên quan", "Related"), task.ref_code || "—"]
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="muted font-mono text-xs">
          {categoryOf(task.category).icon} {task.code} {task.line && `· ${task.line}`}
        </p>
        <h2 className="text-lg font-semibold">{task.title}</h2>
        {task.description && <p className="mt-1 whitespace-pre-line text-sm">{task.description}</p>}
      </div>
      <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-1 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {isOpen && task.status !== "todo" && (
        <div className="h-2 rounded-full" style={{ background: "var(--viz-1-wash)" }} aria-label={`${task.progress}%`}>
          <div className="h-2 rounded-r-[4px]" style={{ width: `${Math.max(2, task.progress)}%`, background: "var(--viz-1)" }} />
        </div>
      )}

      {task.approved === false && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 text-sm" style={{ borderColor: "var(--viz-1)" }}>
          💡 {t("Việc kỹ sư tự đề xuất – chưa tính điểm cho tới khi được duyệt.", "Engineer-proposed task – not scored until approved.")}
          {perm.manage && (
            <button type="button" className="btn-primary ml-auto" disabled={busy} onClick={() => run({ approved: true })}>
              ✓ {t("Duyệt việc", "Approve")}
            </button>
          )}
        </div>
      )}

      {canAct && (
        <section className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap gap-2">
            {task.status === "todo" && (
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => run({ status: "doing" })}>
                ▶ {t("Bắt đầu", "Start")}
              </button>
            )}
            {(task.status === "doing" || task.status === "todo") && (
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => run({ status: "blocked", note })}>
                ⛔ {t("Bị chặn", "Blocked")}
              </button>
            )}
            {task.status === "blocked" && (
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => run({ status: "doing", note })}>
                ▶ {t("Gỡ chặn, làm tiếp", "Unblock")}
              </button>
            )}
            {(task.status === "doing" || task.status === "blocked") && (
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => run({ status: "review", note })}>
                📥 {t("Gửi nghiệm thu", "Submit for review")}
              </button>
            )}
            {!isOpen && perm.manage && (task.status !== "done" || perm.review) && (
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => run({ status: "doing", note: note || t("Mở lại", "Reopened") })}>
                ↺ {t("Mở lại", "Reopen")}
              </button>
            )}
          </div>
          {task.status === "review" && !perm.review && <p className="muted text-sm">📥 {t("Đang chờ quản lý nghiệm thu.", "Waiting for the manager's review.")}</p>}
          {task.status === "review" && perm.review && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg p-2" style={{ background: "var(--viz-1-wash)" }}>
              <span className="text-sm font-semibold">{t("Nghiệm thu", "Review")}:</span>
              <select className="input w-auto" value={score} onChange={(e) => setScore(Number(e.target.value))} aria-label={t("Điểm", "Score")}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}/5
                  </option>
                ))}
              </select>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => run({ status: "done", quality_score: score, note })}>
                ✓ {t("Đạt – đóng việc", "Accept & close")}
              </button>
              <button type="button" className="btn-ghost" disabled={busy || !note.trim()} onClick={() => run({ action: "return", note })} title={t("Nhập lý do trả lại ở ô ghi chú", "Write the reason in the note box")}>
                ↩ {t("Trả lại làm lại", "Return for rework")}
              </button>
            </div>
          )}
          {isOpen && task.status !== "review" && (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">
                {t("Tiến độ", "Progress")}: {progress}%
              </span>
              <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full" />
            </label>
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
            <textarea className="input min-h-[60px]" placeholder={t("Ghi chú cập nhật / lý do trả lại…", "Update note / rework reason…")} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            <input type="number" min={0} step={0.5} className="input" value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label={t("Giờ đã làm", "Hours spent")} title={t("Giờ đã làm thêm", "Hours spent")} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={busy || (!note.trim() && !hours && progress === task.progress)} onClick={saveUpdate}>
              {t("Lưu cập nhật", "Save update")}
            </button>
            {perm.manage && (
              <button type="button" className="btn-ghost" onClick={onEdit}>
                ✎ {t("Sửa", "Edit")}
              </button>
            )}
            {(perm.manage || (task.approved === false && canAct)) && (
              <button type="button" className="btn-ghost ml-auto text-red-600" onClick={remove} disabled={busy} title={perm.manage ? t("Xoá", "Delete") : t("Huỷ đề xuất", "Withdraw proposal")}>
                🗑
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("Nhật ký", "Timeline")}</h3>
        <ol className="space-y-2 border-l pl-4 text-sm" style={{ borderColor: "var(--border)" }}>
          {[...updates]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((u) => (
              <li key={u.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: u.kind === "rework" ? "var(--status-critical)" : "var(--viz-1)", background: "var(--surface)" }} aria-hidden />
                <span className="muted text-xs">
                  {dmy(u.at)} · {u.author || "—"}
                  {u.status && ` · ${t(statusOf(u.status).vi, statusOf(u.status).en)}`}
                  {u.progress !== null && ` · ${u.progress}%`}
                  {u.hours > 0 && ` · ${u.hours}h`}
                </span>
                <span className={`block ${u.kind === "rework" ? "font-medium text-red-700 dark:text-red-300" : ""}`}>{u.kind === "rework" ? `↩ ${u.note}` : u.note || "—"}</span>
              </li>
            ))}
          {!updates.length && <li className="muted">—</li>}
        </ol>
      </section>
    </div>
  );
}
