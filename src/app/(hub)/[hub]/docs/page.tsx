import Link from "next/link";
import { notFound } from "next/navigation";
import { getHub } from "@/lib/hubs/registry";
import { listHubDocs } from "@/lib/hubs/docs";
import { L } from "@/components/ui/localized";
import { Reveal } from "@/components/ui/reveal";

type Props = { params: Promise<{ hub: string }> };

export const metadata = { title: "Docs" };

export default async function HubDocsIndexPage({ params }: Props) {
  const { hub: slug } = await params;
  const hub = await getHub(slug);
  if (!hub) notFound();
  const docs = await listHubDocs(hub.slug);

  return (
    <div className="space-y-8">
      <Reveal>
        <p className="eyebrow">{hub.name}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          <L t={{ vi: "Tài liệu hướng dẫn", en: "Documentation" }} />
        </h1>
        <p className="muted mt-2 max-w-2xl">
          <L
            t={{
              vi: "Linh kiện, đấu dây, cấu hình và sửa lỗi: mọi thứ để bạn tự lắp và vận hành robot.",
              en: "Parts, wiring, configuration and troubleshooting: everything to build and run the robot yourself."
            }}
          />
        </p>
      </Reveal>

      {hub.docSections.map((section, sIdx) => {
        const items = docs.filter((doc) => doc.section === section.id);
        if (!items.length) return null;
        return (
          <section key={section.id}>
            <h2 className="text-lg font-bold">
              {section.icon} <L t={section.title} />
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {items.map((doc, idx) => (
                <Reveal key={doc.path} delay={(sIdx + idx) * 40}>
                  <Link href={doc.path} className="card group block h-full">
                    <p className="font-semibold group-hover:text-brand-600 dark:group-hover:text-brand-300">{doc.title} →</p>
                    {doc.description && <p className="muted mt-1 text-sm">{doc.description}</p>}
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
