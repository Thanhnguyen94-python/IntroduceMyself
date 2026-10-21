import { redirect } from "next/navigation";
import { AutoReportDetail, AutoReportList } from "@/components/smt-workspace/auto-report-view";
import { L } from "@/components/ui/localized";
import { getRow } from "@/lib/data/table-store";
import { listReports, type AutoReport } from "@/lib/smt/auto-reports";
import { can } from "@/lib/smt/permissions";
import { workspaceContext } from "@/lib/smt/workspace";
import { readWorkspaceSettings } from "@/lib/smt/workspace-settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Báo cáo ngày / tuần" };

const DAYS = ["", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];

// Báo cáo tự động của đội (dữ liệu thật, chỉ người đã đăng nhập).
export default async function AutoReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await workspaceContext();
  if (!ctx.actor) redirect("/smt/dang-nhap?next=/smt/bao-cao-tu-dong");
  const [reports, settings] = await Promise.all([listReports(), readWorkspaceSettings()]);
  const id = (await searchParams).id;
  const selected = (typeof id === "string" && id ? await getRow<AutoReport>("smt_auto_reports", id) : null) ?? reports[0] ?? null;
  const r = settings.reports;
  const schedule = r.enabled ? `${r.dailyTimes.join(", ")}${r.weeklyEnabled ? ` · tuần: ${DAYS[r.weeklyDay]} ${r.weeklyTime}` : ""}` : "đang tắt";

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <AutoReportList reports={reports.map(({ id, kind, slot, period_from, period_to }) => ({ id, kind, slot, period_from, period_to }))} selected={selected?.id} canRun={can(ctx.actor, "schedule.edit")} schedule={schedule} />
      {selected ? (
        <AutoReportDetail report={selected} modules={ctx.liveModules} />
      ) : (
        <section className="card text-sm">
          <L t={{ vi: "Chưa có báo cáo nào. Báo cáo đầu tiên sẽ được tạo ở mốc chốt kế tiếp.", en: "No reports yet. The first one will be created at the next scheduled time." }} />
        </section>
      )}
    </div>
  );
}
