"use client";

import { useState } from "react";
import Link from "next/link";
import { getExperienceData, getSiteData } from "@/lib/content/loaders";
import { pickList, pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";

function getYearMonthValue(input: string) {
  const [y = "0", m = "01"] = input.split("-");
  return Number(y) * 12 + Number(m);
}

function getMonthDiff(start: string, end: string) {
  return Math.max(0, getYearMonthValue(end) - getYearMonthValue(start));
}

function isAcademicStage(company: string, roleVi: string, roleEn: string, id: string) {
  const text = `${company} ${roleVi} ${roleEn} ${id}`.toLowerCase();
  return text.includes("trường") || text.includes("college") || text.includes("university") || text.includes("sinh viên") || text.includes("student");
}

export default function TongQuanPage() {
  const { lang } = useLanguage();
  const [showAllVisuals, setShowAllVisuals] = useState(false);
  const [journeyMode, setJourneyMode] = useState<"work" | "all">("work");
  const site = getSiteData();
  const exp = getExperienceData();
  const hasExperience = exp.items.length > 0;

  const sortedExp = [...exp.items].sort((a, b) => getYearMonthValue(b.startDate) - getYearMonthValue(a.startDate));
  const workExp = exp.items.filter((item) => !isAcademicStage(item.company, item.role.vi, item.role.en, item.id));
  const sortedWorkExp = [...workExp].sort((a, b) => getYearMonthValue(b.startDate) - getYearMonthValue(a.startDate));
  const hasWorkExperience = workExp.length > 0;

  const earliestWorkStart = hasWorkExperience
    ? workExp.reduce((min, item) => {
      return getYearMonthValue(item.startDate) < getYearMonthValue(min.startDate) ? item : min;
    }, workExp[0])
    : null;

  const currentMonth = new Date();
  const nowKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const totalMonths = earliestWorkStart ? getMonthDiff(earliestWorkStart.startDate, nowKey) : 0;
  const totalYears = Math.round((totalMonths / 12) * 10) / 10;

  const leaderMonths = workExp
    .filter((item) => {
      const roleText = `${item.role.vi} ${item.role.en}`.toLowerCase();
      return roleText.includes("tổ trưởng") || roleText.includes("team leader");
    })
    .reduce((sum, item) => sum + getMonthDiff(item.startDate, item.endDate || nowKey), 0);
  const leaderYears = Math.max(0, Math.round((leaderMonths / 12) * 10) / 10);

  const achievementCount = workExp.reduce((sum, item) => sum + pickList(item.achievements, lang).length, 0);
  const improvementCount = workExp.reduce((sum, item) => sum + pickList(item.improvements, lang).length, 0);
  const uniqueTools = new Set(workExp.flatMap((item) => item.equipmentTags));
  const visualItems = sortedWorkExp.flatMap((item) =>
    item.images.slice(0, 2).map((image) => ({
      ...image,
      company: item.company,
      period: `${item.startDate}${item.isCurrent ? " → nay" : ` → ${item.endDate}`}`
    }))
  );
  const visibleVisualItems = showAllVisuals ? visualItems : visualItems.slice(0, 6);
  const journeyItems = journeyMode === "work" ? sortedWorkExp : sortedExp;

  return (
    <section className="overview-hover space-y-8">
      <div className="card overflow-hidden bg-gradient-to-br from-brand-100 via-white to-brand-200 dark:from-brand-800 dark:via-slate-900 dark:to-brand-900">
        <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
          <div className="mx-auto w-full max-w-[220px]">
            <img
              src="/assets/images/profile-mr-jay.jpg"
              alt="Nguyễn Văn Thạnh - Mr Jay"
              className="h-[280px] w-full rounded-2xl object-cover shadow-lg"
            />
          </div>

          <div className="text-left">
            <div className="inline-flex rounded-full border border-brand-300 bg-white/70 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-600 dark:bg-slate-900/40 dark:text-brand-200">
              {lang === "vi" ? "Tổng quan chuyên môn SMT" : "SMT Professional Overview"}
            </div>
            <p className="mt-3 text-sm font-medium text-brand-700 dark:text-brand-200">{site.profile.fullName} ({site.profile.displayName})</p>
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
              <Link className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white" href="/cv">
                {lang === "vi" ? "Mở CV & Xuất PDF" : "Open CV & Export PDF"}
              </Link>
              <a className="rounded-lg border border-brand-300 bg-white/70 px-4 py-2 text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-white" href={`mailto:${site.profile.email}`}>
                {lang === "vi" ? "Liên hệ nhanh" : "Quick contact"}
              </a>
              {/* <a className="rounded-lg border border-brand-300 bg-white/70 px-4 py-2 text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-white" href={`tel:${site.profile.phone}`}>
                {lang === "vi" ? "Gọi ngay" : "Call now"}
              </a> */}
              <a className="rounded-lg border border-brand-300 bg-white/70 px-4 py-2 text-slate-900 dark:border-slate-500 dark:bg-slate-800 dark:text-white" href={`https://zalo.me/${site.profile.zaloPhone}`} target="_blank" rel="noreferrer">
                Zalo
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{lang === "vi" ? "Kinh nghiệm" : "Experience"}</p>
          <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-200">{totalYears}+ {lang === "vi" ? "năm" : "years"}</p>
          
        </div>
        <div className="card">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{lang === "vi" ? "Vai trò dẫn dắt" : "Leadership"}</p>
          <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-200">{leaderYears}+ {lang === "vi" ? "năm" : "years"}</p>
        </div>
        
        <div className="card">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{lang === "vi" ? "Thiết bị/Công cụ" : "Tools/Equipment"}</p>
          <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-200">{uniqueTools.size}+</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Điểm nổi bật" : "Highlights"}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {pickList(site.highlights, lang).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{lang === "vi" ? "Cải tiến đã thực hiện" : "Implemented improvements"}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {lang === "vi"
                ? `Đã triển khai ${improvementCount} sáng kiến cải tiến và tự động hóa trong các giai đoạn làm việc.`
                : `Implemented ${improvementCount} process/automation improvements across working stages.`}
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Năng lực kỹ thuật" : "Technical capabilities"}</h2>
          <div className="mt-3 space-y-3">
            {site.skills.map((group) => (
              <div key={group.group.vi}>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{pickText(group.group, lang)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.items.map((skill) => (
                    <span
                      key={`${group.group.vi}-${skill}`}
                      className="rounded-full border px-2.5 py-1 text-xs"
                      style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in srgb, var(--surface) 75%, transparent)" }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Điều hướng nhanh" : "Quick navigation"}</h2>
          <div className="mt-3 grid gap-2">
            <Link className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-brand-50 dark:hover:bg-slate-800" style={{ borderColor: "var(--border)" }} href="/hanh-trinh">
              {lang === "vi" ? "Xem toàn bộ Hành Trình" : "View full Journey"}
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-brand-50 dark:hover:bg-slate-800" style={{ borderColor: "var(--border)" }} href="/du-an">
              {lang === "vi" ? "Khám phá Dự Án" : "Explore Projects"}
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-brand-50 dark:hover:bg-slate-800" style={{ borderColor: "var(--border)" }} href="/san-pham-trung-bay">
              {lang === "vi" ? "Xem Sản Phẩm Trưng Bày" : "View Showcase"}
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-brand-50 dark:hover:bg-slate-800" style={{ borderColor: "var(--border)" }} href="/tai-lieu-ky-thuat">
              {lang === "vi" ? "Mở Tài Liệu Kỹ Thuật" : "Open Technical Docs"}
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Hình ảnh tiêu biểu" : "Featured visuals"}</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">{lang === "vi" ? "Ảnh từ hành trình làm việc" : "Images from career journey"}</p>
            {visualItems.length > 6 && (
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-xs font-semibold text-brand-700 dark:text-brand-200"
                style={{ borderColor: "var(--border)" }}
                onClick={() => setShowAllVisuals((prev) => !prev)}
              >
                {showAllVisuals
                  ? (lang === "vi" ? "Thu gọn" : "Show less")
                  : (lang === "vi" ? "Xem thêm" : "Show more")}
              </button>
            )}
          </div>
        </div>
        {visualItems.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleVisualItems.map((image, index) => (
              <figure key={`${image.src}-${index}`} className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
                <img src={image.src} alt={pickText(image.description, lang)} className="h-48 w-full object-cover" />
                <figcaption className="space-y-1 p-3 text-xs">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{image.company}</p>
                  <p className="text-slate-600 dark:text-slate-300">{pickText(image.description, lang)}</p>
                  <p className="text-slate-500 dark:text-slate-400">{image.period}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{lang === "vi" ? "Chưa có ảnh tiêu biểu." : "No featured images available yet."}</p>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">{lang === "vi" ? "Tóm tắt hành trình" : "Journey snapshot"}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setJourneyMode("work")}
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${journeyMode === "work" ? "bg-brand-600 text-white" : "text-slate-700 dark:text-slate-200"}`}
              style={{ borderColor: "var(--border)" }}
            >
              {lang === "vi" ? "Đi làm" : "Working"}
            </button>
            <button
              type="button"
              onClick={() => setJourneyMode("all")}
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${journeyMode === "all" ? "bg-brand-600 text-white" : "text-slate-700 dark:text-slate-200"}`}
              style={{ borderColor: "var(--border)" }}
            >
              {lang === "vi" ? "Toàn bộ" : "All"}
            </button>
            <Link href="/hanh-trinh" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-200">
              {lang === "vi" ? "Xem đầy đủ" : "See full"}
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {journeyItems.map((item) => (
            <div key={item.id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs text-slate-500">{item.startDate} - {item.isCurrent ? (lang === "vi" ? "nay" : "present") : item.endDate}</p>
              <p className="font-semibold">{item.company}</p>
              <p className="text-sm">{pickText(item.role, lang)}</p>
              {item.equipmentTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.equipmentTags.slice(0, 4).map((tag) => (
                    <span key={`${item.id}-${tag}`} className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: "var(--border)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
