"use client";

import { useMemo } from "react";
import { BalanceChart, KpiTile, LossWaterfall, RankBars, StatusBadge, TrendChart, useT } from "@/components/smt/smt-charts";
import { DataTable, Section } from "@/components/smt/report-parts";
import { buildOeeReport } from "@/lib/smt/metrics";
import { dmy, num, pct } from "@/lib/smt/types";
import type { CycleTime, ProductionLog, SmtSettings } from "@/lib/smt/types";

export function OeeReport({ production, cycleTimes, settings, from, to, line }: { production: ProductionLog[]; cycleTimes: CycleTime[]; settings: SmtSettings; from: string; to: string; line: string }) {
  const t = useT();
  const r = useMemo(() => buildOeeReport(production, cycleTimes, settings, { from, to, line: line || undefined }), [production, cycleTimes, settings, from, to, line]);
  const tg = settings.targets;
  const k = r.total;
  const pct1 = (v: number) => pct(v);

  if (!k.planned) return <p className="card text-sm">{t("Chưa có nhật ký sản xuất trong kỳ này.", "No production logs in this period.")}</p>;

  // Tổn thất lớn nhất trong 3 thành phần -> gợi ý hướng cải tiến.
  const gaps = [
    { key: t("Availability (dừng máy)", "Availability (downtime)"), loss: 1 - k.availability },
    { key: t("Performance (chậm tốc độ)", "Performance (speed)"), loss: 1 - k.performance },
    { key: t("Quality (lỗi)", "Quality (defects)"), loss: 1 - k.quality }
  ].sort((a, b) => b.loss - a.loss);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="OEE" value={pct1(k.oee)} target={pct1(tg.oee)} ok={k.oee >= tg.oee} hint={`${num(k.total)} board · ${num(k.planned / 60, 1)} ${t("giờ kế hoạch", "planned hours")}`} />
        <KpiTile label="Availability" value={pct1(k.availability)} target={pct1(tg.availability)} ok={k.availability >= tg.availability} hint={`${t("Dừng", "Down")} ${num(k.downtime)} ${t("phút", "min")}`} />
        <KpiTile label="Performance" value={pct1(k.performance)} hint={t("CT chuẩn × sản lượng / thời gian chạy", "Ideal CT × output / run time")} />
        <KpiTile label="Quality (FPY)" value={pct1(k.quality)} target={pct1(tg.fpy)} ok={k.quality >= tg.fpy} hint={`${num(k.total - k.good)} ${t("board phải sửa", "boards reworked")}`} />
      </div>

      <div className="card smt-block text-sm">
        <b>{t("Nhận định", "Insight")}:</b> {t("Tổn thất lớn nhất đến từ", "Largest loss comes from")} <b>{gaps[0].key}</b> ({pct1(gaps[0].loss)}).{" "}
        {r.downtime[0] && (
          <>
            {t("Lý do dừng nhiều nhất", "Top downtime reason")}: <b>{r.downtime[0].reason}</b> ({num(r.downtime[0].minutes)} {t("phút", "min")}, {pct1(r.downtime[0].minutes / Math.max(1, k.downtime))}).
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card smt-block">
          <TrendChart title={t("OEE theo ngày", "Daily OEE")} label="OEE" data={r.daily.map((d) => ({ date: d.date, value: d.oee, has: d.has }))} target={tg.oee} format={(v) => pct(v, 0)} />
        </section>
        <section className="card smt-block">
          <LossWaterfall title={t("Thác tổn thất thời gian (phút)", "Time-loss waterfall (min)")} planned={k.planned} losses={r.losses} />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Section title={t("So sánh line & ca", "Lines & shifts")}>
          <DataTable
            head={[t("Line / Ca", "Line / Shift"), "OEE", "A", "P", "Q", t("Sản lượng", "Output")]}
            align={["left", "right", "right", "right", "right", "right"]}
            rows={[
              ...r.lines.map((l) => [<b key="n">{l.name}</b>, <OeeCell key="o" v={l.oee} target={tg.oee} />, pct1(l.availability), pct1(l.performance), pct1(l.quality), num(l.total)]),
              ...r.shifts.map((s) => [<span key="s" className="muted">↳ {s.shift}</span>, <OeeCell key="o" v={s.oee} target={tg.oee} />, pct1(s.availability), pct1(s.performance), pct1(s.quality), num(s.total)])
            ]}
          />
        </Section>
        <section className="card smt-block">
          <RankBars title={t("Lý do dừng máy (phút)", "Downtime reasons (min)")} items={r.downtime.slice(0, 8).map((d) => ({ label: d.reason, value: d.minutes }))} format={(v) => num(v)} />
        </section>
      </div>

      <Section title={t("Cân bằng chuyền & điểm nghẽn (Line Balance)", "Line balance & bottleneck")} hint={t("Lần đo cycle time mới nhất của mỗi line × model. Trạm có CT cao nhất quyết định sản lượng của cả chuyền.", "Latest cycle-time study per line × model. The slowest station sets the output of the whole line.")}>
        {r.balance.length ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {r.balance.map((b) => {
              const overTakt = b.takt > 0 && b.bottleneck.ct > b.takt;
              return (
                <div key={`${b.line}-${b.model}`} className="space-y-2">
                  <BalanceChart title={`${b.line} · ${b.model}`} stations={b.stations} takt={b.takt} bottleneck={b.bottleneck.station} />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span>
                      {t("Hiệu suất cân bằng", "Balance efficiency")}: <b className="tabular-nums">{pct1(b.efficiency)}</b>
                    </span>
                    <span>
                      UPH max: <b className="tabular-nums">{num(b.uph)}</b>
                    </span>
                    <StatusBadge status={overTakt ? "critical" : b.efficiency < 0.8 ? "warning" : "good"}>
                      {overTakt ? t(`Bottleneck vượt takt ${(b.bottleneck.ct - b.takt).toFixed(1)}s`, `Bottleneck over takt by ${(b.bottleneck.ct - b.takt).toFixed(1)}s`) : b.efficiency < 0.8 ? t("Cân bằng kém (< 80%)", "Poor balance (< 80%)") : t("Đạt takt", "Meets takt")}
                    </StatusBadge>
                    <span className="muted text-xs">
                      {t("Đo ngày", "Measured")} {dmy(b.measuredOn)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted text-sm">{t("Chưa có dữ liệu cycle time trạm.", "No station cycle-time data yet.")}</p>
        )}
      </Section>
    </div>
  );
}

function OeeCell({ v, target }: { v: number; target: number }) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5 font-semibold">
      {v < target && (
        <span className="text-[10px]" style={{ color: "var(--status-critical)" }} title="< target" aria-label="dưới mục tiêu">
          ▼
        </span>
      )}
      {pct(v)}
    </span>
  );
}
