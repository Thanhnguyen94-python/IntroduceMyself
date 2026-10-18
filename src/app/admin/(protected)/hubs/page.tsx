import Link from "next/link";
import { hubVisibilityKey, listHubs } from "@/lib/hubs/registry";
import { listHubDocs } from "@/lib/hubs/docs";
import { readSiteVisibility } from "@/lib/site-visibility-store";
import { isPageEnabled } from "@/lib/site-visibility-types";

export const metadata = { title: "Project Hubs" };
export const dynamic = "force-dynamic";

// Phase 1: liệt kê hub + tài liệu đọc từ src/content/hubs. Phase 2 sẽ thêm trình soạn Markdown lưu Supabase.
export default async function AdminHubsPage() {
  const [hubs, visibility] = await Promise.all([listHubs(), readSiteVisibility()]);
  const docsByHub = await Promise.all(hubs.map((hub) => listHubDocs(hub.slug)));

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Project Hubs</h1>
        <p className="muted text-sm">
          Mỗi hub là một thư mục trong <code>src/content/hubs/&lt;slug&gt;/</code>. Bật/tắt hub ở mục{" "}
          <Link href="/admin" className="text-brand-600 underline">
            Nội dung &amp; hiển thị
          </Link>
          .
        </p>
      </div>

      {hubs.map((hub, idx) => {
        const enabled = isPageEnabled(visibility, hubVisibilityKey(hub.slug));
        const docs = docsByHub[idx];
        return (
          <article key={hub.slug} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{hub.emoji}</span>
                <div>
                  <h2 className="text-lg font-bold">
                    {hub.name} <span className="muted text-sm font-normal">/{hub.slug}</span>
                  </h2>
                  <p className="muted text-sm">{hub.tagline.vi}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${enabled ? "text-emerald-600" : "text-red-600"}`}>{enabled ? "● Đang hiển thị" : "● Đang ẩn (bảo trì)"}</span>
                <a href={`/${hub.slug}`} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-1.5">
                  ↗ Mở hub
                </a>
                {hub.firmware && (
                  <Link href="/admin/firmware" className="btn-ghost px-3 py-1.5">
                    📦 Firmware ({hub.firmware.board})
                  </Link>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="muted text-left text-xs">
                    <th className="py-1 pr-3">Section</th>
                    <th className="py-1 pr-3">Tài liệu</th>
                    <th className="py-1 pr-3">File</th>
                    <th className="py-1">Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.path} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-1.5 pr-3">{doc.section}</td>
                      <td className="py-1.5 pr-3">
                        <a href={doc.path} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
                          {doc.title}
                        </a>
                      </td>
                      <td className="muted py-1.5 pr-3 font-mono text-xs">docs/{doc.slug.join("/")}.md</td>
                      <td className="muted py-1.5 text-xs">{doc.updated ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}

      <div className="card space-y-2 text-sm">
        <h2 className="font-semibold">➕ Thêm dự án mới (vd Robot_don_nha)</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Chạy <code>npm run new:hub -- don-nha &quot;Robot_don_nha&quot;</code> (tạo sẵn hub.json, 4 bài docs, thư mục ảnh, manifest).
          </li>
          <li>
            Sửa <code>src/content/hubs/don-nha/hub.json</code> và các file <code>docs/*.md</code>. Ảnh để ở{" "}
            <code>public/assets/images/hubs/don-nha/</code>.
          </li>
          <li>
            Tạo case study ở <b>Quản lý Dự án</b>, ghi slug vào <code>caseStudySlug</code> để Portfolio tự hiện link sang hub.
          </li>
          <li>
            Commit &amp; deploy → web tự sinh <code>/don-nha</code>, <code>/don-nha/docs</code>, <code>/don-nha/flash</code>.
          </li>
        </ol>
      </div>
    </section>
  );
}
