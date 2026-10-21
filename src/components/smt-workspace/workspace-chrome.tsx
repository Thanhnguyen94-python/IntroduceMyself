"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/layout/lang-toggle";
import { useT } from "@/components/smt/smt-charts";
import { SMT_MODE_COOKIE, type SmtMode } from "@/lib/smt/mode";
import { ROLE_LABEL, type SmtRole } from "@/lib/smt/permissions";

// Khung trang SMT Workspace (/smt): header riêng, nút Demo / Thực tế, băng thông báo chế độ.

type ChromeProps = { mode: SmtMode; liveAllowed: boolean; user: { name: string; role: SmtRole } | null; stored: boolean; demoTo: string | null; adminPreview: boolean; pending: number };

// roles: ai thấy mục menu (bỏ trống = mọi người).
const NAV: Array<{ href: string; vi: string; en: string; exact?: boolean; roles?: SmtRole[] }> = [
  { href: "/smt", vi: "Tổng quan", en: "Overview", exact: true },
  { href: "/smt/line", vi: "Line", en: "Lines" },
  { href: "/smt/bao-cao", vi: "Báo cáo", en: "Reports" },
  { href: "/smt/cong-viec", vi: "Công việc", en: "Tasks" },
  { href: "/smt/doi-ngu", vi: "Đội ngũ", en: "Team" },
  { href: "/smt/chat", vi: "Thảo luận", en: "Chat", roles: ["admin", "assistant", "engineer"] },
  { href: "/smt/bao-cao-tu-dong", vi: "Báo cáo ngày/tuần", en: "Daily/weekly", roles: ["admin", "assistant", "engineer"] },
  { href: "/smt/nhap-lieu", vi: "Nhập liệu", en: "Data entry", roles: ["admin", "assistant"] },
  { href: "/smt/quan-tri", vi: "Quản trị", en: "Manage", roles: ["admin", "assistant"] }
];

