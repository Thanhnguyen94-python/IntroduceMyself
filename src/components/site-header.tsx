"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { ui } from "@/lib/content/i18n";
import { ThemeToggle } from "@/components/theme-toggle";

const menu = [
  { href: "/tong-quan", key: "overview" as const },
  { href: "/hanh-trinh", key: "journey" as const },
  { href: "/du-an", key: "projects" as const },
  { href: "/tai-lieu-ky-thuat", key: "docs" as const }
];

export function SiteHeader() {
  const pathname = usePathname();
  const { lang, setLang } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur dark:bg-slate-900/80" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Link href="/tong-quan" className="min-w-0 flex-1 truncate text-sm font-bold text-brand-600 dark:text-brand-300 sm:text-base">
            Mr Jay | SMT Engineer
          </Link>
          <nav className="hidden gap-2 md:flex">
            {menu.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-brand-600 text-white" : "hover:bg-brand-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {ui.nav[lang][item.key]}
                </Link>
              );
            })}
          </nav>
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="rounded-lg border px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              {lang.toUpperCase()}
            </button>
            <ThemeToggle />
          </div>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {menu.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={`mobile-${item.href}`}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                  active
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200/80 bg-white/70 dark:border-slate-700 dark:bg-slate-800/70"
                }`}
              >
                {ui.nav[lang][item.key]}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
