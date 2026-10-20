"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { KpiTile, ParetoChart, RankBars, TrendChart, useT } from "@/components/smt/smt-charts";
import { DataTable, Section } from "@/components/smt/report-parts";
import { buildYieldReport } from "@/lib/smt/metrics";
import { SMT_PROCESSES, num, pct } from "@/lib/smt/types";
import type { DefectLog, ProductionLog, SmtSettings } from "@/lib/smt/types";

export function YieldReport({ production, defects, settings, from, to, line }: { production: ProductionLog[]; defects: DefectLog[]; settings: SmtSettings; from: string; to: string; line: string }) {
  const t = useT();
  const { lang } = useLanguage();
  const r = useMemo(() => buildYieldReport(production, defects, settings, { from, to, line: line || undefined }), [production, defects, settings, from, to, line]);
  const tg = settings.targets;
  const proc = (id: string) => {
    const p = SMT_PROCESSES.find((x) => x.id === id);
    return p ? (lang === "en" ? p.en : p.vi) : id;
  };

  if (!r.boards) return <p className="card text-sm">{t("Chưa có nhật ký sản xuất trong kỳ này.", "No production logs in this period.")}</p>;

  const vital = r.pareto.filter((p, i) => i === 0 || r.pareto[i - 1].cumulative < 0.8);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="FPY (First Pass Yield)" value={pct(r.fpy, 2)} target={pct(tg.fpy, 1)} ok={r.fpy >= tg.fpy} hint={`${num(r.good)} / ${num(r.boards)} board`} />
        <KpiTile label="DPMO" value={num(r.dpmo)} target={`≤ ${num(tg.dpmo)}`} ok={r.dpmo <= tg.dpmo} hint={t("Lỗi / triệu cơ hội (mối hàn)", "Defects per million opportunities")} />
        <KpiTile label={t("PPM board lỗi", "Board PPM")} value={num(r.ppm)} hint={`${num(r.boards - r.good)} ${t("board lỗi", "defective boards")}`} />
        <KpiTile label={t("Tổng điểm lỗi", "Defect points")} value={num(r.points)} hint={`${r.pareto.length} ${t("mã lỗi", "defect codes")}`} />
      </div>

      {vital.length > 0 && (
        <div className="card smt-block text-sm">
          <b>{t("Nhận định Pareto", "Pareto insight")}:</b> {vital.length} {t("mã lỗi", "codes")} (<b>{vital.map((v) => v.code).join(", ")}</b>) {t("chiếm", "account for")} <b>{pct(vital[vital.length - 1].cumulative, 0)}</b>{" "}
          {t("tổng số lỗi → ưu tiên xử lý trước.", "of all defects → fix these first.")}
          {r.topLocations[0] && (
            <>
              {" "}
              {t("Vị trí lỗi nhiều nhất", "Worst location")}: <b>{r.topLocations[0].location}</b> ({r.topLocations[0].model}, {r.topLocations[0].code}, {num(r.topLocations[0].qty)}).
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card smt-block">
          <ParetoChart title={t("Pareto lỗi", "Defect Pareto")} items={r.pareto.map((p) => ({ code: p.code, label: lang === "en" ? p.en : p.vi, qty: p.qty, share: p.share, cumulative: p.cumulative }))} />
        </section>
        <section className="card smt-block">
          <TrendChart title={t("FPY theo ngày", "Daily FPY")} label="FPY" data={r.daily.map((d) => ({ date: d.date, value: d.fpy, has: d.has }))} target={tg.fpy} format={(v) => pct(v, 1)} />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card smt-block">
          <RankBars title={t("Theo công đoạn gây lỗi", "By process")} items={r.byProcess.map((p) => ({ label: proc(p.label), value: p.qty }))} />
        </section>
        <section className="card smt-block">
          <RankBars title={t("Theo trạm phát hiện", "By detection point")} items={r.byDetect.map((p) => ({ label: p.label, value: p.qty }))} highlight={(l) => l === "Customer"} />
        </section>
        <Section title={t("Top vị trí lỗi (RefDes)", "Top defect locations")}>
          <DataTable
            head={["Model", t("Vị trí", "RefDes"), t("Lỗi", "Code"), t("SL", "Qty")]}
            align={["left", "left", "left", "right"]}
            rows={r.topLocations.slice(0, 8).map((l) => [l.model, <b key="l">{l.location}</b>, l.code, num(l.qty)])}
          />
        </Section>
      </div>

      <Section title={t("Chất lượng theo model (FPY thấp nhất trước)", "Quality by model (lowest FPY first)")}>
        <DataTable
          head={["Model", "Board", "FPY", "DPMO", t("Điểm lỗi", "Defects")]}
          align={["left", "right", "right", "right", "right"]}
          rows={r.models.map((m) => [<b key="m">{m.model}</b>, num(m.boards), <span key="f" style={{ color: m.fpy < tg.fpy ? "var(--status-critical)" : undefined }} className="font-semibold">{m.fpy < tg.fpy ? "▼ " : ""}{pct(m.fpy, 2)}</span>, num(m.dpmo), num(m.defects)])}
        />
      </Section>
    </div>
  );
}
