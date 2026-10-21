"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge, useT } from "@/components/smt/smt-charts";
import { OeeReport } from "@/components/smt/oee-report";
import { YieldReport } from "@/components/smt/yield-report";
import { FeederReport } from "@/components/smt/feeder-report";
import { TIER_COLOR } from "@/components/smt-workspace/charts";
import { LineFlow } from "@/components/smt-workspace/line-flow";
import { LINE_TIERS, type LineTier } from "@/lib/smt/demo-config";
import { buildLineBalance } from "@/lib/smt/metrics";
import { categoryOf, statusOf, type Engineer, type Task } from "@/lib/smt/team-types";
import { EIGHT_D_STATUS, addDays, dmy } from "@/lib/smt/types";
import type { Asset, AssetLog, ChangeLog, CycleTime, DefectLog, EightDReport, ProductionLog, SmtLine, SmtSettings } from "@/lib/smt/types";

type Props = {
  line: SmtLine;
  tier: LineTier;
  settings: SmtSettings;
  from: string;
  to: string;
  data: { production: ProductionLog[]; defects: DefectLog[]; cycleTimes: CycleTime[]; assets: Asset[]; assetLogs: AssetLog[]; changes: ChangeLog[]; eightD: EightDReport[] };
  tasks: Task[] | null;
  engineers: Engineer[];
};

const TABS = [
  { id: "oee", vi: "Hiệu suất (OEE)", en: "Performance (OEE)" },
  { id: "yield", vi: "Chất lượng (Yield)", en: "Quality (Yield)" },
  { id: "assets", vi: "Feeder / Nozzle", en: "Feeders / Nozzles" },
  { id: "actions", vi: "8D · 4M · Công việc", en: "8D · 4M · Tasks" }
] as const;

export function LineDetail({ line, tier, settings, from, to, data, tasks, engineers }: Props) {
  const t = useT();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("oee");
  const tierInfo = LINE_TIERS.find((x) => x.id === tier)!;
  const bottleneck = useMemo(() => {
    const balance = buildLineBalance(data.cycleTimes, settings, { line: line.code });
    return [...balance].sort((a, b) => b.measuredOn.localeCompare(a.measuredOn))[0]?.bottleneck.station;
  }, [data.cycleTimes, settings, line.code]);
  const name = (id: string | null) => engineers.find((e) => e.id === id)?.name ?? "—";
  const status8d = (id: string) => EIGHT_D_STATUS.find((s) => s.id === id);

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/smt/line" className="text-brand-600 dark:text-brand-300">
          Line
        </Link>
        <span className="muted">/</span>
        <span className="font-medium">{line.code}</span>
      </nav>
      <header className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">{line.name}</h1>
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className="h-3 w-3 rounded-sm" style={{ background: TIER_COLOR[tier] }} aria-hidden />
            {t(tierInfo.vi, tierInfo.en)} · Takt {line.taktSec}s
          </span>
        </div>
        <LineFlow stations={line.stations} bottleneck={bottleneck} />
        <p className="muted text-xs">
          {dmy(from)} → {dmy(to)} · {t("Viền đứt = trạm kiểm tra; ⏱ = trạm nút thắt theo lần đo cycle time mới nhất.", "Dashed border = inspection station; ⏱ = bottleneck from the latest cycle-time study.")}
        </p>
      </header>

      <div className="flex flex-wrap gap-1" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={`chip ${tab === x.id ? "!border-brand-500 font-semibold text-brand-700 dark:text-brand-200" : ""}`}>
            {t(x.vi, x.en)}
          </button>
        ))}
      </div>

      {tab === "oee" && <OeeReport production={data.production} cycleTimes={data.cycleTimes} settings={settings} from={from} to={to} line={line.code} />}
      {tab === "yield" && <YieldReport production={data.production} defects={data.defects} settings={settings} from={from} to={to} line={line.code} />}
      {tab === "assets" &&
        (data.assets.length ? (
          <FeederReport assets={data.assets} logs={data.assetLogs} settings={settings} from={addDays(to, -29)} to={to} />
        ) : (
          <p className="card text-sm">{t("Chưa có feeder / nozzle nào gắn với line này (cột Máy bắt đầu bằng mã line).", "No feeders / nozzles assigned to this line.")}</p>
        ))}
      {tab === "actions" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card space-y-2">
            <h2 className="font-semibold">8D ({data.eightD.length})</h2>
            {data.eightD.length ? (
              <ul className="space-y-2 text-sm">
                {data.eightD.map((r) => (
                  <li key={r.id}>
                    <Link href={`/smt/bao-cao/8d?id=${r.id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                      {r.code}
                    </Link>{" "}
                    · {r.title}
                    <span className="muted block text-xs">
                      {t(status8d(r.status)?.vi ?? r.status, status8d(r.status)?.en ?? r.status)} · {dmy(r.opened_on)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted text-sm">{t("Không có 8D.", "No 8D reports.")}</p>
            )}
          </section>
          <section className="card space-y-2">
            <h2 className="font-semibold">4M1E ({data.changes.length})</h2>
            <ul className="max-h-80 space-y-2 overflow-auto text-sm">
              {data.changes.map((c) => (
                <li key={c.id}>
                  <b className="font-mono">{c.code}</b> · {c.item}
                  <span className="muted block text-xs">
                    {c.category} · {dmy(c.change_date)} · {t("rủi ro", "risk")} {c.risk} · {c.result}
                  </span>
                </li>
              ))}
              {!data.changes.length && <li className="muted">{t("Không có thay đổi.", "No changes.")}</li>}
            </ul>
          </section>
          <section className="card space-y-2 lg:col-span-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{t("Công việc của line", "Tasks on this line")}</h2>
              <Link href={`/smt/cong-viec?line=${line.code}`} className="text-sm font-semibold text-brand-600 dark:text-brand-300">
                {t("Mở bảng công việc →", "Open task board →")}
              </Link>
            </div>
            {tasks === null ? (
              <p className="muted text-sm">{t("Công việc thực tế chỉ admin xem được. Chuyển sang Demo để xem ví dụ.", "Live tasks are admin-only. Switch to Demo to see an example.")}</p>
            ) : (
              <ul className="divide-y text-sm" style={{ borderColor: "var(--border)" }}>
                {tasks.slice(0, 12).map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2" style={{ borderColor: "var(--border)" }}>
                    <span className="min-w-0">
                      {categoryOf(x.category).icon} <b className="font-mono">{x.code}</b> {x.title}
                      <span className="muted block text-xs">
                        {name(x.assignee_id)} · {t("hạn", "due")} {dmy(x.due_on) || "—"}
                      </span>
                    </span>
                    <StatusBadge status={x.status === "done" ? "good" : x.status !== "cancelled" && x.due_on && x.due_on < to ? "critical" : "warning"}>{t(statusOf(x.status).vi, statusOf(x.status).en)}</StatusBadge>
                  </li>
                ))}
                {!tasks.length && <li className="muted py-2">{t("Không có công việc.", "No tasks.")}</li>}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
