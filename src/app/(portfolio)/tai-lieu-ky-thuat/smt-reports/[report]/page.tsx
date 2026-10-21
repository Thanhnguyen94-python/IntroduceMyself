import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { L } from "@/components/ui/localized";
import { ReportViewer } from "@/components/smt/report-viewer";
import { SmtAdminPreview, SmtMaintenance } from "@/components/smt/smt-notices";
import { findTemplate } from "@/lib/smt/catalog";
import { smtAccess } from "@/lib/smt/gate";
import { loadPublicBundle, readSmtSettings } from "@/lib/smt/store";
import { sliceBundle } from "@/lib/smt/report-slice";

// /tai-lieu-ky-thuat/smt-reports/<mẫu>  ·  ?blank=1 = mẫu trống để in  ·  &print=1 = tự mở hộp thoại in
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ report: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const template = findTemplate((await params).report);
  if (!template) return {};
  return { title: `${template.title.vi} (${template.code})`, description: template.summary.vi };
}

export default async function SmtReportPage({ params, searchParams }: Props) {
  const template = findTemplate((await params).report);
  if (!template) notFound();
  const access = await smtAccess();
  if (!access.open) return <SmtMaintenance />;

  const sp = await searchParams;
  const blank = sp.blank === "1";
  const { bundle, settings, source, from, to } = await loadPublicBundle(await readSmtSettings());

  return (
    <section className="space-y-4">
      {access.adminPreview && <SmtAdminPreview />}
      <nav className="smt-no-print flex flex-wrap items-center gap-2 text-sm">
        <Link href="/tai-lieu-ky-thuat" className="text-brand-600 dark:text-brand-300">
          <L t={{ vi: "Tài liệu", en: "Documents" }} />
        </Link>
        <span className="muted">/</span>
        <Link href="/tai-lieu-ky-thuat/smt-reports" className="text-brand-600 dark:text-brand-300">
          <L t={{ vi: "Mẫu báo cáo SMT", en: "SMT report templates" }} />
        </Link>
        <span className="muted">/</span>
        <span className="font-medium">{template.code}</span>
        {template.slug === "8d" && (
          <Link href={blank ? "?" : "?blank=1"} className="chip ml-auto">
            {blank ? <L t={{ vi: "Xem ví dụ đã điền", en: "View filled example" }} /> : <L t={{ vi: "Xem mẫu trống", en: "View blank form" }} />}
          </Link>
        )}
      </nav>
      <ReportViewer slug={template.slug} bundle={sliceBundle(template.slug, bundle)} settings={settings} from={from} to={to} source={source} blank={blank} autoPrint={sp.print === "1"} />
    </section>
  );
}
