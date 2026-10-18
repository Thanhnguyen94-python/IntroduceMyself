"use client";

import { useState, type FormEvent } from "react";
import { slugify } from "@/lib/hubs/markdown";

// Tạo Project Hub mới từ mẫu (hub.json + 4 bài tài liệu khung), rồi chuyển sang trình sửa.
export function CreateHubForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const response = await fetch("/api/admin/hubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name })
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string; slug?: string };
    setSaving(false);
    if (!response.ok || !payload.slug) {
      setError(payload.message ?? "Không tạo được hub.");
      return;
    }
    window.location.href = `/admin/hubs/${payload.slug}`;
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h2 className="font-semibold">➕ Tạo Project Hub mới</h2>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Tên dự án</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value).slice(0, 40));
            }}
            className="input"
            placeholder="Robot_don_nha"
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Đường dẫn (slug)</span>
          <div className="flex items-center gap-1">
            <span className="muted text-sm">/</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              className="input font-mono"
              placeholder="don-nha"
              required
            />
          </div>
        </label>
        <button className="btn-primary" disabled={saving || !slug}>
          {saving ? "Đang tạo..." : "Tạo hub"}
        </button>
      </div>
      <p className="muted text-xs">Hub mới có sẵn khung: Bắt đầu nhanh, BOM, Sơ đồ đấu dây, Lỗi thường gặp. Hub mới tạo ở trạng thái Alpha, sửa nội dung xong mới chia sẻ link.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
