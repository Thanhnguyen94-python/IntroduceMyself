import { SmtMaintenance } from "@/components/smt/smt-notices";
import { ModuleOff } from "@/components/smt-workspace/module-off";
import { hasFactoryData } from "@/lib/smt/modules";
import Link from "next/link";
import { RangeTabs } from "@/components/smt-workspace/workspace-chrome";
import { LineCards } from "@/components/smt-workspace/line-cards";
import { loadDefectSummary, loadProduction, workspaceContext } from "@/lib/smt/workspace";
import { RANGES, buildOverview } from "@/lib/smt/workspace-metrics";
import { workspaceRange } from "@/lib/smt/workspace-range";

export const dynamic = "force-dynamic";
export const metadata = { title: "Line SMT" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SmtLinesPage({ searchParams }: Props) {
  const ctx = await workspaceContext();
  if (!ctx.open) return <SmtMaintenance />;
  if (!hasFactoryData(ctx.modules)) return <ModuleOff isAdmin={ctx.isAdmin} />;
  const range = workspaceRange(ctx, (await searchParams).range);
  const [production, defects] = await Promise.all([loadProduction(ctx, range.from, range.to), loadDefectSummary(ctx, range.from, range.to)]);
  const data = buildOverview(production, defects, ctx.settings, range.from, range.to);
  return (
    <div className="space-y-4">
      <RangeTabs value={range.key} ranges={RANGES} />
      <LineCards modules={ctx.modules} lines={data.lines} targets={ctx.settings.targets} range={range.key} />
      {!ctx.demo && ctx.isAdmin && (
        <p className="muted text-sm">
          Line và trạm lấy từ <Link href="/admin/smt/settings" className="underline">Admin → Cài đặt SMT</Link>. Đặt tên trạm “M-AOI” (trước Reflow) và “AXI” để trang tự xếp cấp line.
        </p>
      )}
    </div>
  );
}
