"use client";

import { useState, type FormEvent } from "react";

export function AdminLoginForm() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        setError("Sai tài khoản hoặc mật khẩu.");
        return;
      }

      window.location.href = "/admin";
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card mx-auto mt-8 w-full max-w-md space-y-3">
      <h1 className="text-xl font-bold text-brand-600 dark:text-brand-300">Đăng nhập Admin</h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Chỉ tài khoản admin mới có quyền chỉnh sửa nội dung, giá và hình ảnh.
      </p>

      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        placeholder="Username"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        placeholder="Password"
        required
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
