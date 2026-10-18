"use client";

import { useMemo, useRef, useState } from "react";
import type { HubDocRecord, HubDocSection } from "@/lib/hubs/types";
import { renderMarkdown, slugify } from "@/lib/hubs/markdown";
import { normalizeMediaUrl } from "@/lib/smart-media";
import { Field, MediaUrlField } from "@/components/admin/fields";

type Props = {
  hubSlug: string;
  docs: HubDocRecord[];
  sections: HubDocSection[];
  onChange: (next: HubDocRecord[]) => void;
};

const SNIPPETS: Array<{ label: string; title: string; text: string; block?: boolean }> = [
  { label: "H2", title: "Tiêu đề mục (hiện trong mục lục)", text: "## Tiêu đề mục", block: true },
  { label: "H3", title: "Tiêu đề phụ", text: "### Tiêu đề phụ", block: true },
  { label: "B", title: "In đậm", text: "**chữ đậm**" },
  { label: "• List", title: "Danh sách", text: "- Ý thứ nhất\n- Ý thứ hai", block: true },
  { label: "1. List", title: "Danh sách đánh số", text: "1. Bước một\n2. Bước hai", block: true },
  { label: "Bảng", title: "Chèn bảng", text: "| Cột 1 | Cột 2 | Cột 3 |\n|---|---|---|\n| | | |", block: true },
  { label: "💡 Mẹo", title: "Khung mẹo", text: "> [!TIP]\n> Nội dung mẹo.", block: true },
  { label: "⚠️ Cảnh báo", title: "Khung cảnh báo", text: "> [!WARNING]\n> Nội dung cảnh báo.", block: true },
  { label: "⛔ Nguy hiểm", title: "Khung nguy hiểm", text: "> [!DANGER]\n> Nội dung nguy hiểm.", block: true },
  { label: "</> Code", title: "Khối code", text: "```cpp\n// code\n```", block: true }
];

function newDoc(section: string, order: number): HubDocRecord {
  return { slug: [section || "general", `bai-moi-${Date.now().toString(36)}`], title: "Bài viết mới", description: "", section, order, updated: new Date().toISOString().slice(0, 10), body: "## Mục 1\n\nNội dung...\n" };
}

