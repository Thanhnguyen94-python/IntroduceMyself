"use client";

import Link from "next/link";
import { KpiTile, ParetoChart, RankBars, StatusBadge, useT } from "@/components/smt/smt-charts";
import { CompareBars, MultiLineChart, TIER_COLOR } from "@/components/smt-workspace/charts";
import { LINE_TIERS } from "@/lib/smt/demo-config";
import type { ModuleSet } from "@/lib/smt/modules";
import type { Overview } from "@/lib/smt/workspace-metrics";
import { ddmm, dmy, num, pct } from "@/lib/smt/types";
import type { SmtSettings } from "@/lib/smt/types";

type Props = {
  data: Overview;
  targets: SmtSettings["targets"];
  from: string;
  to: string;
  range: string;
  company: string;
  events: Array<{ id: string; line: string; from: string; to: string; title: { vi: string; en: string } }>;
  modules: ModuleSet;
};

const ppm = (v: number) => num(v, v < 10 ? 1 : 0);

// Tailwind cần tên class đầy đủ (không ghép chuỗi động).
const TILE_COLS = ["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5"];

// Mỗi ô / khối / cột chỉ hiện khi nhóm của nó bật trong Phạm vi quản lý (modules.ts):
// OEE, dừng máy -> equipment · FPY, DPMO, Pareto, lỗi lọt -> quality · board -> production · so sánh cấp line, quý -> strategy.
export function OverviewView({ data, targets, from, to, range, company, events, modules: m }: Props) {
  const t = useT();
  const tierLabel = (id: string) => {
    const x = LINE_TIERS.find((l) => l.id === id);
    return x ? t(x.vi, x.en) : id;
  };
  const tiers = data.tiers;
  const bars = (pick: (x: (typeof tiers)[number]) => number) => tiers.map((x) => ({ id: x.id, label: tierLabel(x.id), value: pick(x), color: TIER_COLOR[x.id] }));
  const early = (x: (typeof tiers)[number]) => (x.points ? x.detect.early / x.points : 0);
  const series = tiers.map((x) => ({ id: x.id, label: tierLabel(x.id), color: TIER_COLOR[x.id] }));
  const has = data.total.boards > 0;
  const tiles = [
    m.equipment && <KpiTile key="oee" label="OEE" value={pct(data.total.oee)} target={pct(targets.oee)} ok={has ? data.total.oee >= targets.oee : null} hint={`A ${pct(data.total.availability)} · P ${pct(data.total.performance)} · Q ${pct(data.total.quality)}`} />,
    m.quality && <KpiTile key="fpy" label="FPY" value={pct(data.total.fpy, 2)} target={pct(targets.fpy)} ok={has ? data.total.fpy >= targets.fpy : null} />,
    m.quality && <KpiTile key="dpmo" label="DPMO" value={num(data.total.dpmo, 1)} target={num(targets.dpmo)} ok={has ? data.total.dpmo <= targets.dpmo : null} hint={t(`${num(data.total.points)} điểm lỗi`, `${num(data.total.points)} defect points`)} />,
    m.production && <KpiTile key="out" label={t("Sản lượng", "Output")} value={num(data.total.boards)} hint={t(`${num(data.total.boards / Math.max(1, data.days))} board/ngày`, `${num(data.total.boards / Math.max(1, data.days))} boards/day`)} />,
    m.quality && <KpiTile key="esc" label={t("Lọt đến khách hàng", "Escaped to customer")} value={`${ppm(data.total.escapePpm)} PPM`} hint={t(`${num(data.total.detect.customer)} điểm lỗi`, `${num(data.total.detect.customer)} defect points`)} />
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{company}</p>
          <h1 className="text-2xl font-bold">{t("Tổng quan nhà máy SMT", "SMT factory overview")}</h1>
          <p className="muted text-sm">
            {dmy(from)} → {dmy(to)} · {data.lines.length} line{m.production && <> · {num(data.total.boards)} board</>}
          </p>
        </div>
      </div>

      {tiles.length > 0 && <div className={`grid gap-3 sm:grid-cols-2 ${TILE_COLS[tiles.length]}`}>{tiles}</div>}

      {m.strategy && (m.equipment || m.quality) && tiers.length > 1 && (
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t("Đầu tư thiết bị có đáng không? So sánh 3 cấp line", "Is the equipment worth it? 3 line tiers compared")}</h2>
            <p className="muted text-sm">
              {LINE_TIERS.filter((x) => tiers.some((y) => y.id === x.id))
                .map((x) => `${t(x.vi, x.en)}: ${t(x.desc.vi, x.desc.en)}`)
                .join(" · ")}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {m.equipment && <CompareBars title="OEE" items={bars((x) => x.oee)} format={(v) => pct(v)} />}
            {m.quality && (
              <>
                <CompareBars title="FPY" items={bars((x) => x.fpy)} format={(v) => pct(v, 2)} />
                <CompareBars title="DPMO" note={t("thấp hơn là tốt", "lower is better")} items={bars((x) => x.dpmo)} format={(v) => num(v, 1)} better="low" />
                <CompareBars title={t("Lỗi bắt được trước lò", "Defects caught before reflow")} note="SPI + M-AOI" items={bars(early)} format={(v) => pct(v)} />
                <CompareBars title={t("Lọt xuống ICT/FCT", "Escaped to ICT/FCT")} note={t("% điểm lỗi", "% of defects")} items={bars((x) => (x.points ? x.detect.test / x.points : 0))} format={(v) => pct(v, 2)} better="low" />
                <CompareBars title={t("Lọt đến khách hàng", "Escaped to customer")} note="PPM board" items={bars((x) => x.escapePpm)} format={ppm} better="low" />
              </>
            )}
          </div>
          {m.quality && (
            <p className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
              💡{" "}
              {t(
                "Cách đọc: M-AOI không làm giảm số lỗi phát sinh nhiều, nhưng bắt lỗi gắn linh kiện khi chưa hàn (sửa rẻ, máy được chỉnh ngay) nên FPY cao hơn và ít lỗi lọt hơn. Line Pro thêm SPI 3D closed-loop và X-ray nên bắt được void BGA mà AOI không thấy. DPMO line Pro thấp còn vì board nhiều mối hàn (mẫu số lớn) – so sánh DPMO luôn kèm số cơ hội lỗi.",
                "How to read: M-AOI barely reduces defects created, but it catches placement defects before soldering (cheap rework, instant machine correction), so FPY is higher and fewer escapes. Pro lines add closed-loop 3D SPI and X-ray, catching BGA voids AOI can't see. Pro DPMO is also low because boards have many joints (large denominator) – always compare DPMO together with opportunities."
              )}
            </p>
          )}
        </section>
      )}

      {m.equipment && data.weekly.length > 1 && (
        <section className="card">
          <MultiLineChart
            title={t("OEE theo tuần", "Weekly OEE")}
            series={series}
            data={data.weekly.map((w) => ({ x: w.week, label: ddmm(w.week), values: w.values }))}
            format={(v) => pct(v)}
            target={targets.oee}
            xLabel={t("Tuần từ", "Week of")}
          />
        </section>
      )}

      <section className="card space-y-3 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("Từng line", "By line")}</h2>
          <Link href={`/smt/line?range=${range}`} className="text-sm font-semibold text-brand-600 dark:text-brand-300">
            {t("Sơ đồ & chi tiết line →", "Layouts & line details →")}
          </Link>
        </div>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className={`w-full text-sm ${m.equipment && m.quality ? "min-w-[760px]" : "min-w-[480px]"}`}>
            <thead>
              <tr className="muted text-left text-xs">
                <th className="py-2">Line</th>
                <th className="py-2">{t("Cấp", "Tier")}</th>
                {m.equipment && <th className="py-2 text-right">OEE</th>}
                {m.equipment && <th className="py-2 text-right">A · P · Q</th>}
                {m.quality && <th className="py-2 text-right">FPY</th>}
                {m.quality && <th className="py-2 text-right">DPMO</th>}
                {m.production && <th className="py-2 text-right">{t("Board", "Boards")}</th>}
                {m.quality && <th className="py-2">{t("Lỗi nhiều nhất", "Top defect")}</th>}
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l) => (
                <tr key={l.code} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2">
                    <Link href={`/smt/line/${l.code}?range=${range}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                      {l.name}
                    </Link>
                  </td>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TIER_COLOR[l.tier] }} aria-hidden />
                      {tierLabel(l.tier)}
                    </span>
                  </td>
                  {m.equipment && <td className="py-2 text-right">{l.hasData ? <StatusBadge status={l.oee >= targets.oee ? "good" : l.oee >= targets.oee - 0.08 ? "warning" : "critical"}>{pct(l.oee)}</StatusBadge> : "—"}</td>}
                  {m.equipment && <td className="muted py-2 text-right tabular-nums">{l.hasData ? `${pct(l.availability, 0)} · ${pct(l.performance, 0)} · ${pct(l.quality, 1)}` : "—"}</td>}
                  {m.quality && <td className="py-2 text-right tabular-nums">{l.hasData ? pct(l.fpy, 2) : "—"}</td>}
                  {m.quality && <td className="py-2 text-right tabular-nums">{l.hasData ? num(l.dpmo, 1) : "—"}</td>}
                  {m.production && <td className="py-2 text-right tabular-nums">{num(l.boards)}</td>}
                  {m.quality && <td className="py-2">{l.topDefect ? `${l.topDefect.code} (${num(l.topDefect.qty)})` : "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(m.quality || m.equipment) && (
        <div className={`grid gap-4 ${m.quality && m.equipment ? "lg:grid-cols-2" : ""}`}>
          {m.quality && (
            <section className="card">
              <ParetoChart title={t("Pareto lỗi toàn nhà máy", "Factory defect Pareto")} items={data.pareto.map((p) => ({ ...p, label: t(p.label, p.labelEn) }))} />
            </section>
          )}
          {m.equipment && (
            <section className="card">
              <RankBars title={t("Thời gian dừng máy theo lý do (phút)", "Downtime by reason (min)")} items={data.downtime.slice(0, 8).map((d) => ({ label: d.reason, value: d.minutes }))} />
            </section>
          )}
        </div>
      )}

      {m.strategy && data.quarters.length > 0 && (
        <section className="card space-y-3 overflow-hidden">
          <h2 className="text-lg font-semibold">{t("So sánh theo quý", "Quarter comparison")}</h2>
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="muted text-left text-xs">
                  <th className="py-2">{t("Quý", "Quarter")}</th>
                  <th className="py-2 text-right">{t("Ngày SX", "Days")}</th>
                  {m.equipment && <th className="py-2 text-right">OEE</th>}
                  {m.quality && <th className="py-2 text-right">FPY</th>}
                  {m.quality && <th className="py-2 text-right">DPMO</th>}
                  {m.production && <th className="py-2 text-right">{t("Board", "Boards")}</th>}
                  {m.equipment &&
                    tiers.map((x) => (
                      <th key={x.id} className="py-2 text-right">
                        OEE {tierLabel(x.id)}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {data.quarters.map((q) => (
                  <tr key={q.quarter} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 font-semibold">{q.quarter}</td>
                    <td className="py-2 text-right tabular-nums">{q.days}</td>
                    {m.equipment && <td className="py-2 text-right tabular-nums">{pct(q.all.oee)}</td>}
                    {m.quality && <td className="py-2 text-right tabular-nums">{pct(q.all.fpy, 2)}</td>}
                    {m.quality && <td className="py-2 text-right tabular-nums">{num(q.all.dpmo, 1)}</td>}
                    {m.production && <td className="py-2 text-right tabular-nums">{num(q.all.boards)}</td>}
                    {m.equipment &&
                      tiers.map((x) => (
                        <td key={x.id} className="py-2 text-right tabular-nums">
                          {q.tiers[x.id]?.boards ? pct(q.tiers[x.id]!.oee) : "—"}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted text-xs">{t("Quý đang chạy chưa đủ ngày: so sánh xu hướng, không so tổng sản lượng.", "The current quarter is partial: compare trends, not total output.")}</p>
        </section>
      )}

      {events.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">{t("Sự kiện trong dữ liệu demo (để luyện phân tích)", "Events hidden in the demo data (for practice)")}</h2>
          <p className="muted text-sm">{t("Thử tìm dấu hiệu của từng sự kiện trên biểu đồ line tương ứng, rồi đối chiếu với 8D / 4M / công việc liên quan.", "Try to spot each event on its line's charts, then cross-check the related 8D / 4M / tasks.")}</p>
          <ul className="grid gap-2 md:grid-cols-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
                <Link href={`/smt/line/${e.line}?range=all`} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  {e.line}
                </Link>{" "}
                · {dmy(e.from)} → {dmy(e.to)}
                <span className="block">{t(e.title.vi, e.title.en)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
