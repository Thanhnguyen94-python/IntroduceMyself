"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/smt/smt-charts";
import { EIGHT_D_STATUS, daysBetween, dmy, todayVn } from "@/lib/smt/types";
import type { EightDReport } from "@/lib/smt/types";
import { deleteOrRequest } from "@/components/smt-workspace/delete-request";

// base: Admin /admin/smt/8d, Trợ lý /smt/nhap-lieu/8d.
export function EightDList({ base = "/admin/smt/8d" }: { base?: string }) {
  const [items, setItems] = useState<EightDReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/smt/data/8d", { cache: "no-store" });
      const data = (await res.json()) as { items?: EightDReport[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không đọc được danh sách.");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được danh sách.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const today = todayVn();
  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((r) => (status === "all" ? true : status === "active" ? r.status !== "closed" : r.status === status) && (!s || `${r.code} ${r.title} ${r.customer} ${r.model} ${r.defect_code}`.toLowerCase().includes(s)));
  }, [items, status, q]);

  async function remove(r: EightDReport) {
    if (!window.confirm(`Xoá báo cáo ${r.code}? Không hoàn tác được.`)) return;
    try {
      if ((await deleteOrRequest(`/api/admin/smt/data/8d?id=${r.id}`, { kind: "dataset", dataset: "8d", ids: [r.id], label: `8D ${r.code}`, demo: false })) === "deleted") void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xoá thất bại.");
    }
  }

  const open = items.filter((r) => r.status !== "closed");
  const overdue = open.filter((r) => r.due_on && r.due_on < today);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">🧭 Báo cáo 8D</h1>
          <p className="muted text-sm">
            {open.length} đang mở · {overdue.length} quá hạn · {items.length - open.length} đã đóng
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/tai-lieu-ky-thuat/smt-reports/8d?blank=1" target="_blank" rel="noreferrer" className="btn-ghost">
            🖨 Mẫu trống
          </a>
          <Link href={`${base}/new`} className="btn-primary">
            + Mở 8D mới
          </Link>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto">
          <option value="active">Đang mở</option>
          <option value="all">Tất cả</option>
          {EIGHT_D_STATUS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.vi}
            </option>
          ))}
        </select>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="input max-w-sm flex-1" placeholder="Tìm mã, tiêu đề, khách hàng, model…" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3">
        {visible.map((r) => {
          const late = r.status !== "closed" && r.due_on && r.due_on < today;
          const st = EIGHT_D_STATUS.find((s) => s.id === r.status);
          return (
            <article key={r.id} className="card flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip font-mono">{r.code}</span>
                  <StatusBadge status={r.status === "closed" ? "good" : "warning"}>{st?.vi}</StatusBadge>
                  {r.severity === "critical" && <StatusBadge status="critical">Nghiêm trọng</StatusBadge>}
                  {late && <StatusBadge status="critical">Quá hạn {daysBetween(r.due_on!, today)} ngày</StatusBadge>}
                  {r.is_public && <span className="chip">🌐 Công khai</span>}
                </p>
                <Link href={`${base}/${r.id}`} className="mt-1 block font-semibold hover:text-brand-600">
                  {r.title}
                </Link>
                <p className="muted text-xs">
                  {[r.customer, r.line, r.model, r.defect_code].filter(Boolean).join(" · ")} · Mở {dmy(r.opened_on)}
                  {r.due_on ? ` · Hạn ${dmy(r.due_on)}` : ""} · {r.owner || "chưa có trưởng nhóm"}
                </p>
              </div>
              <div className="flex gap-3 text-sm font-semibold">
                <Link href={`${base}/${r.id}`} className="text-brand-600 dark:text-brand-300">
                  Mở
                </Link>
                <button type="button" className="text-red-600" onClick={() => void remove(r)}>
                  Xoá
                </button>
              </div>
            </article>
          );
        })}
        {!loading && !visible.length && <p className="card muted text-sm">Không có báo cáo 8D nào phù hợp.</p>}
      </div>
    </section>
  );
}
