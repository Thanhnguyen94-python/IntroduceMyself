"use client";

import { useLanguage } from "@/components/providers/language-provider";

export function MaintenanceNotice() {
  const { lang } = useLanguage();
  return (
    <section className="card mx-auto max-w-xl py-10 text-center">
      <p className="text-4xl">🛠️</p>
      <h1 className="mt-3 text-xl font-bold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Đang bảo trì" : "Under maintenance"}</h1>
      <p className="muted mt-2 text-sm">
        {lang === "vi" ? "Đang bảo trì & nâng cấp, vui lòng quay lại sau" : "This page is under maintenance and upgrade. Please come back later."}
      </p>
    </section>
  );
}
