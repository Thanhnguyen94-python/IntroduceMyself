"use client";

import { useEffect, useState } from "react";
import type { SiteData } from "@/lib/content/types";
import type { HubSummary } from "@/lib/hubs/types";
import { normalizeGoogleDriveImageUrl, resolveMedia } from "@/lib/media-url";
import { isPageEnabled, type ManagedPageKey, type SiteVisibilityConfig } from "@/lib/site-visibility-types";

type Props = {
  visibility: SiteVisibilityConfig;
  setVisibility: (next: SiteVisibilityConfig) => void;
  site: SiteData;
  setSite: (next: SiteData) => void;
  onSave: () => void;
  onSaveSite: () => void;
  onPickAvatarFile: (file: File) => void;
  saving: boolean;
  savingSite: boolean;
  uploadingAvatar: boolean;
};

const defaultAvatar = "/assets/images/profile-mr-jay.jpg";

export function OverviewTab({ visibility, setVisibility, site, setSite, onSave, onSaveSite, onPickAvatarFile, saving, savingSite, uploadingAvatar }: Props) {
  const avatarInput = (site.profile.avatarUrl ?? "").trim();
  const avatarMedia = resolveMedia(avatarInput || defaultAvatar);
  const avatarPreview = avatarMedia.type === "image" ? avatarMedia.src : defaultAvatar;
  const [hubs, setHubs] = useState<HubSummary[]>([]);

  useEffect(() => {
    fetch("/api/hubs", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { items?: HubSummary[] } | null) => setHubs(payload?.items ?? []))
      .catch(() => setHubs([]));
  }, []);

  const toggles: Array<[ManagedPageKey, string]> = [
    ["overview", "Trang chủ & Tổng quan"],
    ["journey", "Hành trình"],
    ["projects", "Dự án (Case Study)"],
    ["showcase", "Cửa hàng (/shop)"],
    ["docs", "Tài liệu"],
    ...hubs.map((hub): [ManagedPageKey, string] => [`hub:${hub.slug}`, `Project Hub: ${hub.name} (/${hub.slug})`])
  ];

  return (
    <section className="space-y-4">
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">Ảnh đại diện hồ sơ</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="space-y-2">
            <label className="text-sm font-medium">Avatar URL</label>
            <input
              type="text"
              value={site.profile.avatarUrl ?? ""}
              onChange={(e) => {
                const input = normalizeGoogleDriveImageUrl(e.target.value);
                setSite({
                  ...site,
                  profile: {
                    ...site.profile,
                    avatarUrl: input
                  }
                });
              }}
              placeholder="https://... hoặc /assets/images/..."
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <label className="inline-flex w-fit cursor-pointer rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white">
              {uploadingAvatar ? "Đang upload..." : "Chọn tệp từ máy tính"}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                disabled={uploadingAvatar}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPickAvatarFile(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Dán link ảnh hoặc đường dẫn nội bộ. Nếu là link YouTube sẽ tự fallback về ảnh mặc định.</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview</p>
            <div className="h-[180px] w-[180px] overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold">Quyền riêng tư trên Portfolio công khai</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Mặc định ẩn để nhà tuyển dụng chỉ thấy email. Trang /cv vẫn hiển thị đầy đủ.</p>
          {([
            ["showPhone", "Hiện số điện thoại & nút Zalo/Call"],
            ["showPersonalInfo", "Hiện ngày sinh & quê quán"]
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(site.privacy?.[key])}
                onChange={(e) =>
                  setSite({
                    ...site,
                    privacy: {
                      showPhone: site.privacy?.showPhone ?? false,
                      showPersonalInfo: site.privacy?.showPersonalInfo ?? false,
                      [key]: e.target.checked
                    }
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onSaveSite}
            disabled={savingSite}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingSite ? "Đang lưu profile..." : "Lưu profile"}
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">Hiển thị/Ẩn các trang (Portfolio & Project Hub)</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {toggles.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
              <input
                type="checkbox"
                checked={isPageEnabled(visibility, key)}
                onChange={(e) => {
                  setVisibility({
                    ...visibility,
                    pages: {
                      ...visibility.pages,
                      [key]: e.target.checked
                    }
                  });
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu cài đặt hiển thị"}
        </button>
      </div>
    </section>
  );
}
