"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ProjectItem } from "@/lib/content/types";
import { HUB_BLOCK_LABELS, type HubConfig, type HubDocRecord, type HubSource } from "@/lib/hubs/types";
import { Field, LocalizedInput, LocalizedLinesInput, MediaUrlField, SortableList } from "@/components/admin/fields";
import { DocsEditor } from "@/components/admin/hub-editor/docs-editor";
import { MediaCarousel } from "@/components/ui/media-carousel";

type Tab = "general" | "media" | "layout" | "features" | "specs" | "sections" | "docs" | "updates";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "general", label: "📝 Thông tin chung" },
  { id: "media", label: "🖼 Ảnh / Video bìa" },
  { id: "layout", label: "🧩 Bố cục trang" },
  { id: "features", label: "✨ Tính năng" },
  { id: "specs", label: "📐 Thông số" },
  { id: "sections", label: "🗂 Nhóm tài liệu" },
  { id: "docs", label: "📚 Tài liệu" },
  { id: "updates", label: "🆕 Cập nhật" }
];

type LoadPayload = {
  storage: "file" | "database";
  source: HubSource;
  hasFile: boolean;
  docsSource: "file" | "database";
  config: HubConfig;
  docs: HubDocRecord[];
};

const emptyText = { vi: "", en: "" };

