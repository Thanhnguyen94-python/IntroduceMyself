"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { useT } from "@/components/smt/smt-charts";
import type { ReportTemplate } from "@/lib/smt/catalog";
import { dmy, todayVn } from "@/lib/smt/types";

// Khung tài liệu báo cáo: đầu trang kiểu biểu mẫu nhà máy (mã tài liệu, kỳ báo cáo, nguồn dữ liệu)
// + ô ký duyệt chỉ hiện khi in. Toàn bộ nằm trong .smt-print-area để "In / Lưu PDF" chỉ in phần này.
export function ReportDocument({
  template,
  company,
  period,
  line,
  source,
  toolbar,
  children
}: {
  template: ReportTemplate;
  company: string;
  period?: { from: string; to: string };
  line?: string;
  source?: "demo" | "live" | "blank";
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const { lang } = useLanguage();
  return (
    <article className="smt-print-area space-y-4">
      {toolbar && <div className="smt-no-print">{toolbar}</div>}
      <header className="card smt-block grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="eyebrow">
            {template.code} · {template.standard}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{template.title[lang] || template.title.vi}</h1>
          <p className="muted mt-1 text-sm">{company} · SMT Engineering Report &amp; Toolkit</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] content-start gap-x-3 gap-y-1 text-sm sm:text-right">
          {period && (
            <>
              <dt className="muted">{t("Kỳ báo cáo", "Period")}</dt>
              <dd className="font-medium tabular-nums">
                {dmy(period.from)} → {dmy(period.to)}
              </dd>
            </>
          )}
          {line !== undefined && (
            <>
              <dt className="muted">Line</dt>
              <dd className="font-medium">{line || t("Tất cả", "All")}</dd>
            </>
          )}
          {source && (
            <>
              <dt className="muted">{t("Dữ liệu", "Data")}</dt>
              <dd className="font-medium">{source === "demo" ? t("Mô phỏng (demo)", "Simulated (demo)") : source === "live" ? t("Thực tế", "Actual") : t("Mẫu trống", "Blank form")}</dd>
            </>
          )}
          <dt className="muted">{t("Ngày lập", "Issued")}</dt>
          <dd className="font-medium tabular-nums">{dmy(todayVn())}</dd>
        </dl>
      </header>
      {children}
      <Signatures />
    </article>
  );
}

export function Signatures() {
  const t = useT();
  return (
    <div className="smt-print-only">
      <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm">
        {[t("Người lập", "Prepared by"), t("Kiểm tra", "Checked by"), t("Phê duyệt", "Approved by")].map((role) => (
          <div key={role} className="rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
            <p className="font-semibold">{role}</p>
            <div className="h-16" />
            <p className="muted text-xs">{t("Ký, ghi rõ họ tên / ngày", "Signature / name / date")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Section({ title, hint, children, className = "" }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card smt-block space-y-3 ${className}`}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="muted text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function DataTable({ head, rows, align, empty }: { head: string[]; rows: Array<Array<ReactNode>>; align?: Array<"left" | "right" | "center">; empty?: string }) {
  const t = useT();
  if (!rows.length) return <p className="muted text-sm">{empty ?? t("Chưa có dữ liệu.", "No data.")}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs" style={{ background: "color-mix(in srgb, var(--border) 40%, transparent)" }}>
            {head.map((h, i) => (
              <th key={i} className={`whitespace-nowrap px-3 py-2 font-semibold ${align?.[i] === "right" ? "text-right" : align?.[i] === "center" ? "text-center" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t align-top" style={{ borderColor: "var(--border)" }}>
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-1.5 ${align?.[j] === "right" ? "text-right tabular-nums" : align?.[j] === "center" ? "text-center" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FormulaNote({ items }: { items: string[] }) {
  const t = useT();
  return (
    <details className="card smt-block text-sm">
      <summary className="cursor-pointer font-semibold">{t("Công thức & cách tính", "Formulas & method")}</summary>
      <ul className="muted mt-2 list-disc space-y-1 pl-5">
        {items.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </details>
  );
}
