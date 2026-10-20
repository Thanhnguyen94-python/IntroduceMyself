"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AutoTextarea, Field, LocalizedInput } from "@/components/admin/fields";
import { renderMarkdown } from "@/lib/hubs/markdown";
import { HANDBOOK_CALCULATORS, HANDBOOK_CATEGORIES, type HandbookEntry, type Threshold } from "@/lib/handbook/types";

const LEVELS: Array<{ id: Threshold["level"]; label: string }> = [
  { id: "good", label: "✓ Tốt" },
  { id: "warning", label: "! Lưu ý" },
  { id: "critical", label: "✕ Nguy cơ" },
  { id: "info", label: "ℹ Tham khảo" }
];

export function HandbookEditor({ initial }: { initial: HandbookEntry }) {
  const router = useRouter();
  const [e, setE] = useState<HandbookEntry>(initial);
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [view, setView] = useState<"split" | "edit" | "preview">("split");
  const [all, setAll] = useState<HandbookEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Ô nhập dạng chữ cho danh sách (giữ nguyên lúc đang gõ dấu phẩy / xuống dòng).
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [relatedText, setRelatedText] = useState(initial.related.join(", "));
  const [refsText, setRefsText] = useState(initial.references.join("\n"));

  useEffect(() => {
    fetch("/api/admin/handbook", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { entries?: HandbookEntry[] }) => setAll(d.entries ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const set = (patch: Partial<HandbookEntry>) => {
    setE((cur) => ({ ...cur, ...patch }));
    setDirty(true);
  };
  const preview = useMemo(() => renderMarkdown(e.body[lang] || (lang === "en" ? "_(Chưa có bản tiếng Anh – web sẽ hiện bản tiếng Việt)_" : "")).html, [e.body, lang]);
  const relatedSlugs = relatedText.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = relatedSlugs.filter((s) => all.length && !all.some((x) => x.slug === s));

  async function save() {
    setSaving(true);
    setMessage(null);
    const entry: HandbookEntry = {
      ...e,
      tags: tagsText.split(",").map((s) => s.trim()).filter(Boolean),
      related: relatedSlugs,
      references: refsText.split("\n").map((s) => s.trim()).filter(Boolean)
    };
    try {
      const res = await fetch("/api/admin/handbook", {
        method: e.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.id ? { id: e.id, entry } : { entry })
      });
      const payload = (await res.json()) as { entry?: HandbookEntry; message?: string };
      if (!res.ok || !payload.entry) throw new Error(payload.message ?? "Lưu thất bại.");
      setE(payload.entry);
      setDirty(false);
      setMessage({ ok: true, text: "Đã lưu." });
      if (!e.id) router.replace(`/admin/smt/handbook/${payload.entry.id}`);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Lưu thất bại." });
    } finally {
      setSaving(false);
    }
  }

  const moveThreshold = (i: number, d: -1 | 1) => {
    const list = [...e.thresholds];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set({ thresholds: list });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/smt/handbook" className="text-sm text-brand-600 dark:text-brand-300">
            ← Danh sách sổ tay
          </Link>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">{e.id ? `${e.symbol ? `${e.symbol} · ` : ""}${e.title.vi || "(chưa có tiêu đề)"}` : "Mục sổ tay mới"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {e.id && (
            <a href={`/tai-lieu-ky-thuat/so-tay/${e.slug}`} target="_blank" rel="noreferrer" className="btn-ghost">
              ↗ Xem trên web
            </a>
          )}
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Đang lưu…" : dirty ? "💾 Lưu *" : "💾 Lưu"}
          </button>
        </div>
      </div>
      {message && <p className={`rounded-xl border px-3 py-2 text-sm ${message.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-red-300 bg-red-50 text-red-700"}`} role="status">{message.text}</p>}

      <div className="card space-y-3">
        <LocalizedInput label="Tiêu đề *" value={e.title} onChange={(title) => set({ title })} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Ký hiệu" hint="Hiện to trên thẻ (Cpk, TAL…)">
            <input className="input font-mono" value={e.symbol} onChange={(ev) => set({ symbol: ev.target.value })} />
          </Field>
          <Field label="Đường dẫn" hint="Bỏ trống: tự tạo từ tiêu đề">
            <input className="input font-mono" value={e.slug} onChange={(ev) => set({ slug: ev.target.value })} placeholder="vd: cp-cpk" />
          </Field>
          <Field label="Nhóm">
            <select className="input" value={e.category} onChange={(ev) => set({ category: ev.target.value as HandbookEntry["category"] })}>
              {HANDBOOK_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.vi}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Thứ tự trong nhóm" hint="Nhỏ đứng trước">
            <input type="number" className="input" value={e.sortOrder} onChange={(ev) => set({ sortOrder: Number(ev.target.value) })} />
          </Field>
          <Field label="Trạng thái">
            <select className="input" value={e.status} onChange={(ev) => set({ status: ev.target.value as HandbookEntry["status"] })}>
              <option value="published">✓ Hiện công khai</option>
              <option value="draft">◌ Nháp (chỉ admin)</option>
            </select>
          </Field>
        </div>
        <LocalizedInput label="Tóm tắt 1–2 câu" value={e.summary} onChange={(summary) => set({ summary })} multiline />
      </div>

      <div className="card grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
        <Field label="Công thức" hint="Mỗi dòng 1 công thức. Dùng ký tự × ÷ ≥ ≤ σ μ Σ ₁ ² trực tiếp.">
          <AutoTextarea className="font-mono" value={e.formula} onChange={(ev) => set({ formula: ev.target.value })} minHeight={70} />
        </Field>
        <Field label="Đơn vị">
          <input className="input" value={e.unit} onChange={(ev) => set({ unit: ev.target.value })} placeholder="%, °C, ppm…" />
        </Field>
        <Field label="Máy tính kèm theo">
          <select className="input" value={e.calculator} onChange={(ev) => set({ calculator: ev.target.value as HandbookEntry["calculator"] })}>
            <option value="">— Không —</option>
            {HANDBOOK_CALCULATORS.map((c) => (
              <option key={c.id} value={c.id}>
                🧮 {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Ngưỡng tham khảo</h2>
          <button type="button" className="text-sm font-semibold text-brand-600 dark:text-brand-300" onClick={() => set({ thresholds: [...e.thresholds, { level: "info", range: "", meaning: "" }] })}>
            + Thêm dòng
          </button>
        </div>
        {e.thresholds.map((th, i) => {
          const update = (patch: Partial<Threshold>) => set({ thresholds: e.thresholds.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="grid items-center gap-2 sm:grid-cols-[140px_1fr_2fr_auto]">
              <select className="input" value={th.level} onChange={(ev) => update({ level: ev.target.value as Threshold["level"] })} aria-label="Mức">
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <input className="input" placeholder="Giá trị / khoảng (VD ≥ 1,33)" value={th.range} onChange={(ev) => update({ range: ev.target.value })} />
              <input className="input" placeholder="Ý nghĩa" value={th.meaning} onChange={(ev) => update({ meaning: ev.target.value })} />
              <span className="flex gap-2 text-sm">
                <button type="button" aria-label="Lên" onClick={() => moveThreshold(i, -1)}>↑</button>
                <button type="button" aria-label="Xuống" onClick={() => moveThreshold(i, 1)}>↓</button>
                <button type="button" aria-label="Xoá" className="text-red-600" onClick={() => set({ thresholds: e.thresholds.filter((_, j) => j !== i) })}>
                  ✕
                </button>
              </span>
            </div>
          );
        })}
        {!e.thresholds.length && <p className="muted text-sm">Chưa có ngưỡng.</p>}
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Nội dung chi tiết (Markdown)</h2>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl border p-0.5" style={{ borderColor: "var(--border)" }}>
              {(["vi", "en"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} className={`rounded-lg px-3 py-1 text-sm font-semibold ${lang === l ? "bg-brand-600 text-white" : ""}`}>
                  {l === "vi" ? "Tiếng Việt" : "English"}
                </button>
              ))}
            </div>
            <div className="flex rounded-xl border p-0.5" style={{ borderColor: "var(--border)" }}>
              {(["edit", "split", "preview"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} className={`rounded-lg px-3 py-1 text-sm font-semibold ${view === v ? "bg-brand-600 text-white" : ""}`}>
                  {v === "edit" ? "Soạn" : v === "split" ? "Song song" : "Xem trước"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="muted text-xs">
          <code>### Tiêu đề</code> · <code>**đậm**</code> · <code>- gạch đầu dòng</code> · bảng <code>| a | b |</code> · hộp ghi chú <code>&gt; [!TIP]</code> / <code>[!WARNING]</code> / <code>[!NOTE]</code> · ảnh <code>![mô tả](link)</code> · link YouTube / Drive để riêng 1 dòng sẽ tự nhúng.
        </p>
        <div className={`grid gap-3 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
          {view !== "preview" && (
            <textarea value={e.body[lang]} onChange={(ev) => set({ body: { ...e.body, [lang]: ev.target.value } })} className="input min-h-[480px] font-mono text-xs leading-relaxed" spellCheck={false} />
          )}
          {view !== "edit" && <div className="doc-prose max-h-[640px] overflow-y-auto rounded-xl border p-4" style={{ borderColor: "var(--border)" }} dangerouslySetInnerHTML={{ __html: preview }} />}
        </div>
      </div>

      <div className="card grid gap-3 lg:grid-cols-3">
        <Field label="Tags" hint="Cách nhau bởi dấu phẩy – giúp tìm kiếm (VD: capability, năng lực)">
          <input
            className="input"
            value={tagsText}
            onChange={(ev) => {
              setTagsText(ev.target.value);
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Mục liên quan" hint={unknown.length ? `⚠ Không có mục: ${unknown.join(", ")}` : "Đường dẫn các mục khác, cách nhau bởi dấu phẩy"}>
          <input
            className="input font-mono"
            list="handbook-slugs"
            value={relatedText}
            onChange={(ev) => {
              setRelatedText(ev.target.value);
              setDirty(true);
            }}
          />
          <datalist id="handbook-slugs">
            {all.map((x) => (
              <option key={x.slug} value={`${relatedText.replace(/[^,]*$/, "").trim()}${relatedText.includes(",") ? " " : ""}${x.slug}`}>
                {x.title.vi}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label="Tiêu chuẩn / tài liệu tham chiếu" hint="Mỗi dòng 1 tài liệu">
          <AutoTextarea
            value={refsText}
            onChange={(ev) => {
              setRefsText(ev.target.value);
              setDirty(true);
            }}
            minHeight={60}
          />
        </Field>
      </div>
    </section>
  );
}
