"use client";

import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/ui/password-input";

type Notice = { type: "success" | "error"; text: string } | null;

function strengthOf(pw: string) {
  let score = 0;
  if (pw.length >= 10) score += 1;
  if (pw.length >= 14) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

const strengthLabel = ["Rất yếu", "Yếu", "Trung bình", "Khá", "Mạnh", "Rất mạnh"];
const strengthColor = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];

export function ChangePasswordForm({ username }: { username: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const strength = strengthOf(next);
  const mismatch = confirm.length > 0 && confirm !== next;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    if (next !== confirm) {
      setNotice({ type: "error", text: "Mật khẩu nhập lại không khớp." });
      return;
    }
    setSaving(true);
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next })
    });
    setSaving(false);
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setNotice({ type: "error", text: payload.message ?? "Đổi mật khẩu thất bại." });
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setNotice({ type: "success", text: "Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới." });
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Đổi mật khẩu</h1>
        <p className="muted text-sm">
          Tài khoản: <b>{username}</b>
        </p>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Mật khẩu hiện tại</span>
        <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Mật khẩu mới (tối thiểu 10 ký tự)</span>
        <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={10} required />
        {next && (
          <span className="flex items-center gap-2 pt-1">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <span className={`block h-full transition-all ${strengthColor[strength]}`} style={{ width: `${(strength / 5) * 100}%` }} />
            </span>
            <span className="muted w-20 text-right text-xs">{strengthLabel[strength]}</span>
          </span>
        )}
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Nhập lại mật khẩu mới</span>
        <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        {mismatch && <span className="text-xs text-red-600">Chưa khớp với mật khẩu mới.</span>}
      </label>

      {notice && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            notice.type === "success" ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <button disabled={saving || mismatch || next.length < 10} className="btn-primary w-full">
        {saving ? "Đang lưu..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