export function HubEditor({ slug }: { slug: string }) {
  const [tab, setTab] = useState<Tab>("general");
  const [data, setData] = useState<LoadPayload | null>(null);
  const [config, setConfig] = useState<HubConfig | null>(null);
  const [docs, setDocs] = useState<HubDocRecord[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/hubs/${slug}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as (LoadPayload & { message?: string }) | null;
    if (!response.ok || !payload?.config) {
      setNotice({ type: "error", text: payload?.message ?? "Không tải được hub." });
      return;
    }
    setData(payload);
    setConfig(payload.config);
    setDocs(payload.docs);
    setDirty(false);
  }, [slug]);

  useEffect(() => {
    load();
    fetch("/api/projects", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { items?: ProjectItem[] } | null) => setProjects(payload?.items ?? []))
      .catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function patch(next: Partial<HubConfig>) {
    setConfig((prev) => (prev ? { ...prev, ...next } : prev));
    setDirty(true);
    setNotice(null);
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    const response = await fetch(`/api/admin/hubs/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, docs })
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setSaving(false);
    if (!response.ok) {
      setNotice({ type: "error", text: payload.message ?? "Lưu thất bại." });
      return;
    }
    setNotice({
      type: "success",
      text: data?.storage === "file" ? "Đã lưu vào file trong repo (src/content/hubs). Nhớ commit để deploy." : "Đã lưu. Trang hub cập nhật ngay, không cần deploy."
    });
    await load();
  }

  async function resetToFile() {
    const removed = data?.storage === "file" || !data?.hasFile;
    const question = removed
      ? data?.storage === "file"
        ? `Xoá thư mục src/content/hubs/${slug}? (khôi phục được bằng git)`
        : `Hub "${slug}" chỉ có trên database. Xoá hẳn hub này?`
      : "Bỏ toàn bộ chỉnh sửa trên web và quay về bản gốc trong repo (hub.json + docs/*.md)?";
    if (!window.confirm(question)) return;
    const response = await fetch(`/api/admin/hubs/${slug}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { message?: string; removed?: boolean };
    if (!response.ok) {
      setNotice({ type: "error", text: payload.message ?? "Không thực hiện được." });
      return;
    }
    if (payload.removed) window.location.href = "/admin/hubs";
    else await load();
  }

  if (!config || !data) {
    return <section className="card">{notice ? <p className="text-red-600">{notice.text}</p> : "Đang tải hub..."}</section>;
  }

  const sourceLabel: Record<HubSource, string> = {
    file: "Đang dùng bản gốc trong repo",
    database: "Hub tạo trên web (database)",
    "database-override": "Đã sửa trên web (ghi đè bản trong repo)"
  };

  return (
    <section className="space-y-4">
      <div className="card sticky top-[64px] z-30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-3xl">{config.emoji}</span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">
              {config.name} <span className="muted text-sm font-normal">/{slug}</span>
            </h1>
            <p className="muted text-xs">
              {data.storage === "file" ? "Chế độ local: lưu thẳng vào file" : sourceLabel[data.source]}
              {dirty && <span className="ml-2 font-semibold text-amber-600">● Chưa lưu</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/hubs" className="btn-ghost px-3">
            ← Danh sách
          </Link>
          <a href={`/${slug}`} target="_blank" rel="noreferrer" className="btn-ghost px-3">
            ↗ Xem trang
          </a>
          <button onClick={save} disabled={saving || !dirty} className="btn-primary">
            {saving ? "Đang lưu..." : dirty ? "💾 Lưu thay đổi" : "Đã lưu"}
          </button>
        </div>
      </div>

      {notice && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${notice.type === "success" ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}`}>
          {notice.text}
        </div>
      )}

      <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="Hub editor">
        {TABS.map((it) => (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium ${tab === it.id ? "bg-brand-600 text-white" : "border hover:border-brand-400"}`}
            style={tab === it.id ? undefined : { borderColor: "var(--border)" }}
          >
            {it.label}
            {it.id === "docs" && <span className="ml-1 opacity-70">({docs.length})</span>}
          </button>
        ))}
      </nav>

      <div className="card space-y-4">
        {tab === "general" && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Tên dự án" className="md:col-span-2">
                <input value={config.name} onChange={(e) => patch({ name: e.target.value })} className="input" />
              </Field>
              <Field label="Biểu tượng (emoji)">
                <input value={config.emoji} onChange={(e) => patch({ emoji: e.target.value })} className="input" maxLength={4} />
              </Field>
              <Field label="Trạng thái">
                <select value={config.status} onChange={(e) => patch({ status: e.target.value as HubConfig["status"] })} className="input">
                  <option value="alpha">Alpha (đang làm)</option>
                  <option value="beta">Beta (dùng thử)</option>
                  <option value="stable">Stable (ổn định)</option>
                </select>
              </Field>
            </div>
            <LocalizedInput label="Câu giới thiệu ngắn (tagline)" value={config.tagline} onChange={(tagline) => patch({ tagline })} />
            <LocalizedInput label="Mô tả" value={config.description} onChange={(description) => patch({ description })} multiline />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Case study liên kết (Portfolio)" hint="Trang case study sẽ hiện nút “Mở Project Hub”.">
                <select value={config.caseStudySlug ?? ""} onChange={(e) => patch({ caseStudySlug: e.target.value || undefined })} className="input">
                  <option value="">(không liên kết)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.title.vi || p.slug}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Thứ tự trong menu chuyển hub">
                <input type="number" value={config.order} onChange={(e) => patch({ order: Number(e.target.value) })} className="input" />
              </Field>
            </div>

            <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(config.firmware)}
                  onChange={(e) =>
                    patch({ firmware: e.target.checked ? { board: slug, chip: "ESP32-S3", fallbackManifest: `/firmware/${slug}/manifest.json` } : undefined })
                  }
                />
                Có trang Nạp firmware (/{slug}/flash)
              </label>
              {config.firmware && (
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Board" hint="Trùng cột “board” khi phát hành ở Admin → Phát hành firmware.">
                    <input value={config.firmware.board} onChange={(e) => patch({ firmware: { ...config.firmware!, board: e.target.value.trim() } })} className="input font-mono" />
                  </Field>
                  <Field label="Chip">
                    <input value={config.firmware.chip} onChange={(e) => patch({ firmware: { ...config.firmware!, chip: e.target.value } })} className="input" />
                  </Field>
                  <Field label="Manifest dự phòng" hint="Dùng khi chưa có bản phát hành nào.">
                    <input
                      value={config.firmware.fallbackManifest ?? ""}
                      onChange={(e) => patch({ firmware: { ...config.firmware!, fallbackManifest: e.target.value || undefined } })}
                      className="input font-mono"
                    />
                  </Field>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "media" && (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-3">
                <p className="muted text-sm">
                  Thêm nhiều ảnh/video để tạo slideshow tự chuyển. Dán link chia sẻ YouTube (youtu.be, watch?v=, shorts) hoặc Google Drive, hoặc upload file.
                </p>
                <SortableList
                  items={config.media}
                  onChange={(media) => patch({ media })}
                  createItem={() => ({ url: "", kind: "auto" as const, caption: { ...emptyText } })}
                  addLabel="+ Thêm ảnh / video"
                  itemTitle={(item) => item.caption?.vi || item.url || "(chưa có link)"}
                  renderItem={(item, update) => (
                    <div className="space-y-3">
                      <MediaUrlField
                        value={item.url}
                        onChange={(url) => update({ ...item, url })}
                        kind={item.kind}
                        onKindChange={(kind) => update({ ...item, kind })}
                        uploadFolder={`hubs/${slug}`}
                      />
                      <LocalizedInput label="Chú thích (tuỳ chọn)" value={item.caption} onChange={(caption) => update({ ...item, caption })} />
                    </div>
                  )}
                />
              </div>
              <aside className="space-y-3">
                <p className="text-sm font-semibold">Xem trước</p>
                {config.media.filter((m) => m.url).length ? (
                  <MediaCarousel items={config.media.filter((m) => m.url)} interval={config.mediaInterval} autoplayVideo={config.autoplayVideo} alt={config.name} />
                ) : (
                  <div className="muted grid aspect-[4/3] place-items-center rounded-3xl border text-sm" style={{ borderColor: "var(--border)" }}>
                    Chưa có ảnh/video
                  </div>
                )}
                <Field label={`Tự chuyển sau: ${config.mediaInterval} giây`}>
                  <input type="range" min={2} max={15} value={config.mediaInterval} onChange={(e) => patch({ mediaInterval: Number(e.target.value) })} className="w-full" />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={config.autoplayVideo} onChange={(e) => patch({ autoplayVideo: e.target.checked })} />
                  Tự phát video (tắt tiếng) khi tới slide video
                </label>
                <p className="muted text-xs">Slideshow tạm dừng khi rê chuột vào hoặc khi người xem đang phát video.</p>
              </aside>
            </div>
          </>
        )}

        {tab === "layout" && (
          <div className="space-y-3">
            <p className="muted text-sm">Phần đầu trang (tên, mô tả, slideshow) luôn ở trên cùng. Kéo thả để sắp xếp các khối bên dưới, bỏ tick để ẩn.</p>
            <SortableList
              items={config.layout}
              onChange={(layout) => patch({ layout })}
              itemTitle={(block) => HUB_BLOCK_LABELS[block.id]}
              renderItem={(block, update) => (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={block.enabled} onChange={(e) => update({ ...block, enabled: e.target.checked })} />
                  {block.enabled ? "Đang hiển thị" : "Đang ẩn"}
                </label>
              )}
            />
          </div>
        )}

        {tab === "features" && (
          <SortableList
            items={config.features}
            onChange={(features) => patch({ features })}
            createItem={() => ({ icon: "✨", title: { ...emptyText }, text: { ...emptyText } })}
            addLabel="+ Thêm tính năng"
            itemTitle={(item) => `${item.icon} ${item.title.vi || "(chưa đặt tên)"}`}
            renderItem={(item, update) => (
              <div className="grid gap-3 md:grid-cols-[90px_minmax(0,1fr)]">
                <Field label="Icon">
                  <input value={item.icon} onChange={(e) => update({ ...item, icon: e.target.value })} className="input text-center text-lg" maxLength={4} />
                </Field>
                <div className="space-y-3">
                  <LocalizedInput label="Tên tính năng" value={item.title} onChange={(title) => update({ ...item, title })} />
                  <LocalizedInput label="Mô tả" value={item.text} onChange={(text) => update({ ...item, text })} multiline />
                </div>
              </div>
            )}
          />
        )}

        {tab === "specs" && (
          <SortableList
            items={config.specs}
            onChange={(specs) => patch({ specs })}
            createItem={() => ({ label: { ...emptyText }, value: "" })}
            addLabel="+ Thêm thông số"
            itemTitle={(item) => `${item.label.vi || "(tên)"}: ${item.value}`}
            renderItem={(item, update) => (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                <LocalizedInput label="Tên thông số" value={item.label} onChange={(label) => update({ ...item, label })} />
                <Field label="Giá trị">
                  <input value={item.value} onChange={(e) => update({ ...item, value: e.target.value })} className="input" />
                </Field>
              </div>
            )}
          />
        )}

        {tab === "sections" && (
          <div className="space-y-3">
            <p className="muted text-sm">Nhóm tài liệu hiện trên menu trái của trang Docs, theo thứ tự này. Mã nhóm (id) dùng để gán bài viết vào nhóm.</p>
            <SortableList
              items={config.docSections}
              onChange={(docSections) => patch({ docSections })}
              createItem={() => ({ id: `nhom-${config.docSections.length + 1}`, icon: "📄", title: { vi: "Nhóm mới", en: "New section" } })}
              addLabel="+ Thêm nhóm"
              itemTitle={(item) => `${item.icon ?? ""} ${item.title.vi} (${docs.filter((d) => d.section === item.id).length} bài)`}
              renderItem={(item, update) => (
                <div className="grid gap-3 md:grid-cols-[90px_180px_minmax(0,1fr)]">
                  <Field label="Icon">
                    <input value={item.icon ?? ""} onChange={(e) => update({ ...item, icon: e.target.value })} className="input text-center text-lg" maxLength={4} />
                  </Field>
                  <Field label="Mã nhóm (id)">
                    <input
                      value={item.id}
                      onChange={(e) => {
                        const id = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                        // Đổi mã nhóm -> chuyển luôn các bài đang thuộc nhóm cũ.
                        setDocs((prev) => prev.map((d) => (d.section === item.id ? { ...d, section: id } : d)));
                        update({ ...item, id });
                      }}
                      className="input font-mono"
                    />
                  </Field>
                  <LocalizedInput label="Tên nhóm" value={item.title} onChange={(title) => update({ ...item, title })} />
                </div>
              )}
            />
          </div>
        )}

        {tab === "docs" && (
          <DocsEditor
            hubSlug={slug}
            docs={docs}
            sections={config.docSections}
            onChange={(next) => {
              setDocs(next);
              setDirty(true);
              setNotice(null);
            }}
          />
        )}

        {tab === "updates" && (
          <div className="space-y-3">
            <p className="muted text-sm">Bản đầu tiên trong danh sách được xem là “mới nhất” và hiện trên trang tổng quan.</p>
            <SortableList
              items={config.updates}
              onChange={(updates) => patch({ updates })}
              createItem={() => ({ version: "", date: new Date().toISOString().slice(0, 10), title: { ...emptyText }, notes: { vi: [], en: [] } })}
              addLabel="+ Thêm bản cập nhật"
              itemTitle={(item) => `v${item.version || "?"} · ${item.title.vi || ""}`}
              renderItem={(item, update) => (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Phiên bản">
                      <input value={item.version} onChange={(e) => update({ ...item, version: e.target.value.replace(/^v/i, "") })} className="input" placeholder="2.3.4" />
                    </Field>
                    <Field label="Ngày">
                      <input type="date" value={item.date} onChange={(e) => update({ ...item, date: e.target.value })} className="input" />
                    </Field>
                    <Field label="Kênh">
                      <select value={item.channel ?? "stable"} onChange={(e) => update({ ...item, channel: e.target.value as "stable" | "beta" })} className="input">
                        <option value="stable">Stable</option>
                        <option value="beta">Beta</option>
                      </select>
                    </Field>
                  </div>
                  <LocalizedInput label="Tiêu đề" value={item.title} onChange={(title) => update({ ...item, title })} />
                  <LocalizedLinesInput label="Nội dung thay đổi" value={item.notes} onChange={(notes) => update({ ...item, notes })} />
                </div>
              )}
            />
          </div>
        )}
      </div>

      {data.storage === "database" && (data.source !== "file" || data.docsSource === "database") && (
        <div className="card flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="muted">
            {data.hasFile ? "Muốn bỏ hết chỉnh sửa trên web và dùng lại bản gốc trong repo?" : "Hub này chỉ tồn tại trên database."}
          </p>
          <button onClick={resetToFile} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
            {data.hasFile ? "↺ Khôi phục bản gốc" : "🗑 Xoá hub"}
          </button>
        </div>
      )}
      {data.storage === "file" && (
        <div className="card flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="muted">Chế độ local: mọi thay đổi ghi vào src/content/hubs/{slug}. Dùng git để xem lại/khôi phục.</p>
          <button onClick={resetToFile} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600">
            🗑 Xoá thư mục hub
          </button>
        </div>
      )}
    </section>
  );
}
