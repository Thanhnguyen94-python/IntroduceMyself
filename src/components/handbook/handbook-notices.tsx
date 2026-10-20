"use client";

import { useT } from "@/components/smt/smt-charts";

// Thông báo dùng chung cho các trang Sổ tay SMT (khi tắt / admin xem trước).
export function HandbookMaintenance() {
  const t = useT();
  return (
    <section className="card text-center">
      <h1 className="text-xl font-bold text-brand-600 dark:text-brand-300">{t("Đang bảo trì", "Under maintenance")}</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        {t("Đang bảo trì & nâng cấp, vui lòng quay lại sau", "This page is under maintenance and upgrade. Please come back later.")}
      </p>
    </section>
  );
}

export function HandbookAdminPreview() {
  return (
    <p className="smt-no-print rounded-xl bg-amber-400 px-4 py-2 text-center text-sm font-medium text-slate-900">
      👁 Sổ tay SMT đang <b>TẮT</b> với khách (chỉ admin xem được). Bật trong Admin → Nội dung &amp; hiển thị → “Sổ tay SMT”.
    </p>
  );
}
