"use client";

import { useState } from "react";
import { getSiteData } from "@/lib/content/loaders";
import { useLanguage } from "@/components/providers/language-provider";
import { ui } from "@/lib/content/i18n";

export function FloatingContact() {
  const [open, setOpen] = useState(false);
  const { lang } = useLanguage();
  const site = getSiteData();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border p-3 shadow-lg" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <a className="rounded bg-brand-600 px-3 py-2 text-center text-sm text-white" href={`tel:${site.profile.phone}`}>Call</a>
          <a className="rounded bg-brand-500 px-3 py-2 text-center text-sm text-white" href={`https://zalo.me/${site.profile.zaloPhone}`} target="_blank">Zalo</a>
          <a className="rounded bg-brand-400 px-3 py-2 text-center text-sm text-white" href={`mailto:${site.profile.email}`}>Email</a>
          <a className="rounded bg-brand-700 px-3 py-2 text-center text-sm text-white" href="/cv?print=1">{ui.common[lang].downloadCv}</a>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 animate-pulse rounded-full bg-brand-600 text-white shadow-xl"
        aria-label={ui.common[lang].quickContact}
      >
        ☎
      </button>
    </div>
  );
}
