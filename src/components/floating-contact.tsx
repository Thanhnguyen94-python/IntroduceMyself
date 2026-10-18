"use client";

import { useEffect, useState } from "react";
import { getSiteData } from "@/lib/content/loaders";
import { normalizeSiteData } from "@/lib/content/normalizers";
import type { SiteData } from "@/lib/content/types";
import { useLanguage } from "@/components/providers/language-provider";
import { ui } from "@/lib/content/i18n";

export function FloatingContact() {
  const [open, setOpen] = useState(false);
  const { lang } = useLanguage();
  const [site, setSite] = useState<SiteData>(() => getSiteData());

  useEffect(() => {
    fetch("/api/site", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: SiteData | null) => {
        if (payload?.profile) setSite(normalizeSiteData(payload));
      })
      .catch(() => undefined);
  }, []);

  // SĐT/Zalo chỉ hiện khi bật "showPhone" trong Admin (mặc định ẩn để không lộ thông tin cá nhân).
  const showPhone = Boolean(site.privacy?.showPhone);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={`mb-3 flex origin-bottom-right flex-col gap-2 rounded-2xl border p-3 shadow-xl transition duration-200 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"
        }`}
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {showPhone && (
          <a className="rounded-lg bg-brand-600 px-3 py-2 text-center text-sm text-white" href={`tel:${site.profile.phone}`}>Call</a>
        )}
        {showPhone && (
          <a className="rounded-lg bg-brand-500 px-3 py-2 text-center text-sm text-white" href={`https://zalo.me/${site.profile.zaloPhone}`} target="_blank" rel="noreferrer">Zalo</a>
        )}
        <a className="rounded-lg bg-brand-500 px-3 py-2 text-center text-sm text-white" href={`mailto:${site.profile.email}`}>Email</a>
        <a className="rounded-lg bg-brand-700 px-3 py-2 text-center text-sm text-white" href="/cv">{ui.common[lang].downloadCv}</a>
      </div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-xl text-white shadow-xl transition hover:scale-105"
        aria-label={ui.common[lang].quickContact}
        aria-expanded={open}
      >
        {open ? "✕" : "☎"}
      </button>
    </div>
  );
}
