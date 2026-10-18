"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/layout/lang-toggle";
import type { HubSummary } from "@/lib/hubs/types";

const statusStyle: Record<HubSummary["status"], string> = {
  alpha: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  beta: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  stable: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
};

export function HubHeader({ hub, hasFirmware, otherHubs }: { hub: HubSummary; hasFirmware: boolean; otherHubs: HubSummary[] }) {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const base = `/${hub.slug}`;

  const nav = [
    { href: base, label: { vi: "Tổng quan", en: "Overview" }, exact: true },
    { href: `${base}/docs`, label: { vi: "Tài liệu", en: "Docs" } },
    ...(hasFirmware ? [{ href: `${base}/flash`, label: { vi: "Nạp firmware", en: "Flash" } }] : []),
    { href: `${base}/updates`, label: { vi: "Cập nhật", en: "Updates" } }
  ];

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  useEffect(() => {
    setOpen(false);
    setSwitcherOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!switcherOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) setSwitcherOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [switcherOpen]);

  return (
    <header className="glass sticky top-0 z-40 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="relative flex min-w-0 items-center gap-2" ref={switcherRef}>
          <Link href={base} className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-sky-400 text-lg shadow-md">
              {hub.emoji}
            </span>
            <span className="min-w-0 truncate font-bold">{hub.name}</span>
          </Link>
          <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase sm:inline ${statusStyle[hub.status]}`}>{hub.status}</span>
          {otherHubs.length > 0 && (
            <>
              <button
                onClick={() => setSwitcherOpen((v) => !v)}
                className="muted rounded-lg px-1.5 py-1 text-xs hover:bg-brand-50 dark:hover:bg-slate-800"
                aria-label="Switch project"
                aria-expanded={switcherOpen}
              >
                ▾
              </button>
              {switcherOpen && (
                <div className="absolute left-0 top-12 w-64 rounded-2xl border p-2 shadow-xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  {otherHubs.map((it) => (
                    <Link key={it.slug} href={`/${it.slug}`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-slate-800">
                      <span>{it.emoji}</span>
                      <span className="font-medium">{it.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Project hub">
          {nav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-brand-600 text-white shadow-sm" : "muted hover:bg-brand-50 hover:text-[color:var(--text)] dark:hover:bg-slate-800"
                }`}
              >
                {item.label[lang]}
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

      <div className={`grid overflow-hidden transition-[grid-template-rows] duration-300 md:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <nav className="min-h-0" aria-label="Project hub mobile">
          <div className="mx-4 mb-3 space-y-1 rounded-2xl border p-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {nav.map((item) => (
              <Link
                key={`m-${item.href}`}
                href={item.href}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive(item.href, item.exact) ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"
                }`}
              >
                {item.label[lang]}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
