import { redirect } from "next/navigation";
import { L } from "@/components/ui/localized";
import { AccountsPanel, ChannelsPanel, DeleteRequestsPanel, SchedulePanel } from "@/components/smt-workspace/manage-panels";
import { selectRows } from "@/lib/data/table-store";
import { currentActor } from "@/lib/smt/accounts";
import { can } from "@/lib/smt/permissions";
import type { Engineer } from "@/lib/smt/team-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản trị SMT" };

// Quản trị SMT Workspace: admin thấy đủ 4 khối; trợ lý thấy quyền xoá của mình, lịch báo cáo, kênh chat.
// Cài đặt line / mục tiêu KPI vẫn ở Admin → Cài đặt SMT (chỉ admin).
export default async function SmtManagePage() {
  const actor = await currentActor();
  if (!actor) redirect("/smt/dang-nhap?next=/smt/quan-tri");
  if (!can(actor, "schedule.edit")) redirect("/smt");
  const admin = can(actor, "accounts.manage");
  const engineers = admin ? await selectRows<Engineer>("smt_engineers", { eq: { is_demo: false }, order: ["code", "asc"], limit: 500 }) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          <L t={{ vi: "Quản trị SMT Workspace", en: "SMT Workspace admin" }} />
        </h1>
        <p className="muted text-sm">
          {admin ? (
            <L t={{ vi: "Line, trạm, mục tiêu KPI vẫn sửa ở Admin → Cài đặt SMT.", en: "Lines, stations and KPI targets are still edited in Admin → SMT settings." }} />
          ) : (
            <L t={{ vi: "Bạn đang đăng nhập với quyền Trợ lý.", en: "You are signed in as Assistant." }} />
          )}
        </p>
      </div>
      {admin && <AccountsPanel engineers={engineers.filter((e) => e.active)} />}
      <DeleteRequestsPanel admin={admin} />
      <SchedulePanel admin={admin} />
      <ChannelsPanel />
    </div>
  );
}
