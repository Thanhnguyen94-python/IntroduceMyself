import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { SmtMaintenance } from "@/components/smt/smt-notices";
import { WorkspaceFooter, WorkspaceHeader } from "@/components/smt-workspace/workspace-chrome";
import { workspaceContext } from "@/lib/smt/workspace";

// Không gian SMT Workspace (/smt): tách riêng khỏi Portfolio (header/footer riêng), link qua lại được.
// Bật/tắt bằng công tắc "SMT Workspace" (key "smt-workspace") trong Admin → Nội dung & hiển thị.
// Mỗi trang con gọi lại workspaceContext() (đã cache trong request) và tự ẩn dữ liệu khi trang tắt.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "SMT Workspace · Mr Jay", template: "%s · SMT Workspace" },
  description: "Dashboard SMT: OEE, FPY, DPMO theo line, phân tích lỗi, báo cáo 8D/4M, quản lý công việc và đánh giá đội kỹ sư."
};

export default async function SmtWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await workspaceContext();
  return (
    <>
      <Suspense>
        <WorkspaceHeader mode={ctx.mode} liveAllowed={ctx.liveAllowed} isAdmin={ctx.isAdmin} stored={ctx.stored} demoTo={ctx.demo ? ctx.today : null} adminPreview={!ctx.enabled && ctx.isAdmin} />
      </Suspense>
      <main className="mx-auto max-w-7xl px-4 py-6">{ctx.open ? children : <SmtMaintenance />}</main>
      <WorkspaceFooter />
      <AnalyticsTracker hub="smt" />
    </>
  );
}
