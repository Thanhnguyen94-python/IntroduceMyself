import { AdminOnly } from "@/components/smt-workspace/admin-only";
import { TaskBoard } from "@/components/smt-workspace/task-board";
import { loadTeam, workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Công việc" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SmtTasksPage({ searchParams }: Props) {
  const ctx = await workspaceContext();
  if (!ctx.open) return null;
  if (!ctx.demo && !ctx.isAdmin) return <AdminOnly next="/smt/cong-viec" what={{ vi: "Công việc", en: "tasks" }} />;
  const sp = await searchParams;
  const team = await loadTeam(ctx);
  const editHint = ctx.isAdmin
    ? "Demo đang tính tạm trong bộ nhớ. Vào Admin → SMT → Dữ liệu demo để lưu vào database rồi giao việc thử."
    : "Chế độ xem: đây là đội kỹ sư mô phỏng. Chỉ quản lý (admin) mới giao / nghiệm thu việc.";

  return (
    <TaskBoard
      engineers={team.engineers}
      tasks={team.tasks}
      updates={team.updates}
      today={ctx.today}
      canEdit={ctx.canEdit}
      editHint={editHint}
      lines={ctx.settings.lines.map((l) => l.code)}
      initialLine={typeof sp.line === "string" ? sp.line.toUpperCase() : ""}
      initialEngineer={typeof sp.eng === "string" ? sp.eng : ""}
    />
  );
}
