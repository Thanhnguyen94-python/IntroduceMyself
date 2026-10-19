import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHub } from "@/lib/hubs/registry";
import { getHubDoc, listHubDocs } from "@/lib/hubs/docs";
import { DocToc } from "@/components/hub/doc-toc";
import { DocComments } from "@/components/hub/doc-comments";
import { L } from "@/components/ui/localized";

type Props = { params: Promise<{ hub: string; slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hub, slug } = await params;
  const doc = await getHubDoc(hub, slug);
  return doc ? { title: doc.title, description: doc.description } : {};
}

export default async function HubDocPage({ params }: Props) {
  const { hub: hubSlug, slug } = await params;
  const hub = await getHub(hubSlug);
  if (!hub) notFound();
  const doc = await getHubDoc(hub.slug, slug);
  if (!doc) notFound();

  const all = await listHubDocs(hub.slug);
  const index = all.findIndex((it) => it.path === doc.path);
  const prev = index > 0 ? all[index - 1] : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;
  const section = hub.docSections.find((it) => it.id === doc.section);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_220px]">
      <article className="min-w-0">
        <nav className="muted mb-4 flex flex-wrap items-center gap-1 text-xs" aria-label="Breadcrumb">
          <Link href={`/${hub.slug}/docs`} className="hover:text-brand-600">
            <L t={{ vi: "Tài liệu", en: "Docs" }} />
          </Link>
          {section && (
            <>
              <span>/</span>
              <span>
                <L t={section.title} />
              </span>
            </>
          )}
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight">{doc.title}</h1>
        {doc.description && <p className="muted mt-2 text-lg">{doc.description}</p>}
        {doc.updated && (
          <p className="muted mt-2 text-xs">
            <L t={{ vi: "Cập nhật", en: "Updated" }} />: {doc.updated}
          </p>
        )}

        <div className="doc-prose mt-8" dangerouslySetInnerHTML={{ __html: doc.html }} />

        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link href={prev.path} className="card group">
              <p className="muted text-xs">
                ← <L t={{ vi: "Bài trước", en: "Previous" }} />
              </p>
              <p className="mt-1 font-semibold group-hover:text-brand-600">{prev.title}</p>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={next.path} className="card group text-right">
              <p className="muted text-xs">
                <L t={{ vi: "Bài tiếp", en: "Next" }} /> →
              </p>
              <p className="mt-1 font-semibold group-hover:text-brand-600">{next.title}</p>
            </Link>
          )}
        </div>
        <DocComments hub={hub.slug} path={doc.path} />
      </article>
      <aside className="hidden xl:block">
        <DocToc items={doc.toc} />
      </aside>
    </div>
  );
}
