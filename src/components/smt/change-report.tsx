"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { StatusBadge, useT, type Status } from "@/components/smt/smt-charts";
import { Section } from "@/components/smt/report-parts";
import { buildChangeMatrix } from "@/lib/smt/metrics";
import { dmy } from "@/lib/smt/types";
import type { ChangeLog } from "@/lib/smt/types";

const RISK: Record<ChangeLog["risk"], { status: Status; vi: string; en: string }> = {
  low: { status: "good", vi: "Rủi ro thấp", en: "Low risk" },
  medium: { status: "warning", vi: "Rủi ro TB", en: "Medium risk" },
  high: { status: "critical", vi: "Rủi ro cao", en: "High risk" }
};
const RESULT: Record<ChangeLog["result"], { status: Status; vi: string; en: string }> = {
  pending: { status: "warning", vi: "Chờ xác nhận", en: "Pending" },
  ok: { status: "good", vi: "Xác nhận OK", en: "Validated OK" },
  ng: { status: "critical", vi: "Xác nhận NG", en: "Validation NG" }
};
const STATUS_TEXT: Record<ChangeLog["status"], { vi: string; en: string }> = {
  planned: { vi: "Kế hoạch", en: "Planned" },
  implemented: { vi: "Đã áp dụng", en: "Implemented" },
  verified: { vi: "Đã xác nhận", en: "Verified" },
  rejected: { vi: "Từ chối", en: "Rejected" }
};

export function ChangeReport({ changes, from, to, line }: { changes: ChangeLog[]; from: string; to: string; line: string }) {
  const t = useT();
  const { lang } = useLanguage();
  const data = useMemo(() => buildChangeMatrix(changes, { from, to, line: line || undefined }), [changes, from, to, line]);
  const L = (x: { vi: string; en: string }) => (lang === "en" ? x.en : x.vi);
  const max = Math.max(1, ...data.matrix.map((m) => m.total));
  const cols: Array<{ key: "planned" | "implemented" | "verified" | "rejected" | "high" | "pendingValidation" | "ng"; label: string }> = [
    { key: "planned", label: t("Kế hoạch", "Planned") },
    { key: "implemented", label: t("Đã áp dụng", "Implemented") },
    { key: "verified", label: t("Đã xác nhận", "Verified") },
    { key: "rejected", label: t("Từ chối", "Rejected") },
    { key: "high", label: t("Rủi ro cao", "High risk") },
    { key: "pendingValidation", label: t("Chờ xác nhận", "Pending validation") },
    { key: "ng", label: "NG" }
  ];

  return (
    <div className="space-y-4">
      <Section title={t("Ma trận 4M1E", "4M1E matrix")} hint={t("Màu nền đậm = nhiều thay đổi. Hàng có rủi ro cao / chờ xác nhận là việc cần theo dõi.", "Darker cell = more changes. High-risk and pending rows need follow-up.")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-[2px] text-sm">
            <thead>
              <tr className="text-xs">
                <th className="px-2 py-1 text-left">{t("Hạng mục", "Category")}</th>
                <th className="px-2 py-1 text-right">{t("Tổng", "Total")}</th>
                {cols.map((c) => (
                  <th key={c.key} className="px-2 py-1 text-right">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((m) => (
                <tr key={m.id}>
                  <th className="whitespace-nowrap rounded-md px-2 py-2 text-left font-semibold">
                    {m.short} <span className="muted font-normal">· {L(m)}</span>
                  </th>
                  <td className="rounded-md px-2 py-2 text-right font-bold tabular-nums" style={{ background: `color-mix(in srgb, var(--viz-1) ${Math.round((m.total / max) * 45)}%, transparent)` }}>
                    {m.total}
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className="rounded-md px-2 py-2 text-right tabular-nums" style={{ background: m[c.key] ? `color-mix(in srgb, var(--viz-1) ${Math.round((m[c.key] / max) * 35) + 6}%, transparent)` : undefined }}>
                      {m[c.key] || <span className="muted">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t(`Danh sách thay đổi (${data.rows.length})`, `Change list (${data.rows.length})`)}>
        {data.rows.length ? (
          <ol className="space-y-3">
            {data.rows.map((c) => (
              <li key={c.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)", breakInside: "avoid" }}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="chip font-mono">{c.code || "—"}</span>
                  <span className="chip font-semibold">{c.category.charAt(0).toUpperCase() + c.category.slice(1)}</span>
                  <span className="muted tabular-nums">{dmy(c.change_date)}</span>
                  {(c.line || c.model) && <span className="muted">· {[c.line, c.model].filter(Boolean).join(" / ")}</span>}
                  <span className="ml-auto flex flex-wrap gap-2">
                    <StatusBadge status={RISK[c.risk].status}>{L(RISK[c.risk])}</StatusBadge>
                    <StatusBadge status={RESULT[c.result].status}>{L(RESULT[c.result])}</StatusBadge>
                    <span className="chip">{L(STATUS_TEXT[c.status])}</span>
                  </span>
                </div>
                <p className="mt-2 font-semibold">{c.item}</p>
                {(c.before_state || c.after_state) && (
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
                      <span className="muted block text-xs">{t("Trước", "Before")}</span>
                      {c.before_state || "—"}
                    </div>
                    <span className="muted hidden text-center sm:block" aria-hidden>
                      →
                    </span>
                    <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
                      <span className="muted block text-xs">{t("Sau", "After")}</span>
                      {c.after_state || "—"}
                    </div>
                  </div>
                )}
                <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  {c.reason && (
                    <div>
                      <dt className="muted inline">{t("Lý do", "Reason")}: </dt>
                      <dd className="inline">{c.reason}</dd>
                    </div>
                  )}
                  {c.validation && (
                    <div>
                      <dt className="muted inline">{t("Xác nhận", "Validation")}: </dt>
                      <dd className="inline">{c.validation}</dd>
                    </div>
                  )}
                  {(c.owner || c.approved_by) && (
                    <div>
                      <dt className="muted inline">{t("Phụ trách / duyệt", "Owner / approver")}: </dt>
                      <dd className="inline">{[c.owner, c.approved_by].filter(Boolean).join(" / ")}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted text-sm">{t("Chưa có thay đổi nào trong kỳ.", "No changes in this period.")}</p>
        )}
      </Section>
    </div>
  );
}
