import { SmtMaintenance } from "@/components/smt/smt-notices";
import type { Metadata } from "next";
import Link from "next/link";
import { L } from "@/components/ui/localized";
import { RangeTabs } from "@/components/smt-workspace/workspace-chrome";
import { LineDetail } from "@/components/smt-workspace/line-detail";
import { lineTier } from "@/lib/smt/demo-config";
import { loadLineData, loadTeam, workspaceContext } from "@/lib/smt/workspace";
import { RANGES } from "@/lib/smt/workspace-metrics";
import { workspaceRange } from "@/lib/smt/workspace-range";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Line ${(await params).code.toUpperCase()}` };
}

export default async function SmtLinePage({ params, searchParams }: Props) {
  const ctx = await workspaceContext();
  if (!ctx.open) return <SmtMaintenance />;
  const code = (await params).code.toUpperCase();
  const line = ctx.settings.lines.find((l) => l.code === code);
  // Line demo (L01-L10) và line thật (Cài đặt SMT) khác nhau: báo rõ thay vì 404 khi đổi chế độ.
  if (!line) {
    return (
      <section className="card mx-auto max-w-xl space-y-2 text-center">
        <h1 className="text-xl font-bold">
          <L t={{ vi: `Không có line ${code} trong dữ liệu ${ctx.demo ? "demo" : "thực tế"}`, en: `Line ${code} is not in the ${ctx.demo ? "demo" : "live"} data` }} />
        </h1>
        <Link href="/smt/line" className="btn-primary inline-block">
          <L t={{ vi: "Xem danh sách line", en: "See all lines" }} />
        </Link>
      </section>
    );
  }
  const range = workspaceRange(ctx, (await searchParams).range);
  // Công việc thực tế là dữ liệu nội bộ: chỉ người trong đội (đã đăng nhập); demo thì ai cũng xem được.
  const showTasks = ctx.demo || Boolean(ctx.actor);
  const [data, team] = await Promise.all([loadLineData(ctx, code, range.from, range.to), showTasks ? loadTeam(ctx) : null]);
  const tasks = team ? team.tasks.filter((x) => x.line === code).sort((a, b) => b.assigned_on.localeCompare(a.assigned_on)) : null;

  return (
    <div className="space-y-4">
      <RangeTabs value={range.key} ranges={RANGES} />
      <LineDetail line={line} tier={lineTier(line)} settings={ctx.settings} from={range.from} to={range.to} data={data} tasks={tasks} engineers={team?.engineers ?? []} />
    </div>
  );
}
