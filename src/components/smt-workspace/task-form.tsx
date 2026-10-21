"use client";

import { useState } from "react";
import { useT } from "@/components/smt/smt-charts";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, type Engineer, type Task } from "@/lib/smt/team-types";

// Form giao việc / sửa việc. Độ khó + ưu tiên quyết định "điểm việc" khi chấm điểm kỹ sư.

export type TaskDraft = Partial<Task>;

const DIFFICULTY_HINT: Record<number, { vi: string; en: string }> = {
  1: { vi: "Việc lặp lại, có hướng dẫn sẵn", en: "Routine, documented" },
  2: { vi: "Việc quen, cần chút phân tích", en: "Familiar, some analysis" },
  3: { vi: "Cần phân tích dữ liệu / thử nghiệm", en: "Needs data analysis / trials" },
  4: { vi: "Nhiều bộ phận, rủi ro cao", en: "Cross-team, high risk" },
  5: { vi: "Mới hoàn toàn / khiếu nại khách hàng lớn", en: "Brand new / major complaint" }
};

// proposal = kỹ sư tự đề xuất việc: ẩn người làm / ưu tiên / độ khó (quản lý quyết khi duyệt).
export function TaskForm({ initial, engineers, lines, proposal = false, onCancel, onSave }: { initial: TaskDraft; engineers: Engineer[]; lines: string[]; proposal?: boolean; onCancel: () => void; onSave: (draft: TaskDraft) => Promise<void> }) {
  const t = useT();
  const [d, setD] = useState<TaskDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(initial.id);
  const set = <K extends keyof Task>(k: K, v: Task[K] | null | undefined) => setD((x) => ({ ...x, [k]: v }));
  const field = "space-y-1 text-sm";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Lưu thất bại.", "Save failed."));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-lg font-semibold">{editing ? `${t("Sửa", "Edit")} ${initial.code}` : proposal ? t("Đề xuất việc phát sinh", "Propose a task") : t("Giao việc mới", "New task")}</h2>
      {proposal && <p className="muted text-sm">{t("Việc sẽ giao cho bạn, chờ quản lý / trợ lý duyệt (chốt độ khó, ưu tiên) rồi mới tính điểm.", "Assigned to you; counts after a manager approves it.")}</p>}
      <label className={`${field} block`}>
        <span className="font-medium">{t("Tên công việc", "Title")} *</span>
        <input className="input" value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} required maxLength={200} />
      </label>
      <label className={`${field} block`}>
        <span className="font-medium">{t("Mô tả / tiêu chí hoàn thành", "Description / definition of done")}</span>
        <textarea className="input min-h-[80px]" value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={4000} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {!proposal && (<label className={field}>
          <span className="font-medium">{t("Giao cho", "Assignee")}</span>
          <select className="input" value={d.assignee_id ?? ""} onChange={(e) => set("assignee_id", e.target.value || null)}>
            <option value="">—</option>
            {engineers.filter((x) => x.active || x.id === d.assignee_id).map((x) => (
              <option key={x.id} value={x.id}>
                {x.code} · {x.name}
              </option>
            ))}
          </select>
        </label>)}
        <label className={field}>
          <span className="font-medium">Line</span>
          <select className="input" value={d.line ?? ""} onChange={(e) => set("line", e.target.value)}>
            <option value="">{t("Chung", "General")}</option>
            {lines.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          <span className="font-medium">{t("Loại việc", "Category")}</span>
          <select className="input" value={d.category ?? "other"} onChange={(e) => set("category", e.target.value as Task["category"])}>
            {TASK_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {t(c.vi, c.en)}
              </option>
            ))}
          </select>
        </label>
        {!proposal && (<>
        <label className={field}>
          <span className="font-medium">{t("Ưu tiên", "Priority")}</span>
          <select className="input" value={d.priority ?? "medium"} onChange={(e) => set("priority", e.target.value as Task["priority"])}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {t(p.vi, p.en)} (×{p.weight})
              </option>
            ))}
          </select>
        </label>
        <label className={`${field} sm:col-span-2`}>
          <span className="font-medium">
            {t("Độ khó", "Difficulty")}: {d.difficulty ?? 2} – <span className="muted font-normal">{t(DIFFICULTY_HINT[d.difficulty ?? 2].vi, DIFFICULTY_HINT[d.difficulty ?? 2].en)}</span>
          </span>
          <input type="range" min={1} max={5} step={1} value={d.difficulty ?? 2} onChange={(e) => set("difficulty", Number(e.target.value))} className="w-full" />
        </label>
        <label className={field}>
          <span className="font-medium">{t("Ngày giao", "Assigned on")}</span>
          <input type="date" className="input" value={d.assigned_on ?? ""} onChange={(e) => set("assigned_on", e.target.value)} />
        </label>
        </>)}
        <label className={field}>
          <span className="font-medium">{t("Hạn hoàn thành", "Due date")}</span>
          <input type="date" className="input" value={d.due_on ?? ""} onChange={(e) => set("due_on", e.target.value || null)} />
        </label>
        <label className={field}>
          <span className="font-medium">{t("Ước tính (giờ)", "Estimate (h)")}</span>
          <input type="number" min={0} step={0.5} className="input" value={d.estimate_h ?? 0} onChange={(e) => set("estimate_h", Number(e.target.value))} />
        </label>
        {!proposal && (
          <label className={field}>
            <span className="font-medium">{t("Ngày hỏi lại tiến độ", "Follow-up date")}</span>
            <input type="date" className="input" value={d.follow_up_on ?? ""} onChange={(e) => set("follow_up_on", e.target.value || null)} />
          </label>
        )}
        <label className={field}>
          <span className="font-medium">{t("Mã liên quan (8D / 4M / WO)", "Related ref (8D / 4M / WO)")}</span>
          <input className="input" value={d.ref_code ?? ""} onChange={(e) => set("ref_code", e.target.value)} maxLength={40} />
        </label>
        {editing && (
          <>
            <label className={field}>
              <span className="font-medium">{t("Trạng thái", "Status")}</span>
              <select className="input" value={d.status ?? "todo"} onChange={(e) => set("status", e.target.value as Task["status"])}>
                {TASK_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(s.vi, s.en)}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              <span className="font-medium">{t("Giờ thực tế", "Actual hours")}</span>
              <input type="number" min={0} step={0.5} className="input" value={d.actual_h ?? 0} onChange={(e) => set("actual_h", Number(e.target.value))} />
            </label>
            <label className={field}>
              <span className="font-medium">{t("Điểm nghiệm thu (1-5)", "Review score (1-5)")}</span>
              <select className="input" value={d.quality_score ?? ""} onChange={(e) => set("quality_score", e.target.value ? Number(e.target.value) : null)}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className={field}>
              <span className="font-medium">{t("Ngày hoàn thành", "Done on")}</span>
              <input type="date" className="input" value={d.done_on ?? ""} onChange={(e) => set("done_on", e.target.value || null)} />
            </label>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          {t("Huỷ", "Cancel")}
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? t("Đang lưu…", "Saving…") : t("Lưu", "Save")}
        </button>
      </div>
    </form>
  );
}