export function ModeSwitch({ mode, liveAllowed }: { mode: SmtMode; liveAllowed: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (m: SmtMode) => {
    // Cookie của riêng trình duyệt này -> người khác không bị ảnh hưởng.
    document.cookie = `${SMT_MODE_COOKIE}=${m}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  const btn = (m: SmtMode, label: string, disabled = false) => (
    <button
      type="button"
      onClick={() => set(m)}
      disabled={disabled || pending}
      aria-pressed={mode === m}
      title={disabled ? t("Dữ liệu thực tế chỉ dành cho admin", "Live data is admin-only") : undefined}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${mode === m ? "bg-brand-600 text-white shadow-sm" : "muted hover:text-[color:var(--text)]"} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 rounded-xl border p-0.5" style={{ borderColor: "var(--border)" }} role="group" aria-label={t("Nguồn dữ liệu", "Data source")}>
      {btn("demo", "Demo")}
      {btn("live", t("Thực tế", "Live"), !liveAllowed)}
    </div>
  );
}

export function WorkspaceHeader({ mode, liveAllowed, user, stored, demoTo, adminPreview, pending }: ChromeProps) {
  const t = useT();
  const isAdmin = user?.role === "admin";
  const nav = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const range = search.get("range");
  // Giữ kỳ đang xem khi chuyển trang (Tổng quan ↔ Line).
  const withRange = (href: string) => (range && (href === "/smt" || href === "/smt/line") ? `${href}?range=${range}` : href);

  return (
    <>
      <header className="glass smt-no-print sticky top-0 z-40 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/smt" className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-sky-400 text-lg shadow-md" aria-hidden>
              🏭
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold leading-tight">SMT Workspace</span>
              <span className="muted block truncate text-[11px] leading-tight">{t("Sản xuất · Chất lượng · Đội ngũ", "Production · Quality · Team")}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex" aria-label="SMT">
            {nav.map((n) => (
              <Link key={n.href} href={withRange(n.href)} aria-current={active(n.href, n.exact) ? "page" : undefined} className={`rounded-xl px-2.5 py-2 text-sm font-medium transition ${active(n.href, n.exact) ? "bg-brand-600 text-white shadow-sm" : "muted hover:bg-brand-50 hover:text-[color:var(--text)] dark:hover:bg-slate-800"}`}>
                {t(n.vi, n.en)}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <ModeSwitch mode={mode} liveAllowed={liveAllowed} />
            {isAdmin && pending > 0 && (
              <Link href="/smt/quan-tri#xoa" className="relative grid h-9 w-9 place-items-center rounded-xl border" style={{ borderColor: "var(--border)" }} aria-label={t(`${pending} yêu cầu xoá chờ duyệt`, `${pending} delete requests pending`)} title={t("Yêu cầu xoá chờ duyệt", "Delete requests pending")}>
                🔔
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{pending}</span>
              </Link>
            )}
            {user ? (
              <Link href="/smt/tai-khoan" className="hidden max-w-[150px] items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs md:flex" style={{ borderColor: "var(--border)" }} title={t(ROLE_LABEL[user.role].vi, ROLE_LABEL[user.role].en)}>
                <span aria-hidden>👤</span>
                <span className="truncate font-semibold">{user.name}</span>
              </Link>
            ) : (
              <Link href="/smt/dang-nhap" className="hidden rounded-xl border px-2.5 py-1.5 text-xs font-semibold md:block" style={{ borderColor: "var(--border)" }}>
                {t("Đăng nhập", "Sign in")}
              </Link>
            )}
            <span className="hidden sm:contents">
              <LangToggle />
              <ThemeToggle />
            </span>
            <button type="button" onClick={() => setOpen((v) => !v)} className="grid h-9 w-9 place-items-center rounded-xl border xl:hidden" style={{ borderColor: "var(--border)" }} aria-expanded={open} aria-label="Menu">
              ☰
            </button>
          </div>
        </div>
        {open && (
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 pb-3 xl:hidden" aria-label="SMT mobile">
            {nav.map((n) => (
              <Link key={n.href} href={withRange(n.href)} onClick={() => setOpen(false)} className={`rounded-xl px-3 py-2 text-sm font-medium ${active(n.href, n.exact) ? "bg-brand-600 text-white" : ""}`}>
                {t(n.vi, n.en)}
              </Link>
            ))}
            <Link href={user ? "/smt/tai-khoan" : "/smt/dang-nhap"} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm font-medium md:hidden">
              👤 {user ? user.name : t("Đăng nhập", "Sign in")}
            </Link>
            <div className="flex gap-2 pt-1 sm:hidden">
              <LangToggle />
              <ThemeToggle />
            </div>
          </nav>
        )}
      </header>
      {adminPreview && (
        <p className="smt-no-print bg-amber-400 px-4 py-2 text-center text-sm font-medium text-slate-900">
          👁 SMT Workspace đang <b>TẮT</b> với khách (chỉ admin xem được). Bật trong Admin → Nội dung &amp; hiển thị → “SMT Workspace (/smt)”.
        </p>
      )}
      {mode === "demo" ? (
        <p className="smt-no-print border-b px-4 py-1.5 text-center text-xs" style={{ borderColor: "var(--border)", background: "var(--viz-1-wash)" }}>
          🧪 {t("Đang xem DỮ LIỆU DEMO: nhà máy mô phỏng 10 line, không phải số liệu thật.", "Viewing DEMO DATA: a simulated 10-line factory, not real figures.")}
          {demoTo && <> {t(`Dữ liệu đến ${demoTo.split("-").reverse().join("/")}.`, `Data up to ${demoTo}.`)}</>}
          {isAdmin && !stored && (
            <>
              {" "}
              <Link href="/admin/smt/demo" className="font-semibold underline">
                {t("Lưu demo vào database để giao việc thử", "Store demo in DB to try task editing")}
              </Link>
            </>
          )}
        </p>
      ) : (
        !user && (
          <p className="smt-no-print border-b px-4 py-1.5 text-center text-xs" style={{ borderColor: "var(--border)" }}>
            {t("Số liệu thực tế đã tổng hợp (ẩn ghi chú, work order, người phụ trách).", "Aggregated live figures (notes, work orders and owners hidden).")}
          </p>
        )
      )}
    </>
  );
}

export function WorkspaceFooter() {
  const t = useT();
  return (
    <footer className="smt-no-print border-t py-6 text-sm" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4">
        <p className="muted">© Mr Jay · SMT Workspace</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="font-semibold text-brand-600 dark:text-brand-300">
            ← {t("Hồ sơ Mr Jay", "Mr Jay's profile")}
          </Link>
          <Link href="/tai-lieu-ky-thuat/smt-reports" className="muted hover:underline">
            {t("Mẫu báo cáo SMT", "SMT report templates")}
          </Link>
          <Link href="/tai-lieu-ky-thuat/so-tay" className="muted hover:underline">
            {t("Sổ tay SMT", "SMT handbook")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

// Thanh chọn kỳ (giữ trong URL để chia sẻ link được).
export function RangeTabs({ value, ranges }: { value: string; ranges: Array<{ id: string; vi: string; en: string }> }) {
  const t = useT();
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={t("Kỳ xem", "Period")}>
      {ranges.map((r) => (
        <Link key={r.id} href={`${pathname}?range=${r.id}`} aria-pressed={value === r.id} className={`chip ${value === r.id ? "!border-brand-500 font-semibold text-brand-700 dark:text-brand-200" : ""}`} scroll={false}>
          {t(r.vi, r.en)}
        </Link>
      ))}
    </div>
  );
}
