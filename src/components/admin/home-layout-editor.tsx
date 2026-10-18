"use client";

import { useEffect, useState } from "react";
import type { ProjectItem, ProjectsData } from "@/lib/content/types";
import { DEFAULT_HOME_LAYOUT, HOME_SECTION_META, normalizeHomeLayout, type HomeLayoutConfig } from "@/lib/home-layout-types";

type Notice = { type: "success" | "error"; text: string } | null;

function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

export function HomeLayoutEditor() {
  const [layout, setLayout] = useState<HomeLayoutConfig>(DEFAULT_HOME_LAYOUT);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/site/home-layout", { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)),
      fetch("/api/projects", { cache: "no-store" }).then((res) => (res.ok ? res.json() : null))
    ])
      .then(([layoutPayload, projectsPayload]: [HomeLayoutConfig | null, ProjectsData | null]) => {
        setLayout(normalizeHomeLayout(layoutPayload));
        setProjects(projectsPayload?.items ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function update(next: HomeLayoutConfig) {
    setLayout(next);
    setDirty(true);
    setNotice(null);
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/admin/site/home-layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(layout)
    });
    setSaving(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setNotice({ type: "error", text: payload.message ?? "Lưu bố cục thất bại." });
      return;
    }
    setDirty(false);
    setNotice({ type: "success", text: "Đã lưu bố cục trang chủ." });
  }

  function toggleFeatured(slug: string) {
    const has = layout.featuredProjects.includes(slug);
    update({
      ...layout,
      featuredProjects: has ? layout.featuredProjects.filter((it) => it !== slug) : [...layout.featuredProjects, slug]
    });
  }

  if (loading) return <section className="card">Đang tải bố cục...</section>;

  return (
    <section className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Bố cục trang chủ</h1>
          <p className="muted text-sm">Kéo thả để đổi thứ tự, bật/tắt từng khối. Thay đổi áp dụng cho trang “/” sau khi lưu.</p>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="btn-ghost">
            ↗ Xem trang chủ
          </a>
          <button onClick={save} disabled={saving || !dirty} className="btn-primary">
            {saving ? "Đang lưu..." : dirty ? "Lưu thay đổi" : "Đã lưu"}
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.type === "success" ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ol className="space-y-2" aria-label="Các khối trang chủ">
          {layout.sections.map((section, index) => {
            const meta = HOME_SECTION_META[section.id];
            const isDragging = dragIndex === index;
            const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;
            return (
              <li
                key={section.id}
                draggable
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(index);
                }}
                onDragLeave={() => setOverIndex((cur) => (cur === index ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) update({ ...layout, sections: move(layout.sections, dragIndex, index) });
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={`card flex cursor-grab items-center gap-3 transition active:cursor-grabbing ${isDragging ? "opacity-40" : ""} ${
                  isOver ? "ring-2 ring-brand-500" : ""
                } ${section.enabled ? "" : "opacity-60"}`}
              >
                <span className="muted select-none text-lg" aria-hidden>
                  ⋮⋮
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{meta.label.vi}</p>
                  <p className="muted truncate text-xs">{meta.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                    style={{ borderColor: "var(--border)" }}
                    disabled={index === 0}
                    onClick={() => update({ ...layout, sections: move(layout.sections, index, index - 1) })}
                    aria-label={`Đưa ${meta.label.vi} lên`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                    style={{ borderColor: "var(--border)" }}
                    disabled={index === layout.sections.length - 1}
                    onClick={() => update({ ...layout, sections: move(layout.sections, index, index + 1) })}
                    aria-label={`Đưa ${meta.label.vi} xuống`}
                  >
                    ↓
                  </button>
                  <label className="ml-2 inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={section.enabled}
                      onChange={(e) =>
                        update({
                          ...layout,
                          sections: layout.sections.map((it) => (it.id === section.id ? { ...it, enabled: e.target.checked } : it))
                        })
                      }
                    />
                    <span className="relative h-6 w-11 rounded-full bg-slate-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-emerald-500 peer-checked:after:translate-x-5 dark:bg-slate-600" />
                    <span className="sr-only">Bật/tắt {meta.label.vi}</span>
                  </label>
                </div>
              </li>
            );
          })}
        </ol>

        <aside className="card h-fit space-y-3">
          <h2 className="font-semibold">Dự án nổi bật (Case Study)</h2>
          <p className="muted text-xs">Chọn và sắp xếp theo thứ tự bấm. Không chọn gì = tự lấy 3 dự án đầu tiên.</p>
          <ul className="space-y-1.5">
            {projects.map((project) => {
              const order = layout.featuredProjects.indexOf(project.slug);
              return (
                <li key={project.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                    <input type="checkbox" checked={order >= 0} onChange={() => toggleFeatured(project.slug)} />
                    <span className="min-w-0 flex-1 truncate">{project.title.vi || project.slug}</span>
                    {order >= 0 && <span className="rounded bg-brand-600 px-1.5 text-xs font-bold text-white">{order + 1}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </section>
  );
}
