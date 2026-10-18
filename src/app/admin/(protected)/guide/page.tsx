import { promises as fs } from "fs";
import path from "path";
import { parseFrontmatter, renderMarkdown } from "@/lib/hubs/markdown";
import { DocToc } from "@/components/hub/doc-toc";

export const metadata = { title: "Hướng dẫn sử dụng" };

// Hiển thị docs/WEB_USAGE_GUIDE.md ngay trong Admin (sửa file đó là nội dung ở đây đổi theo).
export default async function AdminGuidePage() {
  const raw = await fs.readFile(path.join(process.cwd(), "docs", "WEB_USAGE_GUIDE.md"), "utf-8").catch(() => "");
  const { data, body } = parseFrontmatter(raw);
  const { html, toc } = renderMarkdown(body || "Không tìm thấy docs/WEB_USAGE_GUIDE.md");

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_220px]">
      <article className="card min-w-0">
        <h1 className="text-2xl font-extrabold">{data.title ?? "Hướng dẫn sử dụng"}</h1>
        {data.description && <p className="muted mt-1">{data.description}</p>}
        <div className="doc-prose mt-6" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      <aside className="hidden xl:block">
        <DocToc items={toc} />
      </aside>
    </div>
  );
}
