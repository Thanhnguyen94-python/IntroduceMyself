"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HANDBOOK_CATEGORIES, categoryOf, fold, searchText, type HandbookEntry } from "@/lib/handbook/types";

type Payload = { entries: HandbookEntry[]; source: "db" | "default"; error?: string };

export function HandbookList() {
  const [data, setData] = useState<Payload | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/handbook", { cache: "no-store" });
    const payload = (await res.json()) as Payload & { message?: string };
    if (!res.ok) return setMessage({ ok: false, text: payload.message ?? "Không đọc được sổ tay." });
    setData(payload);
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    return (data?.entries ?? []).filter((e) => (cat === "all" || e.category === cat) && words.every((w) => searchText(e).includes(w)));
  }, [data, q, cat]);

  async function importDefaults() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/handbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import" }) });
    const payload = (await res.json()) as { added?: number; message?: string };
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: payload.message ?? "Nạp thất bại." });
    setMessage({ ok: true, text: payload.added ? `Đã nạp ${payload.added} mục mặc định vào database. Giờ bạn có thể sửa từng mục.` : "Database đã có đủ các mục mặc định." });
    await load();
  }

  async function toggle(e: HandbookEntry) {
    await fetch("/api/admin/handbook", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id, status: e.status === "published" ? "draft" : "published" }) });
    await load();
  }

  async function remove(e: HandbookEntry) {
    if (!window.confirm(`Xoá mục "${e.title.vi}"? Không hoàn tác được (mục mặc định có thể nạp lại).`)) return;
    await fetch(`/api/admin/handbook?id=${e.id}`, { method: "DELETE" });
    await load();
  }

  const isDefault = data?.source === "default";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">📘 Sổ tay SMT</h1>
          <p className="muted text-sm">
            {data ? `${data.entries.length} mục · ${data.entries.filter((e) => e.status === "draft").length} nháp` : "Đang tải…"} · hiển thị tại{" "}
            <a href="/tai-lieu-ky-thuat/so-tay" target="_blank" rel="noreferrer" className="text-brand-600 underline dark:text-brand-300">
              /tai-lieu-ky-thuat/so-tay
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isDefault && (
            <button type="button" className="btn-ghost" onClick={importDefaults} disabled={busy} title="Thêm lại các mục mặc định đã xoá; không ghi đè mục đã sửa">
              ↺ Nạp mục mặc định còn thiếu
            </button>
          )}
          {isDefault ? (
            <span className="btn-primary pointer-events-none opacity-50" aria-disabled>
              + Thêm mục
            </span>
          ) : (
            <Link href="/admin/smt/handbook/new" className="btn-primary">
              + Thêm mục
            </Link>
          )}
        </div>
      </div>

      {isDefault && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <span>
            Database chưa có mục nào – web đang hiện <b>bộ mặc định viết sẵn ({data?.entries.length} mục)</b>. Nạp vào database để sửa, thêm, ẩn từng mục.
            {data?.error && <span className="block text-xs">Lỗi đọc bảng: {data.error} (đã chạy migration 202610220001_smt_handbook.sql chưa?)</span>}
          </span>
          <button type="button" className="btn-primary" onClick={importDefaults} disabled={busy}>
            {busy ? "Đang nạp…" : "📥 Nạp bộ mặc định để chỉnh sửa"}
          </button>
        </div>
      )}
      {message && <p className={`rounded-xl border px-3 py-2 text-sm ${message.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-red-300 bg-red-50 text-red-700"}`}>{message.text}</p>}

      <div className="card flex flex-wrap items-center gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="input max-w-sm flex-1" placeholder="Tìm: cpk, reflow, msl…" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="input w-auto">
          <option value="all">Tất cả nhóm</option>
          {HANDBOOK_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.vi}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs" style={{ background: "color-mix(in srgb, var(--border) 40%, transparent)" }}>
              <th className="px-3 py-2">Ký hiệu</th>
              <th className="px-3 py-2">Tiêu đề</th>
              <th className="px-3 py-2">Nhóm</th>
              <th className="px-3 py-2 text-center">Thứ tự</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <tr key={e.id || e.slug} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-3 py-2 font-mono font-bold">{e.symbol}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{e.title.vi}</span>
                  {e.calculator && <span className="chip ml-2">🧮</span>}
                  <span className="muted block text-xs">/{e.slug}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {categoryOf(e.category).icon} {categoryOf(e.category).vi}
                </td>
                <td className="px-3 py-2 text-center tabular-nums">{e.sortOrder}</td>
                <td className="px-3 py-2">
                  {isDefault ? (
                    <span className="chip">Mặc định</span>
                  ) : (
                    <button type="button" onClick={() => void toggle(e)} className={`chip ${e.status === "published" ? "!border-emerald-400" : "!border-amber-400"}`} title="Bấm để đổi">
                      {e.status === "published" ? "✓ Hiện" : "◌ Nháp"}
                    </button>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold">
                  <a href={`/tai-lieu-ky-thuat/so-tay/${e.slug}`} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-300">
                    Xem
                  </a>
                  {!isDefault && (
                    <>
                      <Link href={`/admin/smt/handbook/${e.id}`} className="ml-3 text-brand-600 dark:text-brand-300">
                        Sửa
                      </Link>
                      <button type="button" className="ml-3 text-red-600" onClick={() => void remove(e)}>
                        Xoá
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
