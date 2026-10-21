import { SmtMaintenance } from "@/components/smt/smt-notices";
import { ModuleOff } from "@/components/smt-workspace/module-off";
import { AdminOnly } from "@/components/smt-workspace/admin-only";
import { TaskBoard } from "@/components/smt-workspace/task-board";
import { can } from "@/lib/smt/permissions";
import { loadTeam, workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Công việc" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SmtTasksPage({ searchParams }: Props) {
  const ctx = await workspaceContext();
  if (!ctx.open) return <SmtMaintenance />;
  if (!ctx.modules.team) return <ModuleOff isAdmin={ctx.isAdmin} />;
  if (!ctx.demo && !ctx.actor) return <AdminOnly next="/smt/cong-viec" what={{ vi: "Công việc", en: "tasks" }} />;
  const sp = await searchParams;
  const team = await loadTeam(ctx);
  const actor = ctx.actor;
  // Demo: chỉ admin / trợ lý thử thao tác (sân tập). Thực tế: theo quyền từng vai trò.
  const live = !ctx.demo;
  const perm = {
    manage: ctx.canEdit && can(actor, "tasks.manage"),
    review: ctx.canEdit && can(actor, "tasks.review"),
    engineerId: live ? (actor?.engineerId ?? null) : null,
    propose: live && can(actor, "tasks.propose") && Boolean(actor?.engineerId),
    demo: ctx.demo
  };
  const editHint = !actor
    ? "Chế độ xem: đây là đội kỹ sư mô phỏng. Đăng nhập để cập nhật việc của bạn."
    : ctx.demo && !ctx.stored
      ? "Demo đang tính tạm trong bộ nhớ. Vào Admin → SMT → Dữ liệu demo để lưu vào database rồi thử giao việc."
      : ctx.demo
        ? "Demo chỉ để xem. Chuyển sang Thực tế để cập nhật việc của bạn."
        : actor.role === "engineer" && !actor.engineerId
          ? "Tài khoản chưa gắn với hồ sơ kỹ sư. Nhờ quản lý gắn ở Quản trị → Tài khoản."
          : "";

  return (
    <TaskBoard
      engineers={team.engineers}
      tasks={team.tasks}
      updates={team.updates}
      today={ctx.today}
      perm={perm}
      editHint={editHint}
      lines={ctx.settings.lines.map((l) => l.code)}
      initialLine={typeof sp.line === "string" ? sp.line.toUpperCase() : ""}
      initialEngineer={typeof sp.eng === "string" ? sp.eng : perm.engineerId && !perm.manage ? perm.engineerId : ""}
      initialTitle={typeof sp.title === "string" ? sp.title.slice(0, 200) : ""}
    />
  );
}
