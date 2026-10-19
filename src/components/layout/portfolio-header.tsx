"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/layout/lang-toggle";
import { isPageEnabled, type PortfolioPageKey, type SiteVisibilityConfig } from "@/lib/site-visibility-types";

// Menu không gian Portfolio (dành cho nhà tuyển dụng). Không chứa link nạp firmware / Project Hub / Cửa hàng.
const menu: Array<{ href: string; pageKey: PortfolioPageKey; label: { vi: string; en: string } }> = [
  { href: "/", pageKey: "overview", label: { vi: "Trang chủ", en: "Home" } },
  { href: "/hanh-trinh", pageKey: "journey", label: { vi: "Hành trình", en: "Journey" } },
  { href: "/du-an", pageKey: "projects", label: { vi: "Case Study", en: "Case Studies" } },
  { href: "/tai-lieu-ky-thuat", pageKey: "docs", label: { vi: "Tài liệu", en: "Documents" } }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/tong-quan";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortfolioHeader() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [visibility, setVisibility] = useState<SiteVisibilityConfig>({ schemaVersion: 1, pages: {} });
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/site/visibility", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: SiteVisibilityConfig | null) => {
        if (mounted && payload?.pages) setVisibility(payload);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const visibleMenu = useMemo(() => menu.filter((item) => isPageEnabled(visibility, item.pageKey)), [visibility]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-shadow ${scrolled ? "glass shadow-sm" : "bg-transparent"}`}
      style={{ borderColor: scrolled ? "var(--border)" : "transparent" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-md transition group-hover:rotate-6">
            MJ
          </span>
          <span className="min-w-0 truncate text-sm font-bold sm:text-base">
            Mr Jay <span className="muted font-medium">· SMT Engineer</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Portfolio">
          {visibleMenu.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active ? "text-brand-700 dark:text-brand-200" : "muted hover:text-[color:var(--text)]"
                }`}
              >
                {item.label[lang]}
                <span
                  className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-500 transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LangToggle />
          <ThemeToggle />
          <button
            className="grid h-9 w-9 place-items-center rounded-xl border md:hidden"
            style={{ borderColor: "var(--border)" }}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Menu"
          >
            <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 md:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <nav className="min-h-0" aria-label="Portfolio mobile">
          <div className="glass mx-4 mb-3 space-y-1 rounded-2xl border p-2" style={{ borderColor: "var(--border)" }}>
            {visibleMenu.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={`m-${item.href}`}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label[lang]}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
