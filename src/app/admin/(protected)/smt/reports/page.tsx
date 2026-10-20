import { ReportWorkbench } from "@/components/admin/smt/report-workbench";
import { findTemplate } from "@/lib/smt/catalog";

export const metadata = { title: "SMT · Xuất báo cáo" };

export default async function SmtReportsAdminPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const slug = findTemplate((await searchParams).r ?? "")?.slug ?? "oee-line-balance";
  return <ReportWorkbench initialSlug={slug} />;
}
