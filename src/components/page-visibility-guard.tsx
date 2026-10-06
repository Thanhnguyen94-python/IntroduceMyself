"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import type { ManagedPageKey, SiteVisibilityConfig } from "@/lib/site-visibility-types";

const defaultVisibility: SiteVisibilityConfig = {
  schemaVersion: 1,
  pages: {
    overview: true,
    journey: true,
    projects: true,
    showcase: true,
    docs: true
  }
};

export function PageVisibilityGuard({ pageKey, children }: { pageKey: ManagedPageKey; children: React.ReactNode }) {
  const { lang } = useLanguage();
  const [state, setState] = useState<SiteVisibilityConfig>(defaultVisibility);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadVisibility() {
      try {
        const response = await fetch("/api/site/visibility", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as SiteVisibilityConfig;
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

  if (!state.pages?.[pageKey]) {
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
