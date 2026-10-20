"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useT } from "@/components/smt/smt-charts";
import { FormulaNote, ReportDocument } from "@/components/smt/report-parts";
import { OeeReport } from "@/components/smt/oee-report";
import { YieldReport } from "@/components/smt/yield-report";
import { FeederReport } from "@/components/smt/feeder-report";
import { ChangeReport } from "@/components/smt/change-report";
import { EightDDocument } from "@/components/smt/eight-d-document";
import { findTemplate } from "@/lib/smt/catalog";
import { buildAssetHealth, buildChangeMatrix, buildOeeReport, buildYieldReport } from "@/lib/smt/metrics";
import { changeWorkbook, eightDSheet, feederWorkbook, oeeWorkbook, yieldWorkbook } from "@/lib/smt/workbooks";
import { downloadXlsx } from "@/lib/smt/xlsx";
import { addDays, daysBetween, dmy } from "@/lib/smt/types";
import type { ReportSlug, SmtDataBundle, SmtSettings } from "@/lib/smt/types";

type Props = {
  slug: ReportSlug;
  bundle: SmtDataBundle;
  settings: SmtSettings;
  from: string;
  to: string;
  source: "demo" | "live";
  // Admin tự chọn kỳ (ô ngày ở trang Báo cáo) -> ẩn nút chọn 7/14/30 ngày.
  fixedRange?: boolean;
  blank?: boolean;
  autoPrint?: boolean;
  initial8d?: string;
  extraToolbar?: ReactNode;
};

export function ReportViewer({ slug, bundle, settings, from, to, source, fixedRange, blank, autoPrint, initial8d, extraToolbar }: Props) {
  const t = useT();
  const template = findTemplate(slug)!;
  const total = daysBetween(from, to) + 1;
  const [line, setLine] = useState("");
  const [days, setDays] = useState(total);
  const [pick8d, setPick8d] = useState(initial8d ?? bundle.eightD[0]?.id ?? "");
  const start = fixedRange ? from : addDays(to, -(Math.min(days, total) - 1));
  const period = { from: start, to, line };
  const report8d = useMemo(() => bundle.eightD.find((r) => r.id === pick8d) ?? bundle.eightD[0] ?? null, [bundle.eightD, pick8d]);
  const usesLine = slug === "oee-line-balance" || slug === "yield-pareto" || slug === "4m1e";
  const usesRange = slug !== "8d";

  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  function exportExcel() {
    const stamp = `${start}_${to}`.replace(/-/g, "");
    const name = `${template.code}_${slug}_${line || "ALL"}_${stamp}`;
    if (slug === "oee-line-balance") downloadXlsx(name, oeeWorkbook(buildOeeReport(bundle.production, bundle.cycleTimes, settings, period), settings, period));
    if (slug === "yield-pareto") downloadXlsx(name, yieldWorkbook(buildYieldReport(bundle.production, bundle.defects, settings, period), settings, period));
    if (slug === "feeder-nozzle") downloadXlsx(name, feederWorkbook(buildAssetHealth(bundle.assets, bundle.assetLogs, settings, period), settings, period));
    if (slug === "4m1e") downloadXlsx(name, changeWorkbook(buildChangeMatrix(bundle.changes, period), settings, period));
    if (slug === "8d" && report8d) downloadXlsx(`${report8d.code}_8D`, [eightDSheet(report8d, settings)]);
  }

  const toolbar = (
    <div className="card flex flex-wrap items-center gap-2">
      {usesLine && (
        <select value={line} onChange={(e) => setLine(e.target.value)} className="input w-auto" aria-label="Line">
          <option value="">{t("Tất cả line", "All lines")}</option>
          {settings.lines.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      )}
      {usesRange && !fixedRange && (
        <div className="flex gap-1" role="group" aria-label={t("Kỳ báo cáo", "Period")}>
          {[7, 14, total].filter((d, i, a) => d <= total && a.indexOf(d) === i).map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d} className={`chip ${days === d ? "!border-brand-500 font-semibold text-brand-700 dark:text-brand-200" : ""}`}>
              {d} {t("ngày", "days")}
            </button>
          ))}
        </div>
      )}
      {slug === "8d" && !blank && bundle.eightD.length > 1 && (
        <select value={report8d?.id ?? ""} onChange={(e) => setPick8d(e.target.value)} className="input w-auto max-w-xs" aria-label="8D">
          {bundle.eightD.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code} · {r.title}
            </option>
          ))}
        </select>
      )}
      <div className="ml-auto flex flex-wrap gap-2">
        {extraToolbar}
        {!blank && (slug !== "8d" || report8d) && (
          <button type="button" onClick={exportExcel} className="btn-ghost">
            ⬇ {t("Excel (số liệu)", "Excel (data)")}
          </button>
        )}
        <a href={`/api/smt/templates/${slug}`} className="btn-ghost" download>
          ⬇ {t("Mẫu trống .xlsx", "Blank .xlsx")}
        </a>
        <button type="button" onClick={() => window.print()} className="btn-primary">
          🖨 {t("In / Lưu PDF", "Print / PDF")}
        </button>
      </div>
    </div>
  );

  return (
    <ReportDocument template={template} company={settings.company} period={usesRange ? { from: start, to } : undefined} line={usesLine ? line : undefined} source={blank ? "blank" : source} toolbar={toolbar}>
      {slug === "oee-line-balance" && <OeeReport production={bundle.production} cycleTimes={bundle.cycleTimes} settings={settings} from={start} to={to} line={line} />}
      {slug === "yield-pareto" && <YieldReport production={bundle.production} defects={bundle.defects} settings={settings} from={start} to={to} line={line} />}
      {slug === "feeder-nozzle" && <FeederReport assets={bundle.assets} logs={bundle.assetLogs} settings={settings} from={start} to={to} />}
      {slug === "4m1e" && <ChangeReport changes={bundle.changes} from={start} to={to} line={line} />}
      {slug === "8d" &&
        (blank || report8d ? (
          <EightDDocument report={blank ? null : report8d} />
        ) : (
          <p className="card text-sm">{t("Chưa có báo cáo 8D nào được công khai. Bạn có thể in mẫu trống.", "No published 8D report yet. You can print the blank form.")}</p>
        ))}
      <div className="smt-no-print">
        <FormulaNote items={template.formulas} />
      </div>
      {source === "demo" && !blank && (
        <p className="muted text-xs">
          {t(
            `* Số liệu mô phỏng 2 line SMT (${dmy(from)} → ${dmy(to)}) để minh hoạ mẫu báo cáo, không phải dữ liệu thật của nhà máy.`,
            `* Simulated data for 2 SMT lines (${dmy(from)} → ${dmy(to)}) to illustrate the template — not real factory data.`
          )}
        </p>
      )}
    </ReportDocument>
  );
}
