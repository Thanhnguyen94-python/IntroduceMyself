"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/smt/smt-charts";
import { PasswordInput } from "@/components/ui/password-input";

// Đăng nhập / đổi mật khẩu tài khoản SMT (Trợ lý, Kỹ sư). Admin đăng nhập ở /admin/login như cũ.

async function send(method: string, body?: unknown) {
  const res = await fetch("/api/smt/auth", { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { message?: string; mustChangePassword?: boolean };
  if (!res.ok) throw new Error(data.message || "Thất bại.");
  return data;
}

export function SmtLoginForm({ next }: { next: string }) {
  const t = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await send("POST", { username, password });
      // Mật khẩu tạm do admin cấp -> bắt buộc đổi trước khi dùng.
      window.location.href = r.mustChangePassword ? `/smt/tai-khoan?first=1&next=${encodeURIComponent(next)}` : next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thất bại.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-3">
      <h1 className="text-xl font-bold">{t("Đăng nhập SMT Workspace", "Sign in to SMT Workspace")}</h1>
      <p className="muted text-sm">{t("Tài khoản do quản lý cấp cho trợ lý và kỹ sư.", "Accounts are issued by the manager to assistants and engineers.")}</p>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("Tên đăng nhập", "Username")}</span>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("Mật khẩu", "Password")}</span>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? t("Đang đăng nhập…", "Signing in…") : t("Đăng nhập", "Sign in")}
      </button>
      <p className="muted text-center text-xs">
        {t("Quản lý (admin)?", "Manager (admin)?")}{" "}
        <Link href={`/admin/login?next=${encodeURIComponent(next)}`} className="underline">
          {t("Đăng nhập admin", "Admin sign-in")}
        </Link>
      </p>
    </form>
  );
}

export function ChangePasswordForm({ first, next }: { first: boolean; next: string }) {
  const t = useT();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (newPassword !== confirm) return setError(t("Mật khẩu nhập lại không khớp.", "Passwords do not match."));
    try {
      await send("PATCH", { oldPassword, newPassword });
      if (first) window.location.href = next;
      else {
        setMsg(t("Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.", "Password changed. Other devices were signed out."));
        setOld("");
        setNew("");
        setConfirm("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thất bại.");
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">{first ? t("Đặt mật khẩu mới trước khi bắt đầu", "Set a new password to continue") : t("Đổi mật khẩu", "Change password")}</h2>
      <PasswordInput placeholder={first ? t("Mật khẩu tạm", "Temporary password") : t("Mật khẩu hiện tại", "Current password")} value={oldPassword} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" required />
      <PasswordInput placeholder={t("Mật khẩu mới (tối thiểu 8 ký tự)", "New password (min 8 chars)")} value={newPassword} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" minLength={8} required />
      <PasswordInput placeholder={t("Nhập lại mật khẩu mới", "Repeat new password")} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-emerald-700 dark:text-emerald-300">{msg}</p>}
      <button type="submit" className="btn-primary">
        {t("Lưu mật khẩu", "Save password")}
      </button>
    </form>
  );
}

export function LogoutButton({ admin = false }: { admin?: boolean }) {
  const t = useT();
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        if (admin) await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
        else await send("DELETE").catch(() => undefined);
        window.location.href = "/smt";
      }}
    >
      ⎋ {t("Đăng xuất", "Sign out")}
    </button>
  );
}
