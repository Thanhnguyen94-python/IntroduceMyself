import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { L } from "@/components/ui/localized";
import { LocalizedHtml } from "@/components/shop/localized-html";
import { HandbookCalculator } from "@/components/handbook/calculators";
import { PrintButton, ThresholdTable } from "@/components/handbook/entry-parts";
import { HandbookAdminPreview, HandbookMaintenance } from "@/components/handbook/handbook-notices";
import { handbookAccess } from "@/lib/handbook/gate";
import { listEntries } from "@/lib/handbook/store";
import { categoryOf } from "@/lib/handbook/types";
import { renderMarkdown } from "@/lib/hubs/markdown";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const access = await handbookAccess();
  if (!access.open) return { access, entries: [], entry: undefined };
  // Admin xem trước được cả mục nháp.
  const { entries } = await listEntries({ publishedOnly: !access.adminPreview });
  return { access, entries, entry: entries.find((e) => e.slug === slug) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entry } = await load((await params).slug);
  if (!entry) return { title: "Sổ tay SMT" };
  return { title: `${entry.symbol ? `${entry.symbol} – ` : ""}${entry.title.vi} · Sổ tay SMT`, description: entry.summary.vi };
}

export default async function HandbookEntryPage({ params }: Props) {
  const { access, entries, entry } = await load((await params).slug);
  if (!access.open) return <HandbookMaintenance />;
  if (!entry) notFound();

  const cat = categoryOf(entry.category);
  const body = { vi: renderMarkdown(entry.body.vi).html, en: entry.body.en ? renderMarkdown(entry.body.en).html : "" };
  const siblings = entries.filter((e) => e.category === entry.category);
  const idx = siblings.findIndex((e) => e.slug === entry.slug);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];
  const related = entry.related.map((s) => entries.find((e) => e.slug === s)).filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <article className="smt-print-area space-y-5">
      {access.adminPreview && <HandbookAdminPreview />}
      <nav className="smt-no-print flex flex-wrap items-center gap-2 text-sm">
        <Link href="/tai-lieu-ky-thuat" className="text-brand-600 dark:text-brand-300">
          <L t={{ vi: "Tài liệu", en: "Documents" }} />
        </Link>
        <span className="muted">/</span>
        <Link href="/tai-lieu-ky-thuat/so-tay" className="text-brand-600 dark:text-brand-300">
          <L t={{ vi: "Sổ tay SMT", en: "SMT handbook" }} />
        </Link>
        <span className="muted">/</span>
        <span className="font-medium">{entry.symbol || entry.slug}</span>
      </nav>

      <header className="card smt-block space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="eyebrow">
              {cat.icon} <L t={{ vi: cat.vi, en: cat.en }} />
              {entry.status === "draft" && " · NHÁP"}
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {entry.symbol && <span className="mr-2 font-mono text-brand-600 dark:text-brand-300">{entry.symbol}</span>}
              <L t={entry.title} />
            </h1>
            <p className="muted max-w-3xl">
              <L t={entry.summary} />
            </p>
          </div>
          <PrintButton />
        </div>
        {(entry.formula || entry.unit) && (
          <div className="rounded-xl border-l-4 px-4 py-3" style={{ borderColor: "var(--viz-1)", background: "var(--viz-1-wash)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide">
              <L t={{ vi: "Công thức", en: "Formula" }} />
              {entry.unit && <span className="muted ml-2 normal-case tracking-normal">· {entry.unit}</span>}
            </p>
            {entry.formula && <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">{entry.formula}</pre>}
          </div>
        )}
      </header>

      {entry.thresholds.length > 0 && (
        <section className="card smt-block space-y-3">
          <h2 className="text-lg font-semibold">
            <L t={{ vi: "Ngưỡng tham khảo", en: "Reference limits" }} />
          </h2>
          <ThresholdTable items={entry.thresholds} />
          <p className="muted text-xs">
            <L t={{ vi: "Giá trị tham khảo phổ biến – ưu tiên spec khách hàng, datasheet và bản tiêu chuẩn đang áp dụng.", en: "Common reference values — customer specs, datasheets and the applicable standard revision take priority." }} />
          </p>
        </section>
      )}

      {entry.calculator && <HandbookCalculator id={entry.calculator} />}

      {(body.vi || body.en) && (
        <section className="card smt-block">
          <LocalizedHtml html={body} className="doc-prose" />
        </section>
      )}

      {(entry.references.length > 0 || entry.tags.length > 0) && (
        <section className="card smt-block grid gap-4 sm:grid-cols-2">
          {entry.references.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold">
                <L t={{ vi: "Tiêu chuẩn / tài liệu tham chiếu", en: "Standards / references" }} />
              </h2>
              <ul className="muted mt-1 list-disc space-y-0.5 pl-5 text-sm">
                {entry.references.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {entry.tags.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold">Tags</h2>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {related.length > 0 && (
        <section className="smt-no-print space-y-2">
          <h2 className="font-semibold">
            <L t={{ vi: "Mục liên quan", en: "Related" }} />
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <Link key={r.slug} href={`/tai-lieu-ky-thuat/so-tay/${r.slug}`} className="card !p-3 hover:border-brand-400">
                <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-300">{r.symbol}</span>
                <span className="block text-sm font-medium leading-snug">
                  <L t={r.title} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav className="smt-no-print flex flex-wrap justify-between gap-2 text-sm" aria-label="Prev / next">
        {prev ? (
          <Link href={`/tai-lieu-ky-thuat/so-tay/${prev.slug}`} className="btn-ghost">
            ← {prev.symbol || <L t={prev.title} />}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/tai-lieu-ky-thuat/so-tay" className="btn-ghost">
          <L t={{ vi: "Mục lục sổ tay", en: "Handbook index" }} />
        </Link>
        {next ? (
          <Link href={`/tai-lieu-ky-thuat/so-tay/${next.slug}`} className="btn-ghost">
            {next.symbol || <L t={next.title} />} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
