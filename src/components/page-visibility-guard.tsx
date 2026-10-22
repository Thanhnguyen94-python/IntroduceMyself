"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { isPageEnabled, type ManagedPageKey, type SiteVisibilityConfig } from "@/lib/site-visibility-types";

const defaultVisibility: SiteVisibilityConfig = { schemaVersion: 1, pages: {} };
// Nhớ cấu hình trong phiên: lần chuyển trang sau hiện ngay, vẫn tải lại ngầm để cập nhật.
let cached: SiteVisibilityConfig | null = null;

export function PageVisibilityGuard({ pageKey, children }: { pageKey: ManagedPageKey; children: React.ReactNode }) {
  const { lang } = useLanguage();
  const [state, setState] = useState<SiteVisibilityConfig>(cached ?? defaultVisibility);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let mounted = true;

    async function loadVisibility() {
      try {
        const response = await fetch("/api/site/visibility", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as SiteVisibilityConfig;
        cached = payload;
        if (mounted) {
          setState(payload);
        }
      } catch {
        // Keep default visibility if API is unavailable.
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadVisibility();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="card text-sm" style={{ color: "var(--muted)" }}>
        {lang === "vi" ? "Đang tải trang..." : "Loading page..."}
      </section>
    );
  }

  if (!isPageEnabled(state, pageKey)) {
    return (
      <section className="card text-center">
        <h1 className="text-xl font-bold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Đang bảo trì" : "Under maintenance"}</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {lang === "vi" ? "Đang bảo trì & nâng cấp, vui lòng quay lại sau" : "This page is under maintenance and upgrade. Please come back later."}
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