export function DocsEditor({ hubSlug, docs, sections, onChange }: Props) {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<"split" | "edit" | "preview">("split");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaAlt, setMediaAlt] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const doc = docs[selected];
  const preview = useMemo(() => (doc ? renderMarkdown(doc.body).html : ""), [doc]);

  function update(patch: Partial<HubDocRecord>) {
    onChange(docs.map((it, i) => (i === selected ? { ...it, ...patch } : it)));
  }

  function insert(text: string, block = false) {
    const area = textRef.current;
    if (!doc || !area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const before = doc.body.slice(0, start);
    const after = doc.body.slice(end);
    const pad = block ? (before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "") : "";
    const tail = block ? "\n\n" : "";
    const nextBody = `${before}${pad}${text}${tail}${after}`;
    update({ body: nextBody });
    requestAnimationFrame(() => {
      area.focus();
      const pos = before.length + pad.length + text.length + tail.length;
      area.setSelectionRange(pos, pos);
    });
  }

  function insertMedia() {
    const url = normalizeMediaUrl(mediaUrl);
    if (!url) return;
    const alt = mediaAlt.trim() || "media";
    insert(`![${alt}](${url}${mediaCaption.trim() ? ` "${mediaCaption.trim().replace(/"/g, "'")}"` : ""})`, true);
    setMediaOpen(false);
    setMediaUrl("");
    setMediaAlt("");
    setMediaCaption("");
  }

  const sectionTitle = (id: string) => sections.find((s) => s.id === id)?.title.vi ?? id;
  const grouped = [...sections.map((s) => s.id), ...Array.from(new Set(docs.map((d) => d.section))).filter((id) => !sections.some((s) => s.id === id))];

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-3">
        {grouped.map((sectionId) => {
          const items = docs.map((d, i) => ({ d, i })).filter(({ d }) => d.section === sectionId);
          return (
            <div key={sectionId}>
              <p className="eyebrow mb-1">{sectionTitle(sectionId)}</p>
              <ul className="space-y-1">
                {items.map(({ d, i }) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setSelected(i)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${i === selected ? "bg-brand-600 text-white" : "border hover:border-brand-400"}`}
                      style={i === selected ? undefined : { borderColor: "var(--border)" }}
                    >
                      <span className="block truncate font-medium">{d.title}</span>
                      <span className={`block truncate font-mono text-[10px] ${i === selected ? "text-white/80" : "muted"}`}>{d.slug.join("/")}</span>
                    </button>
                  </li>
                ))}
                {!items.length && <li className="muted px-3 text-xs">Chưa có bài</li>}
              </ul>
            </div>
          );
        })}
        <button
          type="button"
          className="btn-ghost w-full border-dashed"
          onClick={() => {
            const section = doc?.section ?? sections[0]?.id ?? "general";
            const order = docs.filter((d) => d.section === section).length + 1;
            onChange([...docs, newDoc(section, order)]);
            setSelected(docs.length);
          }}
        >
          + Thêm bài viết
        </button>
      </aside>

      {doc ? (
        <section className="min-w-0 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Tiêu đề">
              <input value={doc.title} onChange={(e) => update({ title: e.target.value })} className="input" />
            </Field>
            <Field label="Đường dẫn" hint={`/${hubSlug}/docs/${doc.slug.join("/")}`}>
              <div className="flex gap-2">
                <input
                  value={doc.slug.join("/")}
                  onChange={(e) => update({ slug: e.target.value.toLowerCase().split("/").map((p) => p.replace(/[^a-z0-9-]/g, "")) })}
                  className="input font-mono"
                />
                <button
                  type="button"
                  className="btn-ghost shrink-0 px-2 text-xs"
                  title="Tạo đường dẫn từ tiêu đề"
                  onClick={() => update({ slug: [doc.section || "general", slugify(doc.title) || "bai-viet"] })}
                >
                  ↻ Từ tiêu đề
                </button>
              </div>
            </Field>
            <Field label="Mô tả ngắn (hiện ở mục lục)" className="md:col-span-2">
              <input value={doc.description} onChange={(e) => update({ description: e.target.value })} className="input" />
            </Field>
            <Field label="Nhóm (section)">
              <select value={doc.section} onChange={(e) => update({ section: e.target.value })} className="input">
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.title.vi}
                  </option>
                ))}
                {!sections.some((s) => s.id === doc.section) && <option value={doc.section}>{doc.section}</option>}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thứ tự">
                <input type="number" value={doc.order} onChange={(e) => update({ order: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="Ngày cập nhật">
                <input type="date" value={doc.updated ?? ""} onChange={(e) => update({ updated: e.target.value })} className="input" />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-xl border p-1.5" style={{ borderColor: "var(--border)" }}>
            {SNIPPETS.map((s) => (
              <button key={s.label} type="button" title={s.title} onClick={() => insert(s.text, s.block)} className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-brand-50 dark:hover:bg-slate-800">
                {s.label}
              </button>
            ))}
            <button type="button" onClick={() => setMediaOpen((v) => !v)} className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-semibold text-white">
              🖼 Ảnh / Video
            </button>
            <span className="ml-auto flex gap-1">
              {(["edit", "split", "preview"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`rounded-lg px-2 py-1 text-xs ${view === mode ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
                >
                  {mode === "edit" ? "Soạn" : mode === "split" ? "Song song" : "Xem trước"}
                </button>
              ))}
            </span>
          </div>

          {mediaOpen && (
            <div className="card space-y-3">
              <MediaUrlField value={mediaUrl} onChange={setMediaUrl} uploadFolder={`hubs/${hubSlug}`} label="Ảnh / video chèn vào bài" />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Mô tả ảnh (alt)" hint='Với link Drive là video/PDF, bắt đầu bằng chữ "video" hoặc "pdf" để hiện trình xem.'>
                  <input value={mediaAlt} onChange={(e) => setMediaAlt(e.target.value)} className="input" placeholder="Sơ đồ đấu dây" />
                </Field>
                <Field label="Chú thích dưới ảnh (tuỳ chọn)">
                  <input value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} className="input" placeholder="Hình 1. ..." />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setMediaOpen(false)}>
                  Huỷ
                </button>
                <button type="button" className="btn-primary" disabled={!mediaUrl.trim()} onClick={insertMedia}>
                  Chèn vào vị trí con trỏ
                </button>
              </div>
            </div>
          )}

          <div className={`grid gap-3 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
            {view !== "preview" && (
              <textarea
                ref={textRef}
                value={doc.body}
                onChange={(e) => update({ body: e.target.value })}
                className="input min-h-[520px] resize-y font-mono text-[13px] leading-relaxed"
                spellCheck={false}
              />
            )}
            {view !== "edit" && (
              <div className="card max-h-[720px] min-h-[520px] overflow-y-auto">
                <div className="doc-prose" dangerouslySetInnerHTML={{ __html: preview }} />
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <p className="muted text-xs">Mẹo: dán link YouTube/Drive trên 1 dòng riêng là tự nhúng trình xem.</p>
            <button
              type="button"
              className="text-xs font-semibold text-red-600 hover:underline"
              onClick={() => {
                if (!window.confirm(`Xoá bài "${doc.title}"?`)) return;
                onChange(docs.filter((_, i) => i !== selected));
                setSelected(Math.max(0, selected - 1));
              }}
            >
              Xoá bài này
            </button>
          </div>
        </section>
      ) : (
        <p className="muted text-sm">Chưa có tài liệu nào. Bấm “Thêm bài viết”.</p>
      )}
    </div>
  );
}
