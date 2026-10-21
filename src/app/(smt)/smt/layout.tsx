import type { Metadata } from "next";
import { Suspense } from "react";
import { after } from "next/server";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { WorkspaceFooter, WorkspaceHeader } from "@/components/smt-workspace/workspace-chrome";
import { ensureDueReports } from "@/lib/smt/auto-reports";
import { pendingCount } from "@/lib/smt/delete-grants";
import { can } from "@/lib/smt/permissions";
import { workspaceContext } from "@/lib/smt/workspace";

// Không gian SMT Workspace (/smt): tách riêng khỏi Portfolio (header/footer riêng), link qua lại được.
// Bật/tắt bằng công tắc "SMT Workspace" (key "smt-workspace") trong Admin → Nội dung & hiển thị.
// Khi tắt: khách thấy "Đang bảo trì", đội nội bộ đã đăng nhập vẫn dùng bình thường.
// Mỗi trang con gọi lại workspaceContext() (đã cache trong request) và tự ẩn dữ liệu khi trang tắt.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "SMT Workspace · Mr Jay", template: "%s · SMT Workspace" },
  description: "Dashboard SMT: OEE, FPY, DPMO theo line, phân tích lỗi, báo cáo 8D/4M, quản lý công việc và đánh giá đội kỹ sư."
};

export default async function SmtWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await workspaceContext();
  const pending = can(ctx.actor, "delete.decide") ? await pendingCount().catch(() => 0) : 0;
  // Báo cáo tự động đến hạn: tạo sau khi đã trả trang (không làm chậm người xem).
  if (ctx.actor) after(() => ensureDueReports().catch((e) => console.error("[smt] auto report failed", e)));
  const user = ctx.actor ? { name: ctx.actor.name, role: ctx.actor.role } : null;
  return (
    <>
      <Suspense>
        <WorkspaceHeader mode={ctx.mode} liveAllowed={ctx.liveAllowed} user={user} stored={ctx.stored} demoTo={ctx.demo ? ctx.today : null} adminPreview={!ctx.enabled && Boolean(ctx.actor)} pending={pending} modules={ctx.modules} />
      </Suspense>
      {/* Mỗi trang tự kiểm tra ctx.open (trang Đăng nhập luôn mở để đội nội bộ vào được khi trang tắt với khách). */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <WorkspaceFooter />
      <AnalyticsTracker hub="smt" />
    </>
  );
}
