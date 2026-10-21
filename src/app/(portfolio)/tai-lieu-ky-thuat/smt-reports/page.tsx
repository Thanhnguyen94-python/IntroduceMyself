import type { Metadata } from "next";
import Link from "next/link";
import { L, LList } from "@/components/ui/localized";
import { SmtAdminPreview, SmtMaintenance } from "@/components/smt/smt-notices";
import { REPORT_TEMPLATES } from "@/lib/smt/catalog";
import { smtAccess } from "@/lib/smt/gate";
import { buildAssetHealth, buildYieldReport, filterProduction, oeeOf } from "@/lib/smt/metrics";
import { loadPublicBundle, readSmtSettings } from "@/lib/smt/store";
import { num, pct } from "@/lib/smt/types";

// /tai-lieu-ky-thuat/smt-reports: bộ 5 mẫu báo cáo SMT (xem bản mẫu, tải Excel trống, in PDF).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMT Engineering Report & Toolkit",
  description: "Bộ mẫu báo cáo kỹ sư SMT: 8D, 4M1E, OEE & Line Balance, Yield & Defect Pareto, Feeder & Nozzle Health – xem trực tuyến, tải Excel, in PDF."
};

const FLOW = [
  { icon: "⌨️", vi: "Nhập liệu theo ca", en: "Shift data entry", sub: { vi: "Form / dán từ Excel", en: "Form / paste from Excel" } },
  { icon: "🗄️", vi: "Lưu trữ Supabase", en: "Stored in Supabase", sub: { vi: "7 bảng, RLS chỉ server", en: "7 tables, server-only RLS" } },
  { icon: "🧮", vi: "Tính KPI tự động", en: "Automatic KPIs", sub: { vi: "OEE · FPY · DPMO · Mispick", en: "OEE · FPY · DPMO · Mispick" } },
  { icon: "📊", vi: "Báo cáo chuẩn", en: "Standard reports", sub: { vi: "Web · Excel · PDF", en: "Web · Excel · PDF" } }
];

export default async function SmtReportsPage() {
  const access = await smtAccess();
  if (!access.open) return <SmtMaintenance />;

  const { bundle, settings, source, from, to } = await loadPublicBundle(await readSmtSettings());
  const oee = oeeOf(filterProduction(bundle.production, { from, to }));
  const quality = buildYieldReport(bundle.production, bundle.defects, settings, { from, to });
  const critical = buildAssetHealth(bundle.assets, bundle.assetLogs, settings, { from, to }).filter((a) => a.health === "critical").length;
  const kpis = [
    { label: "OEE", value: pct(oee.oee), href: "oee-line-balance" },
    { label: "FPY", value: pct(quality.fpy, 2), href: "yield-pareto" },
    { label: "DPMO", value: num(quality.dpmo), href: "yield-pareto" },
    { label: { vi: "Feeder/Nozzle cần xử lý", en: "Feeders/Nozzles to fix" }, value: String(critical), href: "feeder-nozzle" }
  ];

  return (
    <section className="space-y-6">
      {access.adminPreview && <SmtAdminPreview />}
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/tai-lieu-ky-thuat" className="text-brand-600 dark:text-brand-300">
          <L t={{ vi: "Tài liệu", en: "Documents" }} />
        </Link>
        <span className="muted">/</span>
        <span className="font-medium">
          <L t={{ vi: "Mẫu báo cáo SMT", en: "SMT report templates" }} />
        </span>
      </nav>

      <header className="card grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div className="space-y-3">
          <p className="eyebrow">SMT Engineering Report &amp; Toolkit</p>
          <h1 className="section-title">
            <L t={{ vi: "Bộ mẫu báo cáo kỹ sư SMT", en: "SMT engineer's report toolkit" }} />
          </h1>
          <p className="muted">
            <L
              t={{
                vi: "5 mẫu báo cáo chuẩn công nghiệp mình dùng hằng ngày trên dây chuyền SMT. Xem báo cáo mẫu với dữ liệu mô phỏng, tải file Excel trống (đã có sẵn công thức) hoặc in ra PDF để dùng ngay.",
                en: "5 industry-standard reports I use daily on SMT lines. Explore live examples with simulated data, download the blank Excel (formulas built in) or print to PDF and use right away."
              }}
            />
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {["AIAG 8D", "IATF 16949", "IPC-A-610", "OEE / TPM", "Lean Line Balance"].map((x) => (
              <span key={x} className="chip">
                {x}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((k) => (
            <Link key={typeof k.label === "string" ? k.label : k.label.vi} href={`/tai-lieu-ky-thuat/smt-reports/${k.href}`} className="rounded-xl border p-3 transition hover:border-brand-400" style={{ borderColor: "var(--border)" }}>
              <p className="muted text-xs">{typeof k.label === "string" ? k.label : <L t={k.label} />}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
            </Link>
          ))}
          <p className="muted col-span-2 text-xs">
            {source === "demo" ? (
              <L t={{ vi: `* Số liệu mô phỏng ${settings.publicDays} ngày, không phải dữ liệu nhà máy.`, en: `* ${settings.publicDays}-day simulated data, not factory data.` }} />
            ) : (
              <L t={{ vi: `* Tổng hợp ${settings.publicDays} ngày gần nhất.`, en: `* Last ${settings.publicDays} days, aggregated.` }} />
            )}
          </p>
        </div>
      </header>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Data flow">
        {FLOW.map((f, i) => (
          <li key={f.vi} className="card flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl dark:bg-slate-800">{f.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {i + 1}. <L t={{ vi: f.vi, en: f.en }} />
              </p>
              <p className="muted text-xs">
                <L t={f.sub} />
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 md:grid-cols-2">
        {REPORT_TEMPLATES.map((tpl) => (
          <article key={tpl.slug} className="card flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-2xl dark:bg-slate-800">{tpl.icon}</span>
              <div className="min-w-0">
                <p className="muted text-xs font-semibold uppercase tracking-wide">
                  {tpl.code} · {tpl.standard}
                </p>
                <h2 className="text-lg font-semibold">
                  <Link href={`/tai-lieu-ky-thuat/smt-reports/${tpl.slug}`} className="hover:text-brand-600">
                    <L t={tpl.title} />
                  </Link>
                </h2>
              </div>
            </div>
            <p className="muted text-sm">
              <L t={tpl.summary} />
            </p>
            <LList t={tpl.sections} className="flex flex-wrap gap-1.5 text-xs [&>li]:rounded-full [&>li]:border [&>li]:px-2 [&>li]:py-0.5 [&>li]:[border-color:var(--border)]" />
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Link href={`/tai-lieu-ky-thuat/smt-reports/${tpl.slug}`} className="btn-primary">
                <L t={{ vi: "Xem báo cáo mẫu", en: "View example" }} />
              </Link>
              <a href={`/api/smt/templates/${tpl.slug}`} className="btn-ghost" download>
                ⬇ Excel
              </a>
              <a href={`/tai-lieu-ky-thuat/smt-reports/${tpl.slug}?${tpl.slug === "8d" ? "blank=1&" : ""}print=1`} className="btn-ghost" target="_blank" rel="noreferrer">
                🖨 PDF
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
