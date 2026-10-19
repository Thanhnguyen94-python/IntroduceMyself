"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/layout/lang-toggle";
import { useShop } from "@/components/shop/shop-provider";
import { formatVnd, shippingFeeFor } from "@/lib/shop/types";

// Khung trang của cửa hàng: thanh thông báo, header (có giỏ hàng), ngăn kéo giỏ hàng, footer.

export function ShopHeader() {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const pathname = usePathname();
  const { settings, count, setDrawerOpen, ready } = useShop();
  const [bump, setBump] = useState(false);
  const prevCount = useRef(count);
  const announcement = settings.announcement[lang] || settings.announcement.vi;

  // Nảy nhẹ biểu tượng giỏ khi vừa thêm hàng.
  useEffect(() => {
    if (ready && count > prevCount.current) {
      setBump(true);
      const timer = window.setTimeout(() => setBump(false), 400);
      prevCount.current = count;
      return () => window.clearTimeout(timer);
    }
    prevCount.current = count;
  }, [count, ready]);

  const nav = [
    { href: "/shop", label: vi ? "Sản phẩm" : "Products", exact: true },
    { href: "/shop/don-hang", label: vi ? "Tra cứu đơn" : "Track order" }
  ];
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href || pathname.startsWith("/shop/san-pham") : pathname.startsWith(href));

  return (
    <>
      {announcement && (
        <div className="bg-brand-600 px-4 py-1.5 text-center text-xs font-medium text-white">{announcement}</div>
      )}
      <header className="glass sticky top-0 z-40 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/shop" className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-sky-400 text-lg shadow-md" aria-hidden>
              🛍️
            </span>
            <span className="min-w-0 truncate font-bold">{settings.name}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Shop">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href, item.exact) ? "page" : undefined}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive(item.href, item.exact) ? "bg-brand-600 text-white shadow-sm" : "muted hover:bg-brand-50 hover:text-[color:var(--text)] dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/shop/don-hang" className="grid h-9 w-9 place-items-center rounded-xl border md:hidden" style={{ borderColor: "var(--border)" }} aria-label={vi ? "Tra cứu đơn" : "Track order"}>
              📦
            </Link>
            <LangToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={`relative grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 ${bump ? "scale-110" : ""}`}
              aria-label={vi ? `Giỏ hàng, ${count} sản phẩm` : `Cart, ${count} items`}
            >
              🛒
              {ready && count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-[color:var(--surface)]">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

export function CartDrawer() {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const { settings, lines, subtotal, drawerOpen, setDrawerOpen, setQuantity, remove, toast } = useShop();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const fee = shippingFeeFor(subtotal, settings);
  const toFree = settings.shipping.freeFrom > 0 ? settings.shipping.freeFrom - subtotal : 0;

  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !drawerOpen);
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawerOpen]);

  useEffect(() => setDrawerOpen(false), [pathname, setDrawerOpen]);

  return (
    <>
      {/* Thông báo nhỏ khi thêm vào giỏ (đọc được bằng trình đọc màn hình) */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex justify-center px-4">
        {toast && !drawerOpen && (
          <p className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-slate-900">
            ✓ {vi ? "Đã thêm" : "Added"}: {toast}
          </p>
        )}
      </div>

      <div className={`fixed inset-0 z-[70] bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setDrawerOpen(false)} aria-hidden />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={vi ? "Giỏ hàng" : "Cart"}
        className={`fixed inset-y-0 right-0 z-[75] flex w-full max-w-md flex-col shadow-2xl transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "var(--surface)" }}
      >
        <header className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-bold">
            🛒 {vi ? "Giỏ hàng" : "Cart"} <span className="muted text-sm font-medium">({lines.length})</span>
          </h2>
          <button type="button" onClick={() => setDrawerOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-brand-50 dark:hover:bg-slate-800" aria-label={vi ? "Đóng" : "Close"}>
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {lines.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-4xl">🧺</p>
              <p className="muted mt-3 text-sm">{vi ? "Giỏ hàng đang trống." : "Your cart is empty."}</p>
              <button type="button" onClick={() => setDrawerOpen(false)} className="btn-ghost mt-4">
                {vi ? "Tiếp tục xem hàng" : "Keep browsing"}
              </button>
            </div>
          )}
          {lines.map((line) => (
            <div key={line.key} className="flex gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
              <Link href={`/shop/san-pham/${line.slug}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {line.image && <img src={line.image} alt="" className="h-full w-full object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/shop/san-pham/${line.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-brand-600">
                  {line.name}
                </Link>
                {Object.values(line.options).length > 0 && <p className="muted text-xs">{Object.values(line.options).join(" · ")}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <QuantityStepper value={line.quantity} max={line.maxQuantity} onChange={(q) => setQuantity(line.key, q)} small />
                  <p className="text-sm font-bold tabular-nums">{formatVnd(line.price * line.quantity)}</p>
                </div>
              </div>
              <button type="button" onClick={() => remove(line.key)} className="muted self-start text-sm hover:text-red-600" aria-label={vi ? `Xoá ${line.name}` : `Remove ${line.name}`}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {lines.length > 0 && (
          <footer className="space-y-3 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
            {toFree > 0 && (
              <div className="space-y-1">
                <p className="text-xs">
                  {vi ? "Mua thêm " : "Add "}
                  <b>{formatVnd(toFree)}</b>
                  {vi ? " để được miễn phí ship" : " for free shipping"}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, (subtotal / settings.shipping.freeFrom) * 100)}%` }} />
                </div>
              </div>
            )}
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="muted">{vi ? "Tạm tính" : "Subtotal"}</dt>
                <dd className="tabular-nums">{formatVnd(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="muted">{vi ? "Phí ship" : "Shipping"}</dt>
                <dd className="tabular-nums">{fee ? formatVnd(fee) : vi ? "Miễn phí" : "Free"}</dd>
              </div>
              <div className="flex justify-between text-base font-bold">
                <dt>{vi ? "Tổng" : "Total"}</dt>
                <dd className="tabular-nums text-brand-700 dark:text-brand-300">{formatVnd(subtotal + fee)}</dd>
              </div>
            </dl>
            <Link href="/shop/thanh-toan" className="btn-primary w-full py-3 text-base">
              {vi ? "Đặt hàng →" : "Checkout →"}
            </Link>
          </footer>
        )}
      </aside>
    </>
  );
}

