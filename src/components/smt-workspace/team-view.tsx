"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RankBars, StatusBadge, useT } from "@/components/smt/smt-charts";
import { MultiLineChart } from "@/components/smt-workspace/charts";
import { MIN_DONE, SCORE_WEIGHTS, type EngineerScore } from "@/lib/smt/team-metrics";
import { ENGINEER_LEVELS, ENGINEER_ROLES, categoryOf, type Engineer } from "@/lib/smt/team-types";
import { ddmm, dmy, num, pct } from "@/lib/smt/types";

type Props = {
  scores: EngineerScore[];
  engineers: Engineer[];
  periods: Array<{ id: string; label: string }>;
  period: string;
  from: string;
  to: string;
  flow: Array<{ week: string; assigned: number; done: number; late: number }>;
  canEdit: boolean;
};

export function TeamView({ scores, engineers, periods, period, from, to, flow, canEdit }: Props) {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);
  const role = (id: string) => ENGINEER_ROLES.find((r) => r.id === id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Đánh giá đội kỹ sư", "Engineering team scorecard")}</h1>
          <p className="muted text-sm">
            {dmy(from)} → {dmy(to)} · {t("tính từ công việc đã giao / nghiệm thu", "computed from assigned / reviewed tasks")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("Kỳ đánh giá", "Period")}>
          {periods.map((p) => (
            <Link key={p.id} href={`/smt/doi-ngu?q=${p.id}`} aria-pressed={period === p.id} className={`chip ${period === p.id ? "!border-brand-500 font-semibold text-brand-700 dark:text-brand-200" : ""}`} scroll={false}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">{t("Công thức (minh bạch để công bằng)", "Formula (transparent, so it's fair)")}</h2>
        <p>
          <b>{t("Điểm tổng", "Score")}</b> = {pct(SCORE_WEIGHTS.onTime, 0)} {t("Đúng hạn", "On-time")} + {pct(SCORE_WEIGHTS.quality, 0)} {t("Chất lượng", "Quality")} + {pct(SCORE_WEIGHTS.firstPass, 0)} {t("Làm đúng lần đầu", "First pass")} + {pct(SCORE_WEIGHTS.output, 0)} {t("Khối lượng", "Output")}
        </p>
        <ul className="muted list-disc space-y-0.5 pl-5">
          <li>{t("Điểm việc = Độ khó (1-5) × hệ số ưu tiên (0.8 / 1 / 1.3 / 1.6): người nhận việc khó không bị thiệt so với người làm nhiều việc dễ.", "Task points = difficulty (1-5) × priority weight (0.8 / 1 / 1.3 / 1.6): taking hard tasks is not penalised vs. many easy ones.")}</li>
          <li>{t("Đúng hạn tính cả việc đang mở đã quá hạn: giữ việc không đóng không né được điểm trễ.", "On-time also counts open overdue tasks: keeping a task open does not dodge lateness.")}</li>
          <li>{t("Khối lượng chia theo giờ cam kết/tuần rồi so với trung vị của nhóm (tối đa 100%): người làm bán thời gian cho dự án được quy đổi.", "Output is divided by committed hours/week and compared to the team median (capped at 100%).")}</li>
          <li>{t(`Dưới ${MIN_DONE} việc xong trong kỳ: đánh dấu "chưa đủ dữ liệu", không dùng để xếp hạng.`, `Fewer than ${MIN_DONE} done tasks: flagged "not enough data", not ranked.`)}</li>
          <li>{t("Điểm số là dữ liệu để trao đổi 1-1, không thay thế nhận xét của quản lý (hỗ trợ đồng nghiệp, đào tạo, sáng kiến…).", "Scores feed 1-on-1 conversations; they don't replace manager judgement (helping peers, training, initiatives…).")}</li>
        </ul>
      </section>

      <section className="card overflow-hidden">
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="muted text-left text-xs">
                <th className="py-2">#</th>
                <th className="py-2">{t("Kỹ sư", "Engineer")}</th>
                <th className="py-2 text-right">{t("Việc xong", "Done")}</th>
                <th className="py-2 text-right">{t("Điểm việc", "Points")}</th>
                <th className="py-2 text-right">{t("Đúng hạn", "On-time")}</th>
                <th className="py-2 text-right">{t("Nghiệm thu TB", "Avg review")}</th>
                <th className="py-2 text-right">{t("Đúng lần đầu", "First pass")}</th>
                <th className="py-2 text-right">{t("Đang mở / quá hạn", "Open / overdue")}</th>
                <th className="py-2">{t("Điểm tổng", "Score")}</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={s.engineer.id} className="cursor-pointer border-t hover:bg-brand-50 dark:hover:bg-slate-800" style={{ borderColor: "var(--border)" }} onClick={() => setOpenId(openId === s.engineer.id ? null : s.engineer.id)} aria-expanded={openId === s.engineer.id}>
                  <td className="py-2 tabular-nums">{s.enough ? i + 1 : "—"}</td>
                  <td className="py-2">
                    <b>{s.engineer.name}</b>
                    <span className="muted block text-xs">
                      {s.engineer.code} · {t(role(s.engineer.role)?.vi ?? s.engineer.role, role(s.engineer.role)?.en ?? s.engineer.role)} · {s.engineer.level}
                      {s.engineer.capacity_h !== 40 && ` · ${s.engineer.capacity_h}h/${t("tuần", "wk")}`}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{s.done}</td>
                  <td className="py-2 text-right tabular-nums">{num(s.points, 1)}</td>
                  <td className="py-2 text-right tabular-nums">{s.done || s.overdue ? pct(s.onTime, 0) : "—"}</td>
                  <td className="py-2 text-right tabular-nums">{s.qualityAvg ? `${num(s.qualityAvg, 2)}/5` : "—"}</td>
                  <td className="py-2 text-right tabular-nums">{s.done ? pct(s.firstPass, 0) : "—"}</td>
                  <td className="py-2 text-right tabular-nums">
                    {s.open} / <span className={s.overdue ? "font-semibold text-red-600 dark:text-red-400" : ""}>{s.overdue}</span>
                  </td>
                  <td className="py-2">
                    {s.enough ? (
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-24 rounded-full" style={{ background: "var(--viz-1-wash)" }}>
                          <span className="block h-2 rounded-r-[4px]" style={{ width: `${s.score}%`, background: "var(--viz-1)" }} />
                        </span>
                        <b className="tabular-nums">{s.score}</b>
                      </span>
                    ) : (
                      <StatusBadge status="warning">{t("Chưa đủ dữ liệu", "Not enough data")}</StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {openId && <EngineerDetail score={scores.find((s) => s.engineer.id === openId)!} />}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <RankBars title={t("Khối lượng đang mở (điểm việc)", "Open workload (task points)")} items={[...scores].sort((a, b) => b.openPoints - a.openPoints).map((s) => ({ label: s.engineer.name, value: s.openPoints, note: s.overdue ? `· ${s.overdue} ${t("quá hạn", "overdue")}` : undefined }))} format={(v) => num(v, 1)} highlight={(label) => (scores.find((s) => s.engineer.name === label)?.overdue ?? 0) > 1} />
          <p className="muted mt-2 text-xs">{t("Dùng để cân tải trước khi giao việc mới; thanh đỏ = đang có từ 2 việc quá hạn.", "Use it to balance load before assigning; red bar = 2+ overdue tasks.")}</p>
        </section>
        {flow.length > 1 && (
          <section className="card">
            <MultiLineChart
              title={t("Nhịp giao việc & hoàn thành theo tuần", "Weekly tasks assigned vs done")}
              series={[
                { id: "assigned", label: t("Giao", "Assigned"), color: "var(--viz-1)" },
                { id: "done", label: t("Xong", "Done"), color: "var(--viz-2)" }
              ]}
              data={flow.map((w) => ({ x: w.week, label: ddmm(w.week), values: { assigned: w.assigned, done: w.done } }))}
              format={(v) => num(v, 0)}
              xLabel={t("Tuần từ", "Week of")}
              percent={false}
            />
          </section>
        )}
      </div>

      {canEdit && <EngineerManager engineers={engineers} />}
    </div>
  );
}

function EngineerDetail({ score: s }: { score: EngineerScore }) {
  const t = useT();
  return (
    <div className="mt-3 grid gap-4 rounded-xl border p-3 text-sm md:grid-cols-2" style={{ borderColor: "var(--border)" }}>
      <div className="space-y-1">
        <p className="font-semibold">{s.engineer.name}</p>
        <p>
          {t("Trễ hạn", "Late")}: <b>{s.late}</b> {t("việc", "tasks")}
          {s.avgDelay > 0 && ` · ${t("trễ TB", "avg delay")} ${s.avgDelay.toFixed(1)} ${t("ngày", "days")}`}
        </p>
        <p>
          {t("Ước tính / thực tế", "Estimate / actual")}: <b>{s.estimateRatio ? s.estimateRatio.toFixed(2) : "—"}</b> <span className="muted">({t("< 1 = hay ước tính thiếu giờ", "< 1 = tends to under-estimate")})</span>
        </p>
        <p>
          {t("Bị chặn", "Blocked")}: <b>{s.blocked}</b>
        </p>
        <Link href={`/smt/cong-viec?eng=${s.engineer.id}`} className="inline-block font-semibold text-brand-600 dark:text-brand-300">
          {t("Xem công việc →", "View tasks →")}
        </Link>
      </div>
      <RankBars title={t("Điểm việc theo loại", "Points by category")} items={s.byCategory.map((c) => ({ label: `${categoryOf(c.category).icon} ${t(categoryOf(c.category).vi, categoryOf(c.category).en)}`, value: c.points }))} format={(v) => num(v, 1)} />
    </div>
  );
}

function EngineerManager({ engineers }: { engineers: Engineer[] }) {
  const t = useT();
  const router = useRouter();
  const blank: Partial<Engineer> = { name: "", role: "process", level: "mid", lines: "", capacity_h: 40, active: true };
  const [draft, setDraft] = useState<Partial<Engineer> | null>(null);
  const [error, setError] = useState("");

  async function save() {
    if (!draft) return;
    setError("");
    const res = await fetch("/api/smt/engineers", { method: draft.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) return setError(data.message || "Thất bại.");
    setDraft(null);
    router.refresh();
  }

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t("Danh sách kỹ sư", "Engineers")}</h2>
        <button type="button" className="btn-ghost" onClick={() => setDraft(blank)}>
          + {t("Thêm kỹ sư", "Add engineer")}
        </button>
      </div>
      <ul className="grid gap-2 text-sm md:grid-cols-2">
        {engineers.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
            <span className={e.active ? "" : "muted line-through"}>
              <b>{e.code}</b> · {e.name} <span className="muted text-xs">({e.lines || t("mọi line", "all lines")})</span>
            </span>
            <button type="button" className="text-xs font-semibold text-brand-600 dark:text-brand-300" onClick={() => setDraft(e)}>
              ✎ {t("Sửa", "Edit")}
            </button>
          </li>
        ))}
      </ul>
      {draft && (
        <div className="grid gap-2 rounded-xl border p-3 text-sm sm:grid-cols-3" style={{ borderColor: "var(--border)" }}>
          <input className="input sm:col-span-2" placeholder={t("Họ tên", "Full name")} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="input" placeholder={t("Mã (tự sinh)", "Code (auto)")} value={draft.code ?? ""} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          <select className="input" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Engineer["role"] })}>
            {ENGINEER_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {t(r.vi, r.en)}
              </option>
            ))}
          </select>
          <select className="input" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value as Engineer["level"] })}>
            {ENGINEER_LEVELS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.vi}
              </option>
            ))}
          </select>
          <input className="input" type="number" min={0} max={80} value={draft.capacity_h ?? 40} onChange={(e) => setDraft({ ...draft, capacity_h: Number(e.target.value) })} title={t("Giờ/tuần cho công việc", "Hours/week for tasks")} />
          <input className="input sm:col-span-2" placeholder={t("Line phụ trách: L01,L02", "Lines: L01,L02")} value={draft.lines ?? ""} onChange={(e) => setDraft({ ...draft, lines: e.target.value })} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            {t("Đang làm việc", "Active")}
          </label>
          {error && <p className="text-red-600 sm:col-span-3">{error}</p>}
          <div className="flex gap-2 sm:col-span-3">
            <button type="button" className="btn-primary" onClick={save}>
              {t("Lưu", "Save")}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
              {t("Huỷ", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
