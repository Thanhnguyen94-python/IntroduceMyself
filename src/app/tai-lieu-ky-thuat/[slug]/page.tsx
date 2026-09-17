"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { getDocsData } from "@/lib/content/loaders";
import { pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";

export default function DocDetailPage() {
  const { lang } = useLanguage();
  const params = useParams<{ slug: string }>();
  const doc = getDocsData().items.find((item) => item.slug === params.slug);

  if (!doc) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <Link href="/tai-lieu-ky-thuat" className="text-sm text-brand-600 dark:text-brand-300">← {lang === "vi" ? "Quay lại thư viện" : "Back to library"}</Link>
      <h1 className="text-2xl font-bold">{pickText(doc.title, lang)}</h1>
      <p style={{ color: "var(--muted)" }}>{pickText(doc.summary, lang)}</p>
      <div className="card">
        <p className="text-sm">{lang === "vi" ? "Nội dung chi tiết sẽ được bổ sung theo tài liệu thực tế." : "Detailed content will be expanded with actual document notes."}</p>
      </div>
    </section>
  );
}
