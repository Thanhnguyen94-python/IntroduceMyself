import { redirect } from "next/navigation";
import { SmtMaintenance } from "@/components/smt/smt-notices";
import { ScopeNote } from "@/components/smt-workspace/module-off";
import { RangeTabs } from "@/components/smt-workspace/workspace-chrome";
import { OverviewView } from "@/components/smt-workspace/overview-view";
import { loadDefectSummary, loadProduction, workspaceContext } from "@/lib/smt/workspace";
import { RANGES, buildOverview } from "@/lib/smt/workspace-metrics";
import { demoEvents, workspaceRange } from "@/lib/smt/workspace-range";
import { hasFactoryData, hiddenLabels } from "@/lib/smt/modules";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SmtOverviewPage({ searchParams }: Props) {
  const ctx = await workspaceContext();
  if (!ctx.open) return <SmtMaintenance />;
  // Phạm vi chỉ có Đội ngũ & công việc: Tổng quan không có gì để hiện -> mở thẳng bảng công việc.
  if (!hasFactoryData(ctx.modules)) redirect("/smt/cong-viec");
  const range = workspaceRange(ctx, (await searchParams).range);
  const [production, defects] = await Promise.all([loadProduction(ctx, range.from, range.to), loadDefectSummary(ctx, range.from, range.to)]);
  const data = buildOverview(production, defects, ctx.settings, range.from, range.to);

  return (
    <div className="space-y-4">
      <RangeTabs value={range.key} ranges={RANGES} />
      <ScopeNote isAdmin={ctx.isAdmin} hidden={ctx.isAdmin ? hiddenLabels(ctx.modules) : []} />
      <OverviewView modules={ctx.modules} data={data} targets={ctx.settings.targets} from={range.from} to={range.to} range={range.key} company={ctx.settings.company} events={demoEvents(ctx)} />
    </div>
  );
}
