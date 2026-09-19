"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CustomerOrder, OrderStatus } from "@/lib/order-types";

type OrdersPayload = {
  schemaVersion: number;
  items: CustomerOrder[];
};

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date) {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  clone.setDate(clone.getDate() + diff);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function getWeekKey(date: Date) {
  const start = getWeekStart(date);
  return formatDateKey(start);
}

function statusLabel(status: OrderStatus) {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "packing":
      return "Đang đóng gói";
    case "shipped":
      return "Đã hoàn thành";
    case "returned":
      return "Đơn bị hoàn";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

export function OrdersDashboard() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) {
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as OrdersPayload;
      setOrders(payload.items ?? []);
      setLoading(false);
    }

    fetchOrders();
  }, []);

  const kpis = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter((o) => o.status === "shipped").length;
    const inProgress = orders.filter((o) => ["pending", "confirmed", "packing"].includes(o.status)).length;
    const returned = orders.filter((o) => o.status === "returned").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    const revenue = orders
      .filter((o) => o.status === "shipped")
      .reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);

    return { total, completed, inProgress, returned, cancelled, revenue };
  }, [orders]);

  const statusStats = useMemo(() => {
    const allStatuses: OrderStatus[] = ["pending", "confirmed", "packing", "shipped", "returned", "cancelled"];
    const max = Math.max(1, ...allStatuses.map((status) => orders.filter((o) => o.status === status).length));

    return allStatuses.map((status) => {
      const count = orders.filter((o) => o.status === status).length;
      return {
        status,
        count,
        width: `${Math.round((count / max) * 100)}%`
      };
    });
  }, [orders]);

  const dayStats = useMemo(() => {
    const days = 14;
    const labels: string[] = [];
    const counts: number[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = formatDateKey(d);
      labels.push(key.slice(5));
      counts.push(orders.filter((o) => formatDateKey(new Date(o.createdAt)) === key).length);
    }

    const max = Math.max(1, ...counts);
    return labels.map((label, index) => ({ label, count: counts[index], height: `${Math.round((counts[index] / max) * 100)}%` }));
  }, [orders]);

  const weekStats = useMemo(() => {
    const weekMap = new Map<string, number>();
    orders.forEach((o) => {
      const key = getWeekKey(new Date(o.createdAt));
      weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
    });

    return [...weekMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-12)
      .map(([weekStart, count]) => ({ weekStart, count }));
  }, [orders]);

  const monthStats = useMemo(() => {
    const monthMap = new Map<string, number>();
    orders.forEach((o) => {
      const date = new Date(o.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    });

    return [...monthMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));
  }, [orders]);

  const yearStats = useMemo(() => {
    const yearMap = new Map<string, number>();
    orders.forEach((o) => {
      const key = String(new Date(o.createdAt).getFullYear());
      yearMap.set(key, (yearMap.get(key) ?? 0) + 1);
    });

    return [...yearMap.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([year, count]) => ({ year, count }));
  }, [orders]);

  const updateOrder = async (id: string, status: OrderStatus, adminNote: string) => {
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id, status, adminNote })
    });

    if (!response.ok) {
      setMessage("Cập nhật đơn hàng thất bại.");
      return;
    }

    const payload = (await response.json()) as { item: CustomerOrder };
    setOrders((prev) => prev.map((item) => (item.id === id ? payload.item : item)));
    setMessage(`Đã cập nhật đơn ${id}.`);
  };

  if (loading) {
    return <section className="card">Đang tải dashboard đơn hàng...</section>;
  }

  return (
    <section className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Dashboard đơn hàng</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Theo dõi số đơn theo ngày/tuần/tháng/năm và trạng thái xử lý.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
            Quản lý sản phẩm
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="card"><p className="text-xs text-slate-500">Tổng đơn</p><p className="mt-1 text-xl font-bold">{kpis.total}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Hoàn thành</p><p className="mt-1 text-xl font-bold text-emerald-600">{kpis.completed}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Đang xử lý</p><p className="mt-1 text-xl font-bold text-amber-600">{kpis.inProgress}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Đơn bị hoàn</p><p className="mt-1 text-xl font-bold text-red-600">{kpis.returned}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Đơn hủy</p><p className="mt-1 text-xl font-bold text-slate-600">{kpis.cancelled}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Doanh thu hoàn thành</p><p className="mt-1 text-xl font-bold text-brand-700">{kpis.revenue.toLocaleString("vi-VN")} VNĐ</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-2">
          <h2 className="font-semibold text-brand-600 dark:text-brand-300">Trạng thái đơn</h2>
          {statusStats.map((row) => (
            <div key={row.status} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{statusLabel(row.status)}</span><span>{row.count}</span></div>
              <div className="h-2 rounded bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded bg-brand-600" style={{ width: row.width }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="font-semibold text-brand-600 dark:text-brand-300">Số đơn 14 ngày gần nhất</h2>
          <div className="mt-3 grid h-32 [grid-template-columns:repeat(14,minmax(0,1fr))] items-end gap-1">
            {dayStats.map((row) => (
              <div key={row.label} className="flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-brand-500" style={{ height: row.height }} title={`${row.label}: ${row.count}`} />
                <span className="text-[10px] text-slate-500">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h3 className="font-semibold text-brand-600 dark:text-brand-300">Theo tuần</h3>
          <div className="mt-2 space-y-1 text-sm">
            {weekStats.length === 0 && <p style={{ color: "var(--muted)" }}>Chưa có dữ liệu.</p>}
            {weekStats.map((w) => <p key={w.weekStart}>Tuần {w.weekStart}: <b>{w.count}</b> đơn</p>)}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-brand-600 dark:text-brand-300">Theo tháng</h3>
          <div className="mt-2 space-y-1 text-sm">
            {monthStats.length === 0 && <p style={{ color: "var(--muted)" }}>Chưa có dữ liệu.</p>}
            {monthStats.map((m) => <p key={m.month}>Tháng {m.month}: <b>{m.count}</b> đơn</p>)}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-brand-600 dark:text-brand-300">Theo năm</h3>
          <div className="mt-2 space-y-1 text-sm">
            {yearStats.length === 0 && <p style={{ color: "var(--muted)" }}>Chưa có dữ liệu.</p>}
            {yearStats.map((y) => <p key={y.year}>Năm {y.year}: <b>{y.count}</b> đơn</p>)}
          </div>
        </div>
      </div>

      {message && <p className="card text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">Danh sách đơn đặt hàng</h2>
        {orders.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>Chưa có đơn hàng nào.</p>}

        {orders.map((order) => (
          <article key={order.id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
                <p className="font-semibold">{order.id} - {order.customerName}</p>
                <p className="text-sm">{order.contact}</p>
              </div>
              <span className="rounded-full bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                {statusLabel(order.status)}
              </span>
            </div>

            <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              <p><b>Số lượng tổng:</b> {order.quantity}</p>
              <p><b>Tổng tiền:</b> {(order.totalAmount ?? 0).toLocaleString("vi-VN")} VNĐ</p>
              <div className="md:col-span-2">
                <p><b>Chi tiết sản phẩm:</b></p>
                {(order.lineItems?.length ?? 0) > 0 ? (
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {order.lineItems?.map((line, lineIndex) => (
                      <li key={`${order.id}-${line.productId}-${lineIndex}`}>
                        {line.productName} ({line.productId}) - {line.quantity} x {line.unitPrice.toLocaleString("vi-VN")} = {line.lineTotal.toLocaleString("vi-VN")} VNĐ
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{order.productId ?? "(không chọn)"}</p>
                )}
              </div>
              <p className="md:col-span-2"><b>Địa chỉ:</b> {order.address ?? "(không có)"}</p>
              <p className="md:col-span-2"><b>Ghi chú KH:</b> {order.note}</p>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_120px]">
              <select
                value={order.status}
                onChange={(e) => {
                  const nextStatus = e.target.value as OrderStatus;
                  updateOrder(order.id, nextStatus, order.adminNote ?? "");
                }}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="packing">packing</option>
                <option value="shipped">shipped</option>
                <option value="returned">returned</option>
                <option value="cancelled">cancelled</option>
              </select>

              <input
                value={order.adminNote ?? ""}
                onChange={(e) => {
                  const adminNote = e.target.value;
                  setOrders((prev) => prev.map((item) => (item.id === order.id ? { ...item, adminNote } : item)));
                }}
                placeholder="Ghi chú đóng hàng (màu, quy cách, mã vận đơn...)"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              />

              <button
                onClick={() => updateOrder(order.id, order.status, order.adminNote ?? "")}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Lưu đơn
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
