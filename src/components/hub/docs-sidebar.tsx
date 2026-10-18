"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import type { LocalizedText } from "@/lib/content/types";

export type SidebarGroup = {
  id: string;
  icon?: string;
  title: LocalizedText;
  docs: Array<{ title: string; path: string }>;
};

export function DocsSidebar({ basePath, groups }: { basePath: string; groups: SidebarGroup[] }) {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const list = (
    <nav className="space-y-5 text-sm" aria-label="Docs">
      <Link
        href={basePath}
        className={`block rounded-lg px-3 py-1.5 font-medium ${pathname === basePath ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
      >
        📚 {lang === "vi" ? "Mục lục tài liệu" : "Docs home"}
      </Link>
      {groups.map((group) => (
        <div key={group.id}>
          <p className="eyebrow px-3">
            {group.icon} {group.title[lang] || group.title.vi}
          </p>
          <ul className="mt-2 space-y-0.5 border-l pl-2" style={{ borderColor: "var(--border)" }}>
            {group.docs.map((doc) => {
              const active = pathname === doc.path;
              return (
                <li key={doc.path}>
                  <Link
                    href={doc.path}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-1.5 transition ${
                      active ? "bg-brand-500/10 font-semibold text-brand-700 dark:text-brand-200" : "muted hover:text-[color:var(--text)]"
                    }`}
                  >
                    {doc.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <button className="btn-ghost w-full justify-between lg:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>📚 {lang === "vi" ? "Danh mục tài liệu" : "Docs menu"}</span>
        <span>{open ? "▴" : "▾"}</span>
      </button>
      <div className={`${open ? "block" : "hidden"} card mt-2 lg:hidden`}>{list}</div>
      <div className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 lg:block">{list}</div>
    </>
  );
}
