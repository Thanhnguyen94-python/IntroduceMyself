"use client";

import type { ProjectItem } from "@/lib/content/types";
import { resolveMedia } from "@/lib/media-url";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  items: ProjectItem[];
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAdd: () => void;
  onEdit: (item: ProjectItem) => void;
  onDelete: (id: string) => void;
};

export function ProjectsTab({
  search,
  setSearch,
  items,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  onAdd,
  onEdit,
  onDelete
}: Props) {
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tiêu đề, slug, category"
          className="w-full rounded-lg border px-3 py-2 text-sm md:w-80"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        />
        <button onClick={onAdd} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
          + Thêm mới
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
        <table className="min-w-full text-sm">
          <thead style={{ background: "color-mix(in srgb, var(--surface) 92%, #000 8%)" }}>
            <tr>
              <th className="px-3 py-2 text-left">Preview</th>
              <th className="px-3 py-2 text-left">Tiêu đề</th>
              <th className="px-3 py-2 text-left">Thể loại</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-3 py-2">
                  {item.gallery[0] ? (
                    (() => {
                      const media = resolveMedia(item.gallery[0]);
                      if (media.type === "youtube") {
                        return (
                          <iframe
                            src={`https://www.youtube.com/embed/${media.youtubeId}`}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="h-12 w-16 rounded-lg"
                          />
                        );
                      }

                      return <img src={item.gallery[0]} alt={item.title.vi} className="h-12 w-16 rounded object-cover" />;
                    })()
                  ) : (
                    <div className="h-12 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                  )}
                </td>
                <td className="px-3 py-2">
                  <p className="font-semibold">{item.title.vi}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{item.slug}</p>
                </td>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => onEdit(item)} className="rounded bg-brand-600 px-2 py-1 text-xs text-white">Sửa</button>
                    <button onClick={() => onDelete(item.id)} className="rounded bg-red-500 px-2 py-1 text-xs text-white">Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p style={{ color: "var(--muted)" }}>Trang {page}/{totalPages}</p>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={onPrevPage} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: "var(--border)" }}>Trước</button>
          <button disabled={page >= totalPages} onClick={onNextPage} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: "var(--border)" }}>Tiếp</button>
        </div>
      </div>
    </section>
  );
}
