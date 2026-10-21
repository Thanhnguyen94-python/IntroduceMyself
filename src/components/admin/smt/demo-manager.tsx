"use client";

import { useCallback, useEffect, useState } from "react";
import type { DemoMeta } from "@/lib/smt/demo-meta";
import type { StorageStats } from "@/lib/smt/demo-store";
import { num } from "@/lib/smt/types";

// Admin → SMT → Dữ liệu demo & dung lượng.
// Tạo demo chạy từng bước (danh mục + mỗi tháng 1 request) để không bị timeout và thấy được tiến độ.

type Status = { meta: DemoMeta | null; storage: StorageStats | null; storageError?: string };

const TABLE_LABEL: Record<string, string> = {
  smt_production_logs: "Nhật ký sản xuất",
  smt_defect_logs: "Nhật ký lỗi",
  smt_asset_logs: "Nhật ký feeder / nozzle",
  smt_assets: "Danh mục feeder / nozzle",
  smt_cycle_times: "Cycle time trạm",
  smt_4m_changes: "Thay đổi 4M1E",
  smt_8d_reports: "Báo cáo 8D",
  smt_engineers: "Kỹ sư",
  smt_tasks: "Công việc",
  smt_task_updates: "Nhật ký công việc"
};

const mb = (b: number) => `${(b / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
const dmy = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export function DemoManager() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/smt/demo", { cache: "no-store" });
    setStatus((await res.json()) as Status);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/smt/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { message?: string };
    if (!res.ok) throw new Error(data.message || "Thất bại.");
    return data;
  }

  async function seed() {
    if (status?.meta && !confirm("Xoá bộ demo hiện tại và tạo lại theo ngày hôm nay?")) return;
    setBusy("seed");
    setError("");
    try {
      const { window: win, steps } = (await call({ action: "start" })) as unknown as { window: { from: string; to: string }; steps: string[] };
      for (let i = 0; i < steps.length; i++) {
        setProgress({ done: i, total: steps.length + 1, label: steps[i] === "masters" ? "Danh mục, 8D, 4M, đội ngũ & công việc" : `Tháng ${steps[i].slice(5)}/${steps[i].slice(0, 4)}` });
        await call({ action: "step", step: steps[i], ...win });
      }
      setProgress({ done: steps.length, total: steps.length + 1, label: "Đếm số dòng" });
      await call({ action: "finish", ...win });
      setProgress(null);
      await load();
    } catch (e) {
      setError(`${e instanceof Error ? e.message : "Thất bại."} Bạn có thể bấm tạo lại (bước đầu luôn xoá demo cũ).`);
      setProgress(null);
    } finally {
      setBusy("");
    }
  }

  async function clear() {
    if (!confirm("Xoá toàn bộ dữ liệu demo trong database? Dữ liệu thật không bị ảnh hưởng.")) return;
    setBusy("clear");
    setError("");
    try {
      await call({ action: "clear" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thất bại.");
    } finally {
      setBusy("");
    }
  }

  const meta = status?.meta ?? null;
  const storage = status?.storage ?? null;
  const demoRows = meta ? Object.values(meta.counts).reduce((s, n) => s + n, 0) : 0;
  // Ước lượng dung lượng phần demo = dung lượng bảng × tỉ lệ dòng demo trong bảng.
  const demoBytes =
    meta && storage
      ? storage.tables.reduce((s, t) => {
          const d = meta.counts[t.table] ?? 0;
          return s + (t.rows > 0 ? t.bytes * Math.min(1, d / t.rows) : 0);
        }, 0)
      : 0;
  const quarters = meta ? Math.max(1, (new Date(meta.to).getTime() - new Date(meta.from).getTime()) / (91 * 86400_000)) : 0;
  const perLineQuarter = demoBytes && quarters ? demoBytes / (10 * quarters) : 0;
  const free = storage ? Math.max(0, storage.limitBytes - storage.databaseBytes) : 0;
  const used = storage ? storage.databaseBytes / storage.limitBytes : 0;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Dữ liệu demo &amp; dung lượng</h1>
        <p className="muted text-sm">
          Demo = nhà máy mô phỏng 10 line (3 cơ bản · 3 có M-AOI · 4 Pro), từ đầu quý cách đây 2 quý đến hôm nay. Mọi dòng demo có <code>is_demo = true</code>, tách hẳn khỏi dữ liệu thật.
        </p>
      </div>

      {error && <p className="card border-red-400 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-semibold">Bộ dữ liệu demo trong database</h2>
          {!status ? (
            <p className="muted text-sm">Đang tải…</p>
          ) : meta ? (
            <>
              <p className="text-sm">
                ✓ Đã tạo ngày <b>{dmy(meta.seededAt)}</b> · Kỳ dữ liệu <b>{dmy(meta.from)} → {dmy(meta.to)}</b> · <b>{num(demoRows)}</b> dòng
              </p>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(meta.counts).map(([t, n]) => (
                    <tr key={t} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-1">{TABLE_LABEL[t] ?? t}</td>
                      <td className="py-1 text-right tabular-nums">{num(n)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="muted text-sm">Chưa tạo. Trang /smt đang tính demo tạm trong bộ nhớ (xem được nhưng không sửa / giao việc thử được).</p>
          )}
          {progress && (
            <div className="space-y-1 text-sm">
              <p>
                Đang ghi: {progress.label} ({progress.done + 1}/{progress.total})
              </p>
              <div className="h-2 rounded-full" style={{ background: "var(--viz-1-wash)" }}>
                <div className="h-2 rounded-r-[4px] transition-all" style={{ width: `${((progress.done + 1) / progress.total) * 100}%`, background: "var(--viz-1)" }} />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={seed} disabled={Boolean(busy)}>
              {busy === "seed" ? "Đang tạo…" : meta ? "↻ Tạo lại theo hôm nay" : "+ Tạo dữ liệu demo"}
            </button>
            {meta && (
              <button type="button" className="btn-ghost" onClick={clear} disabled={Boolean(busy)}>
                {busy === "clear" ? "Đang xoá…" : "🗑 Xoá demo"}
              </button>
            )}
            <a href="/smt" target="_blank" rel="noreferrer" className="btn-ghost">
              ↗ Mở /smt
            </a>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Dung lượng database {storage?.source === "local" && <span className="muted text-xs">(local: ước lượng theo file JSON)</span>}</h2>
          {status?.storageError && <p className="text-sm text-amber-600">{status.storageError}</p>}
          {storage && (
            <>
              <p className="text-sm">
                Đã dùng <b>{mb(storage.databaseBytes)}</b> / {mb(storage.limitBytes)} (gói Free) · còn trống {mb(free)}
              </p>
              <div className="h-3 rounded-full" style={{ background: "var(--viz-1-wash)" }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used * 100)} aria-label="Dung lượng đã dùng">
                <div className="h-3 rounded-r-[4px]" style={{ width: `${Math.max(1, Math.min(100, used * 100))}%`, background: used > 0.8 ? "var(--status-critical)" : used > 0.6 ? "var(--status-warning)" : "var(--viz-1)" }} />
              </div>
              <p className="muted text-xs">{used > 0.8 ? "✕ Trên 80%: nên sao lưu rồi xoá bớt dữ liệu cũ." : used > 0.6 ? "! Trên 60%: chuẩn bị kế hoạch sao lưu." : "✓ Còn nhiều chỗ trống."}</p>
              {meta && demoBytes > 0 && (
                <p className="rounded-lg border p-2 text-sm" style={{ borderColor: "var(--border)" }}>
                  Phần demo chiếm ≈ <b>{mb(demoBytes)}</b> → mỗi line mỗi quý ≈ <b>{mb(perLineQuarter)}</b>. Với chỗ trống hiện có, đủ cho khoảng <b>{num(free / perLineQuarter)}</b> line-quý (vd 10 line ≈ {num(free / perLineQuarter / 10, 1)} quý) nếu bạn nhập chi tiết giống demo.
                </p>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="muted text-left text-xs">
                    <th className="py-1">Bảng</th>
                    <th className="py-1 text-right">Dòng</th>
                    <th className="py-1 text-right">Dung lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {storage.tables.slice(0, 14).map((t) => (
                    <tr key={t.table} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-1">{TABLE_LABEL[t.table] ?? t.table}</td>
                      <td className="py-1 text-right tabular-nums">{num(t.rows)}</td>
                      <td className="py-1 text-right tabular-nums">{mb(t.bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>

      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">Sao lưu khi database gần đầy</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Mỗi quý: vào <b>Xuất báo cáo</b>, xuất Excel từng mẫu cho quý vừa xong và lưu Google Drive (bản đọc được, không cần kỹ thuật).
          </li>
          <li>
            Bản sao đầy đủ để khôi phục: trên máy tính chạy <code>npx supabase db dump --db-url &quot;&lt;connection string&gt;&quot; --data-only -f backup-YYYYQn.sql</code> (lấy connection string ở Supabase → Project Settings → Database). Khôi phục bằng <code>psql</code> hoặc SQL Editor.
          </li>
          <li>Sau khi đã có bản sao: xoá dữ liệu thô cũ hơn 4 quý (nhật ký feeder, lỗi là 2 bảng lớn nhất); KPI quý cũ vẫn còn trong file Excel.</li>
          <li>Gói Free không có backup tự động hằng ngày và tạm dừng project nếu 7 ngày không ai truy cập; nâng gói Pro khi dữ liệu thật vượt ~400 MB.</li>
        </ol>
      </section>
    </section>
  );
}