export function QuantityStepper({ value, max, onChange, small = false }: { value: number; max: number | null; onChange: (value: number) => void; small?: boolean }) {
  const { lang } = useLanguage();
  const limit = Math.min(max ?? 99, 99);
  const size = small ? "h-8 w-8" : "h-11 w-11";
  return (
    <div className="inline-flex items-center rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <button type="button" className={`${size} grid place-items-center text-lg disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={lang === "vi" ? "Giảm số lượng" : "Decrease"}>
        −
      </button>
      <input
        value={value}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 1)}
        inputMode="numeric"
        className={`${small ? "w-8 text-sm" : "w-12"} bg-transparent text-center font-semibold tabular-nums outline-none`}
        aria-label={lang === "vi" ? "Số lượng" : "Quantity"}
      />
      <button type="button" className={`${size} grid place-items-center text-lg disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= limit} aria-label={lang === "vi" ? "Tăng số lượng" : "Increase"}>
        +
      </button>
    </div>
  );
}

export function ShopFooter() {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const { settings } = useShop();
  const { phone, zalo, email } = settings.contact;
  return (
    <footer className="mt-16 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-3">
        <div>
          <p className="font-bold">{settings.name}</p>
          <p className="muted mt-2">{settings.tagline[lang] || settings.tagline.vi}</p>
        </div>
        <div>
          <p className="font-semibold">{vi ? "Liên hệ" : "Contact"}</p>
          <ul className="muted mt-2 space-y-1">
            {phone && (
              <li>
                <a href={`tel:${phone}`} className="hover:text-brand-600">
                  📞 {phone}
                </a>
              </li>
            )}
            {zalo && (
              <li>
                <a href={`https://zalo.me/${zalo}`} target="_blank" rel="noreferrer" className="hover:text-brand-600">
                  💬 Zalo {zalo}
                </a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="hover:text-brand-600">
                  ✉ {email}
                </a>
              </li>
            )}
            <li>
              <Link href="/shop/don-hang" className="hover:text-brand-600">
                📦 {vi ? "Tra cứu đơn hàng" : "Track an order"}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">{vi ? "Chính sách" : "Policies"}</p>
          <p className="muted mt-2 whitespace-pre-line">{settings.policies[lang] || settings.policies.vi}</p>
        </div>
      </div>
      <p className="muted border-t px-4 py-4 text-center text-xs" style={{ borderColor: "var(--border)" }}>
        © {new Date().getFullYear()} {settings.name} · {vi ? "Thống kê truy cập ẩn danh, không lưu IP" : "Anonymous analytics, no IPs stored"}
      </p>
    </footer>
  );
}
