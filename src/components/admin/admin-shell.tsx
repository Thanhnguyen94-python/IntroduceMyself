"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const groups: Array<{ title: string; items: Array<{ href: string; label: string; icon: string }> }> = [
  {
    title: "Portfolio (CMS)",
    items: [
      { href: "/admin", label: "Nội dung & hiển thị", icon: "📝" },
      { href: "/admin/layout", label: "Bố cục trang chủ", icon: "🧩" }
    ]
  },
  {
    title: "Project Hub",
    items: [
      { href: "/admin/hubs", label: "Danh sách Hub & Docs", icon: "📚" },
      { href: "/admin/firmware", label: "Phát hành firmware", icon: "📦" }
    ]
  },
  {
    title: "Người dùng",
    items: [
      { href: "/admin/inbox", label: "Hộp thư (chat & hỏi đáp)", icon: "💬" },
      { href: "/admin/analytics", label: "Thống kê truy cập", icon: "📊" }
    ]
  },
  {
    title: "Vận hành",
    items: [
      { href: "/admin/orders", label: "Đơn hàng", icon: "🧾" },
      { href: "/admin/xiaozhi", label: "Xiaozhi MCP", icon: "🔌" },
      { href: "/admin/account", label: "Đổi mật khẩu", icon: "🔑" },
      { href: "/admin/guide", label: "Hướng dẫn sử dụng", icon: "📖" }
    ]
  }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);

  // Số tin chat chưa đọc + câu hỏi chờ duyệt, cập nhật 30 giây/lần.
  useEffect(() => {
    const load = () =>
      fetch("/api/admin/chat?count=1", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { unreadChats?: number; pendingComments?: number }) => setInboxCount((d.unreadChats ?? 0) + (d.pendingComments ?? 0)))
        .catch(() => undefined);
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const sidebar = (
    <nav className="space-y-5 text-sm" aria-label="Admin">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="eyebrow px-3">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 transition ${
                    isActive(item.href) ? "bg-brand-600 font-semibold text-white shadow-sm" : "hover:bg-brand-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/admin/inbox" && inboxCount > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{inboxCount}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="space-y-1 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        <a href="/" target="_blank" rel="noreferrer" className="muted block rounded-xl px-3 py-2 hover:bg-brand-50 dark:hover:bg-slate-800">
          ↗ Xem Portfolio
        </a>
        <a href="/joy" target="_blank" rel="noreferrer" className="muted block rounded-xl px-3 py-2 hover:bg-brand-50 dark:hover:bg-slate-800">
          ↗ Xem Project Hub
        </a>
        <button onClick={logout} className="block w-full rounded-xl px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
          ⎋ Đăng xuất
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-40 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              className="grid h-9 w-9 place-items-center rounded-xl border lg:hidden"
              style={{ borderColor: "var(--border)" }}
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={open}
            >
              {open ? "✕" : "☰"}
            </button>
            <Link href="/admin" className="flex items-center gap-2 font-bold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-xs text-white dark:bg-white dark:text-slate-900">CMS</span>
              Mr Jay Admin
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className={`${open ? "block" : "hidden"} lg:block`}>
          <div className="card lg:sticky lg:top-20">{sidebar}</div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
