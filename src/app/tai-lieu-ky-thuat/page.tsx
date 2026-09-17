"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getDocsData } from "@/lib/content/loaders";
import { pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";

const PASSWORD_HASH =
  process.env.NEXT_PUBLIC_PRIVATE_DOCS_PASSWORD_HASH ??
  "1d296d16fe2421bef93f8420cc6e3c99c8acef8029899c894d93c8c0979736a5";

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function TaiLieuPage() {
  const { lang } = useLanguage();
  const [keyword, setKeyword] = useState("");
  const [isUnlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const docs = getDocsData();

  const visible = useMemo(() => {
    const lower = keyword.toLowerCase();
    return docs.items.filter((d) => {
      const title = pickText(d.title, lang).toLowerCase();
      return title.includes(lower) || d.topic.toLowerCase().includes(lower);
    });
  }, [docs.items, keyword, lang]);

  const unlockPrivate = async () => {
    const candidate = await sha256(passwordInput);
    if (candidate === PASSWORD_HASH) {
      setUnlocked(true);
      setError("");
      return;
    }
    setError(lang === "vi" ? "Mật khẩu chưa đúng." : "Incorrect password.");
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Thư viện tài liệu kỹ thuật" : "Technical Knowledge Library"}</h1>

      <div className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={lang === "vi" ? "Tìm theo tiêu đề hoặc chủ đề..." : "Search by title or topic..."}
          className="w-full rounded-lg border px-3 py-2 text-sm md:max-w-md"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder={lang === "vi" ? "Mật khẩu private" : "Private password"}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
          <button onClick={unlockPrivate} className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-white">
            {lang === "vi" ? "Mở tài liệu private" : "Unlock private docs"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((doc) => {
          const isPrivate = doc.visibility === "private";
          const canOpen = !isPrivate || isUnlocked;
          return (
            <article key={doc.id} className="card">
              <p className="text-xs uppercase tracking-wide text-slate-500">{doc.topic}</p>
              <h2 className="mt-1 text-lg font-semibold">{pickText(doc.title, lang)}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{pickText(doc.summary, lang)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {doc.equipmentTags.map((tag: string) => (
                  <span key={tag} className="rounded bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-slate-800 dark:text-brand-200">{tag}</span>
                ))}
              </div>
              <div className="mt-4">
                {canOpen ? (
                  doc.fileUrl ? (
                    <a href={doc.fileUrl} className="text-sm font-semibold text-brand-600 dark:text-brand-300" target="_blank">
                      {lang === "vi" ? "Xem/Tải tài liệu" : "Open/Download"}
                    </a>
                  ) : (
                    <Link href={`/tai-lieu-ky-thuat/${doc.slug}`} className="text-sm font-semibold text-brand-600 dark:text-brand-300">
                      {lang === "vi" ? "Xem chi tiết" : "Read detail"}
                    </Link>
                  )
                ) : (
                  <span className="text-sm font-semibold text-amber-600">{lang === "vi" ? "Tài liệu private - cần mật khẩu" : "Private - password required"}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
