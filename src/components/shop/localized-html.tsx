"use client";

import { useLanguage } from "@/components/providers/language-provider";

// HTML đã render sẵn ở server (Markdown của admin) cho 2 ngôn ngữ; thiếu bản EN thì dùng VI.
export function LocalizedHtml({ html, className = "" }: { html: { vi: string; en: string }; className?: string }) {
  const { lang } = useLanguage();
  return <div className={className} dangerouslySetInnerHTML={{ __html: (lang === "en" && html.en) || html.vi }} />;
}
