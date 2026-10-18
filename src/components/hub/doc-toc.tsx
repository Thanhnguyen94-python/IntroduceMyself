"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import type { HubDocTocItem } from "@/lib/hubs/types";

// Mục lục bên phải, tự đánh dấu heading đang đọc.
export function DocToc({ items }: { items: HubDocTocItem[] }) {
  const { lang } = useLanguage();
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (!items.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );
    items.forEach((item) => {
      const node = document.getElementById(item.id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <nav className="sticky top-24 text-sm" aria-label="On this page">
      <p className="eyebrow">{lang === "vi" ? "Trong bài này" : "On this page"}</p>
      <ul className="mt-3 space-y-1.5 border-l" style={{ borderColor: "var(--border)" }}>
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: item.depth === 3 ? 22 : 10 }}>
            <a
              href={`#${item.id}`}
              className={`-ml-px block border-l-2 pl-2 transition ${
                activeId === item.id
                  ? "border-brand-500 font-medium text-brand-700 dark:text-brand-200"
                  : "muted border-transparent hover:text-[color:var(--text)]"
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
