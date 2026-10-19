"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import { useHubs } from "@/components/hub/hub-links";

export function SiteFooter({ variant = "portfolio" }: { variant?: "portfolio" | "hub" }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const hubs = useHubs();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center">
        <p className="muted" title={vi ? "Web ghi thống kê truy cập ẩn danh: không cookie theo dõi, không lưu địa chỉ IP." : "Anonymous visit statistics: no tracking cookies, no IP addresses stored."}>
          © {year} Mr Jay ·{" "}
          {variant === "portfolio"
            ? vi
              ? "Kỹ sư SMT · Cải tiến dây chuyền · AI/IoT"
              : "SMT Engineer · Line improvement · AI/IoT"
            : vi
              ? "Project Hub mã nguồn mở cho maker"
              : "Open project hub for makers"}
          <span className="block text-xs opacity-80">
            {vi ? "Thống kê truy cập ẩn danh · không cookie theo dõi · không lưu IP" : "Anonymous analytics · no tracking cookies · no IPs stored"}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {variant === "portfolio" ? (
            <>
              {/* Lối sang Project Hub cho người muốn tự lắp robot (không phải link nạp firmware). */}
              {hubs.map((hub) => (
                <Link key={hub.slug} href={`/${hub.slug}`} className="muted hover:text-brand-600">
                  {hub.emoji} {vi ? `Dự án mở: ${hub.name}` : `Open project: ${hub.name}`}
                </Link>
              ))}
              <Link href="/cv" className="muted hover:text-brand-600">
                CV
              </Link>
            </>
          ) : (
            <Link href="/" className="muted hover:text-brand-600">
              {vi ? "Về tác giả" : "About the author"}
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
