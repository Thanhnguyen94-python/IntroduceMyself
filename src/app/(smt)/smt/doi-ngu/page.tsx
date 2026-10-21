import { SmtMaintenance } from "@/components/smt/smt-notices";
import { ModuleOff } from "@/components/smt-workspace/module-off";
import { AdminOnly } from "@/components/smt-workspace/admin-only";
import { TeamView } from "@/components/smt-workspace/team-view";
import { quarterStart } from "@/lib/smt/demo";
import { can } from "@/lib/smt/permissions";
import { scoreTeam, weeklyFlow } from "@/lib/smt/team-metrics";
import { loadTeam, workspaceContext } from "@/lib/smt/workspace";
import { weekStart } from "@/lib/smt/workspace-metrics";
import { addDays, daysBetween } from "@/lib/smt/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đội ngũ" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const quarterLabel = (start: string) => `Q${Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1}/${start.slice(0, 4)}`;

export default async function SmtTeamPage({ searchParams }: Props) {
  const ctx = await workspaceContext();
  if (!ctx.open) return <SmtMaintenance />;
  if (!ctx.modules.team) return <ModuleOff isAdmin={ctx.isAdmin} />;
  if (!ctx.demo && !ctx.actor) return <AdminOnly next="/smt/doi-ngu" what={{ vi: "Đánh giá kỹ sư", en: "team scores" }} />;
  // Kỹ sư (dữ liệu thật) chỉ thấy điểm của chính mình; điểm vẫn tính trên cả đội (trung vị khối lượng).
  const onlyMine = !ctx.demo && !can(ctx.actor, "team.viewAll") ? (ctx.actor?.engineerId ?? "none") : null;
  const team = await loadTeam(ctx);

  // Các quý có công việc, mới nhất trước.
  const first = team.tasks.reduce((m, x) => (x.assigned_on < m ? x.assigned_on : m), ctx.today);
  const quarters: string[] = [];
  for (let q = quarterStart(ctx.today); q >= quarterStart(first); q = quarterStart(addDays(q, -1))) quarters.push(q);
  // Mặc định: quý trước nếu quý hiện tại mới chạy chưa tới 30 ngày (ít việc xong, chưa đủ để đánh giá).
  const fallback = quarters.length > 1 && daysBetween(quarters[0], ctx.today) < 30 ? quarters[1] : quarters[0];
  const q = (await searchParams).q;
  const period = typeof q === "string" && (q === "all" || quarters.includes(q)) ? q : fallback;
  const from = period === "all" ? first : period;
  const qEnd = period === "all" ? ctx.today : addDays(quarterStart(addDays(period, 100)), -1);
  const to = qEnd > ctx.today ? ctx.today : qEnd;

  return (
    <TeamView
      scores={scoreTeam(team.engineers, team.tasks, from, to).filter((s) => !onlyMine || s.engineer.id === onlyMine)}
      engineers={onlyMine ? [] : team.engineers}
      periods={[...quarters.map((x) => ({ id: x, label: quarterLabel(x) })), { id: "all", label: "Toàn bộ" }]}
      period={period}
      from={from}
      to={to}
      flow={weeklyFlow(team.tasks, weekStart(from), to)}
      canEdit={ctx.canEdit && can(ctx.actor, "engineers.manage")}
    />
  );
}
