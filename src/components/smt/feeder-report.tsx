"use client";

import { useMemo, useState } from "react";
import { KpiTile, RankBars, StatusBadge, useT } from "@/components/smt/smt-charts";
import { DataTable, Section } from "@/components/smt/report-parts";
import { buildAssetHealth } from "@/lib/smt/metrics";
import { dmy, num, pct } from "@/lib/smt/types";
import type { Asset, AssetLog, SmtSettings } from "@/lib/smt/types";

export function FeederReport({ assets, logs, settings, from, to }: { assets: Asset[]; logs: AssetLog[]; settings: SmtSettings; from: string; to: string }) {
  const t = useT();
  const [type, setType] = useState<"all" | "feeder" | "nozzle">("all");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const all = useMemo(() => buildAssetHealth(assets, logs, settings, { from, to }), [assets, logs, settings, from, to]);
  const health = all.filter((a) => type === "all" || a.asset_type === type);
  const target = settings.targets.mispickRate;
  const count = (h: string) => health.filter((a) => a.health === h).length;
  const picks = health.reduce((s, a) => s + a.picks, 0);
  const mis = health.reduce((s, a) => s + a.mispicks, 0);
  const pmSoon = health.filter((a) => a.daysToPm !== null && a.daysToPm <= 14).sort((a, b) => (a.daysToPm ?? 0) - (b.daysToPm ?? 0));
  const label = { good: t("Tốt", "Good"), warning: t("Cảnh báo", "Warning"), critical: t("Nguy cấp", "Critical") } as const;
  const list = onlyIssues ? health.filter((a) => a.health !== "good") : health;

  if (!assets.length) return <p className="card text-sm">{t("Chưa có danh mục feeder / nozzle.", "No feeder / nozzle registered yet.")}</p>;

  return (
    <div className="space-y-4">
      <div className="smt-no-print flex flex-wrap gap-2 text-sm">
        {(["all", "feeder", "nozzle"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setType(k)} aria-pressed={type === k} className={`chip ${type === k ? "!border-brand-500 font-semibold text-brand-700 dark:text-brand-200" : ""}`}>
            {k === "all" ? t("Tất cả", "All") : k === "feeder" ? "Feeder" : "Nozzle"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("Mispick rate trung bình", "Average mispick rate")} value={pct(picks ? mis / picks : 0, 3)} target={`≤ ${pct(target, 2)}`} ok={picks ? mis / picks <= target : null} hint={`${num(mis)} / ${num(picks)} picks`} />
        <div className="card smt-block">
          <p className="muted text-sm">{t("Nguy cấp – rút khỏi line", "Critical – pull from line")}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{count("critical")}</p>
          <div className="mt-2">
            <StatusBadge status="critical">{label.critical}</StatusBadge>
          </div>
        </div>
        <div className="card smt-block">
          <p className="muted text-sm">{t("Cảnh báo – lên kế hoạch PM", "Warning – plan PM")}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{count("warning")}</p>
          <div className="mt-2">
            <StatusBadge status="warning">{label.warning}</StatusBadge>
          </div>
        </div>
        <div className="card smt-block">
          <p className="muted text-sm">{t("Hoạt động tốt", "Healthy")}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{count("good")}</p>
          <div className="mt-2">
            <StatusBadge status="good">{label.good}</StatusBadge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card smt-block">
          <RankBars
            title={t(`Top mispick rate (mục tiêu ≤ ${pct(target, 2)})`, `Top mispick rate (target ≤ ${pct(target, 2)})`)}
            items={[...health].filter((a) => a.picks > 0).sort((a, b) => b.rate - a.rate).slice(0, 10).map((a) => ({ label: a.code, value: a.rate, note: `${a.spec} · ${a.machine}` }))}
            format={(v) => pct(v, 2)}
            highlight={(code) => (health.find((a) => a.code === code)?.rate ?? 0) > target * 2}
          />
        </section>
        <Section title={t("Lịch PM 14 ngày tới", "PM due in next 14 days")}>
          <DataTable
            head={[t("Mã", "Code"), t("Loại", "Type"), t("Máy", "Machine"), t("Hạn PM", "PM due"), t("Còn", "Days")]}
            align={["left", "left", "left", "left", "right"]}
            rows={pmSoon.slice(0, 10).map((a) => [<b key="c">{a.code}</b>, a.asset_type, a.machine, dmy(a.nextPm), <span key="d" className="font-semibold">{(a.daysToPm ?? 0) < 0 ? t(`Quá ${-(a.daysToPm ?? 0)} ngày`, `${-(a.daysToPm ?? 0)}d overdue`) : `${a.daysToPm}d`}</span>])}
            empty={t("Không có thiết bị đến hạn PM.", "Nothing due.")}
          />
        </Section>
      </div>

      <Section title={t("Danh sách chi tiết", "Detail list")}>
        <label className="smt-no-print flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
          {t("Chỉ hiện thiết bị cần xử lý", "Only show items needing action")}
        </label>
        <DataTable
          head={[t("Mã", "Code"), t("Quy cách", "Spec"), t("Máy", "Machine"), "Picks", "Mispick", t("Hạn PM", "PM due"), t("Trạng thái", "Status"), t("Lý do", "Reason")]}
          align={["left", "left", "left", "right", "right", "left", "left", "left"]}
          rows={list.map((a) => [
            <b key="c">{a.code}</b>,
            `${a.asset_type} ${a.spec}`,
            a.machine,
            num(a.picks),
            pct(a.rate, 2),
            dmy(a.nextPm),
            <StatusBadge key="s" status={a.health}>
              {label[a.health]}
            </StatusBadge>,
            <span key="r" className="muted text-xs">
              {a.reasons.join("; ")}
            </span>
          ])}
        />
      </Section>
    </div>
  );
}
