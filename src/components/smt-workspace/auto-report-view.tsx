"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/smt/smt-charts";
import type { AutoReport } from "@/lib/smt/auto-reports";
import { num, pct } from "@/lib/smt/types";

const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

export function AutoReportList({ reports, selected, canRun, schedule }: { reports: Array<Pick<AutoReport, "id" | "kind" | "slot" | "period_from" | "period_to">>; selected?: string; canRun: boolean; schedule: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(hours: number) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/smt/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours }) });
    const d = (await res.json().catch(() => ({}))) as { item?: { id: string }; message?: string };
    setBusy(false);
    if (!res.ok) return setError(d.message || "Thất bại.");
    router.push(`/smt/bao-cao-tu-dong?id=${d.item?.id ?? ""}`);
    router.refresh();
  }

  return (
    <aside className="card space-y-2 p-3 text-sm">
      <p className="muted text-xs">
        {t("Lịch", "Schedule")}: {schedule}
        {canRun && (
          <>
            {" "}
            ·{" "}
            <Link href="/smt/quan-tri#lich" className="underline">
              {t("đổi", "change")}
            </Link>
          </>
        )}
      </p>
      {canRun && (
        <div className="flex flex-wrap gap-1">
          <button type="button" className="chip" disabled={busy} onClick={() => run(24)}>
            + {t("24 giờ qua", "Last 24h")}
          </button>
          <button type="button" className="chip" disabled={busy} onClick={() => run(24 * 7)}>
            + {t("7 ngày qua", "Last 7 days")}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <ul className="max-h-[65vh] space-y-1 overflow-y-auto">
        {reports.map((r) => (
          <li key={r.id}>
            <Link href={`/smt/bao-cao-tu-dong?id=${r.id}`} aria-current={selected === r.id ? "page" : undefined} className={`block rounded-lg px-2 py-1.5 ${selected === r.id ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}>
              <b>{r.kind === "weekly" ? t("Tuần", "Week") : t("Ngày", "Day")}</b> · {when(r.period_to)}
              {r.slot.startsWith("manual") && <span className="ml-1 text-[10px]">({t("tạo tay", "manual")})</span>}
            </Link>
          </li>
        ))}
        {!reports.length && <li className="muted">{t("Chưa có báo cáo. Báo cáo được tạo tự động theo lịch khi có người mở /smt.", "No reports yet. They are created on schedule when someone opens /smt.")}</li>}
      </ul>
    </aside>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function AutoReportDetail({ report }: { report: AutoReport }) {
  const t = useT();
  const p = report.payload;
  const k = p.tasks;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          {report.kind === "weekly" ? t("Báo cáo tuần", "Weekly report") : t("Báo cáo ngày", "Daily report")}
        </h1>
        <p className="muted text-sm">
          {when(report.period_from)} → {when(report.period_to)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          [t("Việc mới giao", "Assigned"), k.assigned],
          [t("Nghiệm thu xong", "Accepted"), k.done.length],
          [t("Gửi nghiệm thu", "Submitted"), k.submitted],
          [t("Bị trả lại", "Returned"), k.returned.length],
          [t("Đang quá hạn", "Overdue now"), k.overdue.length],
          [t("Chờ duyệt / nghiệm thu", "Pending approval/review"), k.proposals + k.awaitingReview]
        ].map(([label, v]) => (
          <div key={String(label)} className="card">
            <p className="muted text-xs">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      {report.ai_summary && (
        <Block title={t("Tóm tắt thảo luận (AI)", "Discussion summary (AI)")}>
          <p className="whitespace-pre-wrap text-sm">{report.ai_summary}</p>
          <p className="muted text-xs">{t("Do AI tổng hợp từ tin nhắn trong kỳ – kiểm tra lại trước khi dùng để ra quyết định.", "AI-generated from messages in this period – verify before acting.")}</p>
        </Block>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Block title={t("Việc quá hạn", "Overdue tasks")}>
          <ul className="space-y-1 text-sm">
            {k.overdue.slice(0, 15).map((x) => (
              <li key={x.code}>
                <b className="font-mono">{x.code}</b> {x.title} <span className="muted">· {x.who} · {t("hạn", "due")} {x.due.split("-").reverse().join("/")}</span>
              </li>
            ))}
            {!k.overdue.length && <li className="muted">{t("Không có. 👍", "None. 👍")}</li>}
          </ul>
        </Block>
        <Block title={t("Không cập nhật trong kỳ", "No updates this period")}>
          <p className="muted text-xs">{t("Có việc “Đang làm” nhưng không ghi tiến độ / ghi chú nào.", "Has in-progress tasks but logged nothing.")}</p>
          <ul className="space-y-1 text-sm">
            {k.silent.map((x) => (
              <li key={x.name}>
                {x.name} <span className="muted">· {x.open} {t("việc đang mở", "open tasks")}</span>
              </li>
            ))}
            {!k.silent.length && <li className="muted">{t("Mọi người đều đã cập nhật.", "Everyone updated.")}</li>}
          </ul>
        </Block>
        <Block title={t("Nghiệm thu / trả lại", "Accepted / returned")}>
          <ul className="space-y-1 text-sm">
            {k.done.map((x) => (
              <li key={x.code}>
                ✓ <b className="font-mono">{x.code}</b> {x.title} <span className="muted">· {x.who}</span> {x.late && <span className="text-amber-700 dark:text-amber-300">· {t("trễ hạn", "late")}</span>}
              </li>
            ))}
            {k.returned.map((x, i) => (
              <li key={`${x.code}-${i}`}>
                ↩ <b className="font-mono">{x.code}</b> {x.title} <span className="muted">· {x.who} · {x.note}</span>
              </li>
            ))}
            {!k.done.length && !k.returned.length && <li className="muted">—</li>}
          </ul>
        </Block>
        <Block title={t("Theo từng kỹ sư", "By engineer")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="muted text-left text-xs">
                <th className="py-1">{t("Kỹ sư", "Engineer")}</th>
                <th className="py-1 text-right">{t("Cập nhật", "Updates")}</th>
                <th className="py-1 text-right">{t("Xong", "Done")}</th>
                <th className="py-1 text-right">{t("Đang mở", "Open")}</th>
                <th className="py-1 text-right">{t("Quá hạn", "Overdue")}</th>
              </tr>
            </thead>
            <tbody>
              {k.perEngineer.map((e) => (
                <tr key={e.name} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-1">{e.name}</td>
                  <td className="py-1 text-right tabular-nums">{e.updates}</td>
                  <td className="py-1 text-right tabular-nums">{e.done}</td>
                  <td className="py-1 text-right tabular-nums">{e.open}</td>
                  <td className={`py-1 text-right tabular-nums ${e.overdue ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>{e.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
        <Block title={t("Thảo luận", "Discussion")}>
          <p className="text-sm">
            {num(p.chat.messages)} {t("tin nhắn", "messages")} · {p.chat.issuesOpened} {t("vấn đề mới", "new issues")} · {p.chat.issuesResolved} {t("đã xử lý", "resolved")}
          </p>
          <p className="muted text-xs">{p.chat.byChannel.map((c) => `${c.name}: ${c.count}`).join(" · ") || "—"}</p>
          <h3 className="pt-1 text-sm font-semibold">{t("Vấn đề còn mở", "Still-open issues")}</h3>
          <ul className="space-y-1 text-sm">
            {p.chat.openIssues.map((m, i) => (
              <li key={i}>
                ⚠ <span className="muted">#{m.channel} · {m.who}:</span> {m.body}
              </li>
            ))}
            {!p.chat.openIssues.length && <li className="muted">—</li>}
          </ul>
        </Block>
        {p.production && (
          <Block title={t("Sản xuất", "Production")}>
            <p className="text-sm">
              {num(p.production.boards)} board · OEE {pct(p.production.oee)} · FPY {pct(p.production.fpy, 2)} · {t("lỗi nhiều nhất", "top defects")}: {p.production.topDefects.map((d) => `${d.code} (${d.qty})`).join(", ") || "—"}
            </p>
            {p.production.missing.length > 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                ! {t("Chưa nhập nhật ký sản xuất ngày cuối kỳ", "No production log for the last day")}: {p.production.missing.join(", ")}
              </p>
            )}
            <table className="w-full text-sm">
              <tbody>
                {p.production.lines.filter((l) => l.boards).map((l) => (
                  <tr key={l.line} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-1">{l.line}</td>
                    <td className="py-1 text-right tabular-nums">{num(l.boards)}</td>
                    <td className="py-1 text-right tabular-nums">OEE {pct(l.oee)}</td>
                    <td className="py-1 text-right tabular-nums">FPY {pct(l.fpy, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>
        )}
      </div>
    </div>
  );
}
