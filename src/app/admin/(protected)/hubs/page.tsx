import Link from "next/link";
import { hubVisibilityKey, listHubEntries } from "@/lib/hubs/registry";
import { isFileStorageMode } from "@/lib/hubs/db";
import { CreateHubForm } from "@/components/admin/create-hub-form";
import { listHubDocs } from "@/lib/hubs/docs";
import { readSiteVisibility } from "@/lib/site-visibility-store";
import { isPageEnabled } from "@/lib/site-visibility-types";

export const metadata = { title: "Project Hubs" };
export const dynamic = "force-dynamic";

const SOURCE_LABEL = {
  file: "Bản gốc trong repo",
  database: "Tạo trên web",
  "database-override": "Đã sửa trên web"
} as const;

export default async function AdminHubsPage() {
  const [entries, visibility] = await Promise.all([listHubEntries(), readSiteVisibility()]);
  const hubs = entries.map((it) => it.config);
  const fileMode = isFileStorageMode();
  const docsByHub = await Promise.all(hubs.map((hub) => listHubDocs(hub.slug)));

  return (
    <section className="space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Project Hubs</h1>
        <p className="muted text-sm">
          {fileMode
            ? "Chế độ local (chưa có Supabase): chỉnh sửa sẽ ghi thẳng vào src/content/hubs/<slug>/ để commit."
            : "Chỉnh sửa trên web lưu vào database và có hiệu lực ngay, không cần deploy."}{" "}
          Bật/tắt hub ở mục{" "}
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
                <span className="chip">{SOURCE_LABEL[entries[idx].source]}</span>
                <span className={`chip ${enabled ? "text-emerald-600" : "text-red-600"}`}>{enabled ? "● Đang hiển thị" : "● Đang ẩn (bảo trì)"}</span>
                <Link href={`/admin/hubs/${hub.slug}`} className="btn-primary px-3 py-1.5">
                  ✏️ Sửa
                </Link>
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
                    <th className="py-1 pr-3">Đường dẫn</th>
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
                      <td className="muted py-1.5 pr-3 font-mono text-xs">{doc.slug.join("/")}</td>
                      <td className="muted py-1.5 text-xs">{doc.updated ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}

      <CreateHubForm />
      <p className="muted px-1 text-xs">
        Cách cũ vẫn dùng được: <code>npm run new:hub -- don-nha &quot;Robot_don_nha&quot;</code> để tạo hub bằng file trong repo.
      </p>
    </section>
  );
}
