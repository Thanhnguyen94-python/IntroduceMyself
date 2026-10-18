"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import type { HubSummary } from "@/lib/hubs/types";

// Liên kết Case Study (Portfolio) <-> Project Hub. Hub khai báo `caseStudySlug` trong hub.json,
// Portfolio tự hiện link sang hub tương ứng mà không cần sửa giao diện.

let cache: Promise<HubSummary[]> | null = null;

function loadHubs() {
  if (!cache) {
    cache = fetch("/api/hubs?visible=1")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((payload: { items?: HubSummary[] }) => payload.items ?? [])
      .catch(() => {
        cache = null;
        return [];
      });
  }
  return cache;
}

export function useHubs() {
  const [hubs, setHubs] = useState<HubSummary[]>([]);
  useEffect(() => {
    let mounted = true;
    loadHubs().then((items) => mounted && setHubs(items));
    return () => {
      mounted = false;
    };
  }, []);
  return hubs;
}

export function useHubForCaseStudy(slug: string | undefined) {
  const hubs = useHubs();
  return slug ? hubs.find((hub) => hub.caseStudySlug === slug) ?? null : null;
}

// Khối kêu gọi trên trang chi tiết Case Study.
export function HubCallout({ hub }: { hub: HubSummary }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  return (
    <div className="relative overflow-hidden rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)" }}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-500/20 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-sky-400 text-2xl shadow-md">{hub.emoji}</span>
          <div>
            <p className="eyebrow">{vi ? "Dự án mã nguồn mở" : "Open-source project"}</p>
            <p className="font-bold">
              {hub.name}: {vi ? "tự lắp & chạy thử" : "build it yourself"}
            </p>
            <p className="muted text-sm">
              {vi ? "Danh sách linh kiện, sơ đồ đấu dây, hướng dẫn sửa lỗi và firmware." : "Parts list, wiring, troubleshooting and firmware."}
            </p>
          </div>
        </div>
        <Link href={`/${hub.slug}`} className="btn-primary">
          {vi ? "Mở Project Hub" : "Open Project Hub"} →
        </Link>
      </div>
    </div>
  );
}

// Nhãn nhỏ trên thẻ dự án. `asLink=false` khi thẻ cha đã là một link (tránh <a> lồng nhau).
export function HubBadge({ slug, asLink = true }: { slug: string; asLink?: boolean }) {
  const { lang } = useLanguage();
  const hub = useHubForCaseStudy(slug);
  if (!hub) return null;
  const className = "chip gap-1 border-emerald-400/60 text-emerald-700 dark:text-emerald-300";
  const label = (
    <>
      {hub.emoji} {lang === "vi" ? "Có hướng dẫn tự lắp" : "DIY guide available"}
    </>
  );
  if (!asLink) return <span className={className}>{label}</span>;
  return (
    <Link href={`/${hub.slug}`} className={`${className} hover:bg-emerald-50 dark:hover:bg-emerald-500/10`}>
      {label}
    </Link>
  );
}
