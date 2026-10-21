import { SmtMaintenance } from "@/components/smt/smt-notices";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { L } from "@/components/ui/localized";
import { ReportViewer } from "@/components/smt/report-viewer";
import { findTemplate } from "@/lib/smt/catalog";
import { sliceBundle } from "@/lib/smt/report-slice";
import { loadReportBundle, workspaceContext } from "@/lib/smt/workspace";
import { addDays } from "@/lib/smt/types";

// /smt/bao-cao/<mẫu>  ·  8D: ?id=<id> mở đúng báo cáo
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ report: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const template = findTemplate((await params).report);
  return template ? { title: `${template.title.vi} (${template.code})` } : {};
}

export default async function SmtWorkspaceReportPage({ params, searchParams }: Props) {
  const template = findTemplate((await params).report);
  if (!template) notFound();
  const ctx = await workspaceContext();
  if (!ctx.open) return <SmtMaintenance />;
  const sp = await searchParams;
  const to = ctx.today;
  const from = addDays(to, -29);
  const bundle = await loadReportBundle(ctx, from, to);

  return (
    <section className="space-y-4">
      <nav className="smt-no-print flex flex-wrap items-center gap-2 text-sm">
        <Link href="/smt/bao-cao" className="text-brand-600 dark:text-brand-300">
          <L t={{ vi: "Báo cáo", en: "Reports" }} />
        </Link>
        <span className="muted">/</span>
        <span className="font-medium">{template.code}</span>
      </nav>
      <ReportViewer slug={template.slug} bundle={sliceBundle(template.slug, bundle)} settings={ctx.settings} from={from} to={to} source={ctx.mode} initial8d={typeof sp.id === "string" ? sp.id : undefined} />
    </section>
  );
}
