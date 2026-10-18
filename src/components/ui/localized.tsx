"use client";

import { useLanguage } from "@/components/providers/language-provider";
import type { LocalizedText } from "@/lib/content/types";

// Server component truyền text song ngữ xuống, client chọn theo ngôn ngữ người dùng.
export function L({ t }: { t: LocalizedText | undefined }) {
  const { lang } = useLanguage();
  if (!t) return null;
  return <>{t[lang] || t.vi}</>;
}

export function LList({ t, className }: { t: { vi: string[]; en: string[] }; className?: string }) {
  const { lang } = useLanguage();
  const items = t[lang]?.length ? t[lang] : t.vi;
  return (
    <ul className={className}>
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );
}
