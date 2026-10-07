"use client";

import type { ManagedPageKey, SiteVisibilityConfig } from "@/lib/site-visibility-types";

type Props = {
  visibility: SiteVisibilityConfig;
  setVisibility: (next: SiteVisibilityConfig) => void;
  onSave: () => void;
  saving: boolean;
};

export function OverviewTab({ visibility, setVisibility, onSave, saving }: Props) {
  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">Hiển thị/Ẩn các trang chính</h2>
      <div className="grid gap-2 md:grid-cols-2">
        {([
          ["overview", "Tổng quan"],
          ["journey", "Hành trình"],
          ["projects", "Dự án"],
          ["showcase", "Sản phẩm"],
          ["docs", "Tài liệu"]
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
            <input
              type="checkbox"
              checked={visibility.pages[key]}
              onChange={(e) => {
                const pageKey = key as ManagedPageKey;
                setVisibility({
                  ...visibility,
                  pages: {
                    ...visibility.pages,
                    [pageKey]: e.target.checked
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
    </section>
  );
}
