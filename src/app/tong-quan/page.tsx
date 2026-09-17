"use client";

import Link from "next/link";
import { getExperienceData, getSiteData } from "@/lib/content/loaders";
import { pickList, pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";

export default function TongQuanPage() {
  const { lang } = useLanguage();
  const site = getSiteData();
  const exp = getExperienceData();

  return (
    <section className="space-y-8">
      <div className="card bg-gradient-to-br from-brand-100 via-white to-brand-200 dark:from-brand-800 dark:via-slate-900 dark:to-brand-900">
        <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
          <div className="mx-auto w-full max-w-[220px]">
            <img
              src="/assets/images/profile-mr-jay.jpg"
              alt="Nguyễn Văn Thạnh - Mr Jay"
              className="h-[280px] w-full rounded-2xl object-cover shadow-lg"
            />
          </div>

          <div className="text-left">
            <p className="text-sm font-medium text-brand-700 dark:text-brand-200">{site.profile.fullName} ({site.profile.displayName})</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">{pickText(site.profile.title, lang)}</h1>
            <p className="mt-3 max-w-3xl text-slate-700 dark:text-slate-200">{pickText(site.profile.slogan, lang)}</p>

            <div className="mt-4 grid gap-2 text-sm text-slate-800 dark:text-slate-200 md:grid-cols-2">
              <p>📞 {site.profile.phone}</p>
              <p>✉️ {site.profile.email}</p>
              <p>📍 {site.profile.location}</p>
              <p>🎂 {site.profile.birthDate}</p>
              <p className="md:col-span-2">🏠 {lang === "vi" ? "Quê quán" : "Hometown"}: {site.profile.hometown}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white" href="/cv?print=1">
                {lang === "vi" ? "Tải CV PDF" : "Download CV PDF"}
              </Link>
              <a className="rounded-lg border border-brand-300 bg-white/70 px-4 py-2 text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-white" href={`mailto:${site.profile.email}`}>
                {lang === "vi" ? "Liên hệ nhanh" : "Quick contact"}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Điểm nổi bật" : "Highlights"}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {pickList(site.highlights, lang).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Ảnh đại diện nội dung" : "Visual placeholders"}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {["SMT Line", "AOI/SPI", "3D Jig", "Team Training"].map((label) => (
              <div key={label} className="rounded-lg border border-dashed p-6 text-center text-xs" style={{ borderColor: "var(--border)" }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Tóm tắt kinh nghiệm" : "Career snapshot"}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {exp.items.map((item) => (
            <div key={item.id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs text-slate-500">{item.startDate} - {item.endDate}</p>
              <p className="font-semibold">{item.company}</p>
              <p className="text-sm">{pickText(item.role, lang)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
