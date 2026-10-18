"use client";

import { useEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import type { LocalizedList, LocalizedText } from "@/lib/content/types";
import { describeMedia, normalizeMediaUrl, resolveSmartMedia, type MediaKind } from "@/lib/smart-media";
import { SmartMedia } from "@/components/ui/smart-media";

// ===== Các ô nhập dùng chung cho trình chỉnh sửa trong Admin =====

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="muted block text-xs">{hint}</span>}
    </label>
  );
}

export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { minHeight?: number }) {
  const { minHeight = 80, className = "", ...rest } = props;
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = `${Math.max(minHeight, ref.current.scrollHeight)}px`;
  }, [props.value, minHeight]);
  return <textarea ref={ref} {...rest} className={`input resize-y ${className}`} />;
}

const empty: LocalizedText = { vi: "", en: "" };

// Cặp ô Tiếng Việt / English.
export function LocalizedInput({
  label,
  value,
  onChange,
  multiline = false,
  hint
}: {
  label: string;
  value: LocalizedText | undefined;
  onChange: (next: LocalizedText) => void;
  multiline?: boolean;
  hint?: string;
}) {
  const v = value ?? empty;
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">{label}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {(["vi", "en"] as const).map((lang) =>
          multiline ? (
            <AutoTextarea key={lang} value={v[lang]} onChange={(e) => onChange({ ...v, [lang]: e.target.value })} placeholder={lang === "vi" ? "Tiếng Việt" : "English"} />
          ) : (
            <input key={lang} value={v[lang]} onChange={(e) => onChange({ ...v, [lang]: e.target.value })} placeholder={lang === "vi" ? "Tiếng Việt" : "English"} className="input" />
          )
        )}
      </div>
      {hint && <p className="muted text-xs">{hint}</p>}
    </div>
  );
}

// Danh sách song ngữ, mỗi dòng 1 ý.
export function LocalizedLinesInput({ label, value, onChange }: { label: string; value: LocalizedList | undefined; onChange: (next: LocalizedList) => void }) {
  const v = value ?? { vi: [], en: [] };
  const toLines = (text: string) => text.split("\n").map((it) => it.trim()).filter(Boolean);
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">{label}</p>
      <div className="grid gap-2 md:grid-cols-2">
        <AutoTextarea value={v.vi.join("\n")} onChange={(e) => onChange({ ...v, vi: toLines(e.target.value) })} placeholder="Tiếng Việt - mỗi dòng 1 ý" />
        <AutoTextarea value={v.en.join("\n")} onChange={(e) => onChange({ ...v, en: toLines(e.target.value) })} placeholder="English - one item per line" />
      </div>
    </div>
  );
}

export function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

// Danh sách có thể kéo thả, đưa lên/xuống, xoá, thêm. renderItem nhận item + hàm cập nhật.
export function SortableList<T>({
  items,
  onChange,
  renderItem,
  createItem,
  addLabel = "+ Thêm",
  itemTitle
}: {
  items: T[];
  onChange: (next: T[]) => void;
  renderItem: (item: T, update: (next: T) => void, index: number) => ReactNode;
  createItem?: () => T;
  addLabel?: string;
  itemTitle?: (item: T, index: number) => string;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          onDragOver={(e) => {
            if (dragIndex === null) return;
            e.preventDefault();
            setOverIndex(index);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null) onChange(moveItem(items, dragIndex, index));
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`rounded-xl border p-3 transition ${dragIndex === index ? "opacity-40" : ""} ${overIndex === index && dragIndex !== index ? "ring-2 ring-brand-500" : ""}`}
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 80%, transparent)" }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              draggable
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className="muted cursor-grab select-none px-1 text-lg active:cursor-grabbing"
              title="Kéo để sắp xếp"
              aria-hidden
            >
              ⋮⋮
            </span>
            <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-600 text-xs font-bold text-white">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{itemTitle?.(item, index)}</span>
            <button type="button" className="rounded border px-2 py-0.5 text-xs disabled:opacity-40" style={{ borderColor: "var(--border)" }} disabled={index === 0} onClick={() => onChange(moveItem(items, index, index - 1))} aria-label="Đưa lên">
              ↑
            </button>
            <button
              type="button"
              className="rounded border px-2 py-0.5 text-xs disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
              disabled={index === items.length - 1}
              onClick={() => onChange(moveItem(items, index, index + 1))}
              aria-label="Đưa xuống"
            >
              ↓
            </button>
            <button
              type="button"
              className="rounded bg-red-500 px-2 py-0.5 text-xs text-white"
              onClick={() => {
                if (window.confirm("Xoá mục này?")) onChange(items.filter((_, i) => i !== index));
              }}
            >
              Xoá
            </button>
          </div>
          {renderItem(item, (next) => onChange(items.map((it, i) => (i === index ? next : it))), index)}
        </div>
      ))}
      {createItem && (
        <button type="button" onClick={() => onChange([...items, createItem()])} className="btn-ghost w-full border-dashed">
          {addLabel}
        </button>
      )}
    </div>
  );
}

