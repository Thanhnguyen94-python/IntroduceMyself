import { notFound } from "next/navigation";
import { getHub } from "@/lib/hubs/registry";
import { listHubDocs } from "@/lib/hubs/docs";
import { DocsSidebar, type SidebarGroup } from "@/components/hub/docs-sidebar";

type Props = { children: React.ReactNode; params: Promise<{ hub: string }> };

export default async function HubDocsLayout({ children, params }: Props) {
  const { hub: slug } = await params;
  const hub = await getHub(slug);
  if (!hub) notFound();

  const docs = await listHubDocs(hub.slug);

  // Nhóm tài liệu theo docSections khai báo trong hub.json; section lạ gom vào "Khác".
  const groups: SidebarGroup[] = hub.docSections.map((section) => ({
    id: section.id,
    icon: section.icon,
    title: section.title,
    docs: docs.filter((doc) => doc.section === section.id).map((doc) => ({ title: doc.title, path: doc.path }))
  }));
  const known = new Set(hub.docSections.map((it) => it.id));
  const others = docs.filter((doc) => !known.has(doc.section));
  if (others.length) {
    groups.push({
      id: "other",
      icon: "📎",
      title: { vi: "Khác", en: "Other" },
      docs: others.map((doc) => ({ title: doc.title, path: doc.path }))
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside>
        <DocsSidebar basePath={`/${hub.slug}/docs`} groups={groups.filter((group) => group.docs.length > 0)} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
