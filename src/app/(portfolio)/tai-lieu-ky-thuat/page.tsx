"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { PageVisibilityGuard } from "@/components/page-visibility-guard";
import { SmtTemplateShelf } from "@/components/smt/template-shelf";
import { HandbookShelf } from "@/components/handbook/handbook-shelf";

export default function TaiLieuPage() {
  const { lang } = useLanguage();
  return (
    <PageVisibilityGuard pageKey="docs">
      <section className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Thư viện tài liệu kỹ thuật" : "Technical Knowledge Library"}</h1>

      <HandbookShelf />
      <SmtTemplateShelf />
      </section>
    </PageVisibilityGuard>
  );
}