// Upload 1 file lên Supabase Storage qua API admin sẵn có, trả về URL công khai.
export async function uploadToStorage(file: File, folder: string): Promise<string> {
  const bucket = file.type.startsWith("video/") ? "videos" : file.type.startsWith("image/") ? "images" : "docs";
  const body = new FormData();
  body.append("file", file);
  body.append("bucket", bucket);
  body.append("folder", folder);
  const response = await fetch("/api/admin/storage/upload", { method: "POST", body });
  const payload = (await response.json().catch(() => ({}))) as { publicUrl?: string; message?: string };
  if (!response.ok || !payload.publicUrl) {
    throw new Error(
      /not configured/i.test(payload.message ?? "")
        ? "Upload cần Supabase. Khi chạy local: chép file vào public/assets/images/... rồi dán đường dẫn /assets/... vào ô URL."
        : payload.message ?? "Upload thất bại."
    );
  }
  return payload.publicUrl;
}

// Ô nhập media thông minh: dán link chia sẻ YouTube/Drive -> tự chuẩn hoá + xem trước; hoặc upload file.
export function MediaUrlField({
  value,
  onChange,
  kind = "auto",
  onKindChange,
  uploadFolder,
  label = "Ảnh / video",
  previewClassName = "aspect-video"
}: {
  value: string;
  onChange: (url: string) => void;
  kind?: MediaKind;
  onKindChange?: (kind: MediaKind) => void;
  uploadFolder: string;
  label?: string;
  previewClassName?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const media = resolveSmartMedia(value, kind);
  const typeLabel = describeMedia(media);

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-2 text-sm">
        <p className="font-medium">
          {label} {typeLabel && <span className="chip ml-1 text-[10px]">{typeLabel}</span>}
        </p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(normalizeMediaUrl(e.target.value))}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text) {
              e.preventDefault();
              onChange(normalizeMediaUrl(text));
            }
          }}
          placeholder="Dán link YouTube, Google Drive, hoặc /assets/images/..."
          className="input"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className={`btn-ghost cursor-pointer px-3 py-1.5 text-xs ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            {uploading ? "Đang upload..." : "⬆ Upload file"}
            <input
              type="file"
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = "";
                if (!file) return;
                setError("");
                setUploading(true);
                try {
                  onChange(await uploadToStorage(file, uploadFolder));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload thất bại.");
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          {onKindChange && (
            <select value={kind} onChange={(e) => onKindChange(e.target.value as MediaKind)} className="input w-auto py-1.5 text-xs" title="Loại file (với link Google Drive)">
              <option value="auto">Tự nhận diện</option>
              <option value="image">Ảnh</option>
              <option value="video">Video</option>
              <option value="document">Tài liệu / PDF</option>
            </select>
          )}
        </div>
        {media.type === "drive" && kind === "auto" && (
          <p className="muted text-xs">Link Drive: web thử hiển thị như ảnh, nếu là video/PDF sẽ tự chuyển sang trình xem của Drive. Nhớ bật chia sẻ “Bất kỳ ai có đường liên kết”.</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className={`overflow-hidden rounded-xl border ${previewClassName}`} style={{ borderColor: "var(--border)" }}>
        <SmartMedia url={value} kind={kind} alt="Xem trước" />
      </div>
    </div>
  );
}
