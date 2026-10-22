"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/components/providers/language-provider";
import { glossaryEntry, splitGloss } from "@/lib/handbook/glossary";
import type { LocalizedText } from "@/lib/content/types";

const STORE_KEY = "handbook-gloss";

// Chữ thường (React) có nút "?" cạnh thuật ngữ. HTML từ Markdown dùng glossHtml() ở server.
export function GlossText({ t, text }: { t?: LocalizedText; text?: string }) {
  const { lang } = useLanguage();
  const value = text ?? ((t && lang === "en" && t.en) || t?.vi || "");
  return (
    <>
      {splitGloss(value).map((p, i) =>
        typeof p === "string" ? (
          p
        ) : (
          <span key={i}>
            {p.text}
            <button type="button" className="gloss-q" data-gloss={p.key} aria-label={`? ${p.key}`}>
              ?
            </button>
          </span>
        )
      )}
    </>
  );
}

// Công tắc bật/tắt dấu "?" (nhớ theo trình duyệt) + ô giải thích khi bấm "?".
export function GlossaryLayer() {
  const { lang } = useLanguage();
  const vi = lang !== "en";
  const [on, setOn] = useState(true);
  const [open, setOpen] = useState<{ key: string; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORE_KEY) === "off") setOn(false);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.dataset.gloss = on ? "on" : "off";
    if (!on) setOpen(null);
    return () => {
      delete document.documentElement.dataset.gloss;
    };
  }, [on]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const q = target.closest<HTMLElement>(".gloss-q");
      if (q?.dataset.gloss) {
        e.preventDefault();
        const r = q.getBoundingClientRect();
        const key = q.dataset.gloss;
        setOpen((cur) => (cur?.key === key ? null : { key, x: r.left + r.width / 2, y: r.bottom + 6 }));
        return;
      }
      if (!box.current?.contains(target)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const close = () => setOpen(null);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, { passive: true });
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close);
    };
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(STORE_KEY, next ? "on" : "off");
    } catch {}
  };

  const g = open && glossaryEntry(open.key);
  const left = open ? Math.min(Math.max(open.x - 150, 8), (typeof window === "undefined" ? 1000 : window.innerWidth) - 308) : 0;

  return (
    <>
      <button type="button" onClick={toggle} aria-pressed={on} className="btn-ghost smt-no-print" title={vi ? "Hiện / ẩn giải thích thuật ngữ" : "Show / hide term explanations"}>
        <span className="gloss-q !ml-0 !inline-flex" aria-hidden>
          ?
        </span>
        {vi ? (on ? "Thuật ngữ: Bật" : "Thuật ngữ: Tắt") : on ? "Terms: On" : "Terms: Off"}
      </button>
      {g &&
        open &&
        createPortal(
          <div ref={box} role="dialog" aria-label={g.term} className="gloss-pop fixed z-50 w-[300px] rounded-xl border p-3 text-sm shadow-xl" style={{ left, top: open.y }}>
            <p className="font-semibold">
              <span className="font-mono text-brand-600 dark:text-brand-300">{g.term}</span>
              <span className="muted font-normal"> · {g.full}</span>
            </p>
            <p className="mt-1">{vi ? g.vi : g.en}</p>
          </div>,
          document.body
        )}
    </>
  );
}
