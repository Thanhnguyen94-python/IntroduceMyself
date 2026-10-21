"use client";

import Link from "next/link";
import { StatusBadge, useT } from "@/components/smt/smt-charts";
import { TIER_COLOR } from "@/components/smt-workspace/charts";
import { LineFlow } from "@/components/smt-workspace/line-flow";
import { LINE_TIERS } from "@/lib/smt/demo-config";
import type { ModuleSet } from "@/lib/smt/modules";
import type { Overview } from "@/lib/smt/workspace-metrics";
import { num, pct } from "@/lib/smt/types";
import type { SmtSettings } from "@/lib/smt/types";

export function LineCards({ lines, targets, range, modules: m }: { lines: Overview["lines"]; targets: SmtSettings["targets"]; range: string; modules: ModuleSet }) {
  const t = useT();
  // Dòng số liệu dưới sơ đồ: chỉ các chỉ số thuộc nhóm đang bật (Phạm vi quản lý).
  const stats = (l: Overview["lines"][number]) =>
    [m.quality && `FPY ${pct(l.fpy, 2)}`, m.quality && `DPMO ${num(l.dpmo, 1)}`, m.production && `${num(l.boards)} board`, m.quality && l.topDefect && `${t("lỗi nhiều nhất", "top defect")} ${l.topDefect.code}`].filter(Boolean).join(" · ");
  return (
    <div className="space-y-6">
      {LINE_TIERS.map((tier) => {
        const mine = lines.filter((l) => l.tier === tier.id);
        if (!mine.length) return null;
        return (
          <section key={tier.id} className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <span className="h-3 w-3 rounded-sm" style={{ background: TIER_COLOR[tier.id] }} aria-hidden />
              {t(tier.vi, tier.en)} <span className="muted text-sm font-normal">· {t(tier.desc.vi, tier.desc.en)}</span>
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {mine.map((l) => (
                <Link key={l.code} href={`/smt/line/${l.code}?range=${range}`} className="card block space-y-3 hover:border-brand-400">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <b>{l.name}</b>
                    {!m.equipment ? null : l.hasData ? <StatusBadge status={l.oee >= targets.oee ? "good" : l.oee >= targets.oee - 0.08 ? "warning" : "critical"}>OEE {pct(l.oee)}</StatusBadge> : <span className="muted text-xs">{t("Chưa có dữ liệu", "No data")}</span>}
                  </div>
                  <LineFlow stations={l.stations} />
                  {stats(l) && <p className="muted text-xs tabular-nums">{stats(l)}</p>}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
