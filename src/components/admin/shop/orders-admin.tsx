"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, formatVnd, type OrderStatus, type ShopOrder } from "@/lib/shop/types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  packing: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  shipping: "bg-brand-500/15 text-brand-700 dark:text-brand-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  returned: "bg-rose-500/15 text-rose-700 dark:text-rose-300"
};

// Bước tiếp theo gợi ý cho mỗi trạng thái (nút chính trong chi tiết đơn).
const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: "confirmed", label: "✅ Xác nhận đơn" },
  confirmed: { to: "packing", label: "📦 Bắt đầu đóng gói" },
  packing: { to: "shipping", label: "🚚 Đã giao cho vận chuyển" },
  shipping: { to: "completed", label: "🎉 Đã giao thành công" }
};

type Filter = "all" | OrderStatus;

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function OrdersAdmin() {
  const router = useRouter();
  const params = useSearchParams();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>((params.get("status") as Filter) || "all");
  const [query, setQuery] = useState("");
  const selectedCode = params.get("code") ?? "";

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/shop/orders", { cache: "no-store" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { items?: ShopOrder[]; message?: string } | null;
    setOrders(data?.items ?? []);
    setError(data?.message ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of ORDER_STATUSES) c[s] = 0;
    for (const o of orders) c[o.status] += 1;
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    return orders.filter((o) => (filter === "all" || o.status === filter) && (!q || `${o.code}${o.customerName}${o.phone}${o.email}`.toLowerCase().replace(/\s+/g, "").includes(q)));
  }, [orders, filter, query]);

  const selected = orders.find((o) => o.code === selectedCode) ?? null;
  const select = (code: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (code) next.set("code", code);
    else next.delete("code");
    router.replace(`/admin/shop/orders?${next}`, { scroll: false });
  };

  const replaceOrder = (order: ShopOrder) => setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Đơn hàng</h1>
          <p className="muted text-sm">Tự cập nhật mỗi 30 giây. Huỷ / hoàn trả đơn sẽ tự cộng lại tồn kho.</p>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm mã đơn, tên, SĐT..." className="input w-full sm:w-72" type="search" aria-label="Tìm đơn" />
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Lọc trạng thái">
        {(["all", ...ORDER_STATUSES] as Filter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${filter === s ? "border-brand-600 bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
            style={filter === s ? undefined : { borderColor: "var(--border)" }}
          >
            {s === "all" ? "Tất cả" : ORDER_STATUS_LABEL[s].vi}
            <span className={`ml-1.5 ${s === "pending" && counts.pending ? "rounded-full bg-red-500 px-1.5 text-[11px] text-white" : "opacity-70"}`}>{counts[s]}</span>
          </button>
        ))}
      </nav>

      {error && <p className="card text-sm text-red-600">{error} — kiểm tra migration 202610200001_shop.sql đã chạy chưa.</p>}

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`card max-h-[75vh] space-y-1 overflow-y-auto p-2 ${selected ? "hidden lg:block" : ""}`}>
          {loading && <p className="muted p-3 text-sm">Đang tải...</p>}
          {!loading && !visible.length && <p className="muted p-3 text-sm">{orders.length ? "Không có đơn khớp bộ lọc." : "Chưa có đơn nào."}</p>}
          {visible.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => select(o.code)}
              aria-current={o.code === selectedCode}
              className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${o.code === selectedCode ? "bg-brand-50 ring-2 ring-brand-500 dark:bg-slate-800" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <b className="font-mono">{o.code}</b>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[o.status]}`}>{ORDER_STATUS_LABEL[o.status].vi}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate">{o.customerName}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatVnd(o.total)}</span>
              </div>
              <p className="muted text-xs">
                {dateTime(o.createdAt)} · {o.items.reduce((s, l) => s + l.quantity, 0)} sp · {o.paymentMethod === "bank" ? (o.paymentStatus === "paid" ? "CK ✓" : "CK chờ") : "COD"}
              </p>
            </button>
          ))}
        </aside>

        {selected ? (
          <OrderPanel key={selected.id} order={selected} onChange={replaceOrder} onClose={() => select(null)} onDeleted={() => (setOrders((prev) => prev.filter((o) => o.id !== selected.id)), select(null))} />
        ) : (
          <div className="card muted hidden place-items-center py-20 text-sm lg:grid">← Chọn một đơn để xem chi tiết</div>
        )}
      </div>
    </section>
  );
}

function OrderPanel({ order, onChange, onClose, onDeleted }: { order: ShopOrder; onChange: (o: ShopOrder) => void; onClose: () => void; onDeleted: () => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [eventNote, setEventNote] = useState("");
  const [notify, setNotify] = useState(Boolean(order.email));
  const [adminNote, setAdminNote] = useState(order.adminNote);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setStatus(order.status), [order.status]);

  async function patch(body: Record<string, unknown>, okText: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/shop/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, ...body }) });
    const data = (await res.json().catch(() => null)) as { order?: ShopOrder; emailed?: boolean; message?: string } | null;
    setBusy(false);
    if (!res.ok || !data?.order) return setMessage({ type: "error", text: data?.message ?? "Cập nhật thất bại." });
    onChange(data.order);
    setMessage({ type: "success", text: `${okText}${data.emailed ? " · đã email cho khách" : ""}` });
    setEventNote("");
  }

  const changeStatus = (to: OrderStatus) => {
    if ((to === "cancelled" || to === "returned") && !window.confirm(`Chuyển đơn sang "${ORDER_STATUS_LABEL[to].vi}"? Tồn kho sẽ được cộng lại.`)) return;
    patch({ status: to, eventNote, notifyCustomer: notify }, `Đã chuyển sang "${ORDER_STATUS_LABEL[to].vi}"`);
  };

  async function remove() {
    if (!window.confirm(`Xoá vĩnh viễn đơn ${order.code}? (Nên dùng "Đã huỷ" để giữ lịch sử.)`)) return;
    const res = await fetch(`/api/admin/shop/orders?id=${order.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else setMessage({ type: "error", text: "Xoá thất bại." });
  }

  // Thông tin dán vào app giao hàng (GHTK, GHN, Viettel Post...).
  const shippingText = [
    order.customerName,
    order.phone,
    order.address,
    order.items.map((l) => `${l.name}${Object.values(l.options).length ? ` (${Object.values(l.options).join(", ")})` : ""} x${l.quantity}`).join("; "),
    order.paymentMethod === "cod" && order.paymentStatus === "unpaid" ? `Thu hộ: ${order.total.toLocaleString("vi-VN")}` : "Đã thanh toán",
    order.note ? `Ghi chú: ${order.note}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const next = NEXT_STEP[order.status];
  const zalo = order.phone.replace(/^0/, "84");

  return (
    <article className="card space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={onClose} className="muted mb-1 text-sm hover:text-brand-600 lg:hidden">
            ← Danh sách
          </button>
          <h2 className="text-xl font-bold">
            Đơn <span className="font-mono">{order.code}</span>
          </h2>
          <p className="muted text-sm">Đặt lúc {dateTime(order.createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status].vi}</span>
      </header>

      {message && (
        <p className={`rounded-lg px-3 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`} role="status">
          {message.text}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-1.5 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold">👤 Khách hàng</h3>
          <p className="text-base font-medium">{order.customerName}</p>
          <p className="flex flex-wrap gap-2">
            <a href={`tel:${order.phone}`} className="font-mono text-brand-600 hover:underline dark:text-brand-300">
              {order.phone}
            </a>
            <a href={`https://zalo.me/${zalo}`} target="_blank" rel="noreferrer" className="chip hover:border-brand-400">
              Zalo
            </a>
          </p>
          {order.email && (
            <a href={`mailto:${order.email}?subject=Đơn ${order.code}`} className="block text-brand-600 hover:underline dark:text-brand-300">
              {order.email}
            </a>
          )}
          <p>{order.address}</p>
          {order.note && <p className="rounded-lg bg-amber-50 px-2 py-1 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">📝 {order.note}</p>}
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(shippingText).then(() => (setCopied(true), window.setTimeout(() => setCopied(false), 1500)))}
            className="btn-ghost mt-2 w-full py-1.5 text-xs"
          >
            {copied ? "✓ Đã copy" : "📋 Copy thông tin giao hàng"}
          </button>
        </section>

        <section className="space-y-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold">💳 Thanh toán</h3>
          <p>{order.paymentMethod === "bank" ? "🏦 Chuyển khoản (nội dung = mã đơn)" : "💵 Thu tiền khi giao (COD)"}</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={order.paymentStatus === "paid"}
              disabled={busy}
              onChange={(e) => patch({ paymentStatus: e.target.checked ? "paid" : "unpaid" }, e.target.checked ? "Đã đánh dấu đã thanh toán" : "Đã bỏ đánh dấu thanh toán")}
            />
            <span className={order.paymentStatus === "paid" ? "font-semibold text-emerald-600" : ""}>{order.paymentStatus === "paid" ? "Đã nhận tiền" : "Chưa nhận tiền"}</span>
          </label>
          <dl className="space-y-1 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between">
              <dt className="muted">Tạm tính</dt>
              <dd className="tabular-nums">{formatVnd(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="muted">Phí ship</dt>
              <dd className="tabular-nums">{order.shippingFee ? formatVnd(order.shippingFee) : "Miễn phí"}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Tổng</dt>
              <dd className="tabular-nums">{formatVnd(order.total)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="space-y-2">
        <h3 className="font-semibold">🛍️ Sản phẩm</h3>
        <ul className="divide-y rounded-xl border text-sm" style={{ borderColor: "var(--border)" }}>
          {order.items.map((l, idx) => (
            <li key={idx} className="flex items-center gap-3 p-3" style={{ borderColor: "var(--border)" }}>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">{l.image && <img src={l.image} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{l.name}</p>
                {Object.entries(l.options).length > 0 && <p className="muted text-xs">{Object.entries(l.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>}
              </div>
              <span className="muted tabular-nums">
                {l.quantity} × {formatVnd(l.unitPrice)}
              </span>
              <b className="w-28 text-right tabular-nums">{formatVnd(l.lineTotal)}</b>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold">🔄 Cập nhật trạng thái</h3>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Ghi chú gửi khách</span> <span className="muted text-xs">(khách thấy trong trang theo dõi đơn, vd: mã vận đơn GHTK 123456)</span>
          <textarea value={eventNote} onChange={(e) => setEventNote(e.target.value)} rows={2} className="input" />
        </label>
        {order.email && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Gửi email báo khách ({order.email})
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          {next && (
            <button type="button" onClick={() => changeStatus(next.to)} disabled={busy} className="btn-primary">
              {next.label}
            </button>
          )}
          <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="input w-auto" aria-label="Chọn trạng thái">
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s].vi}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => changeStatus(status)} disabled={busy || status === order.status} className="btn-ghost">
            Chuyển trạng thái
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">🔒 Ghi chú nội bộ</h3>
        <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} placeholder="Chỉ admin thấy: màu in, ngày hẹn, đã cọc..." className="input" />
        {adminNote !== order.adminNote && (
          <button type="button" onClick={() => patch({ adminNote }, "Đã lưu ghi chú")} disabled={busy} className="btn-ghost py-1.5 text-sm">
            💾 Lưu ghi chú
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">🕘 Lịch sử</h3>
        <ol className="space-y-2 border-l-2 pl-4 text-sm" style={{ borderColor: "var(--border)" }}>
          {[...order.history].reverse().map((h, idx) => (
            <li key={idx}>
              <b>{ORDER_STATUS_LABEL[h.status].vi}</b> <span className="muted text-xs">· {dateTime(h.at)} · {h.by === "customer" ? "khách" : "admin"}</span>
              {h.note && <p className="whitespace-pre-wrap">{h.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap justify-between gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        <a href={`/shop/don-hang?code=${order.code}`} target="_blank" rel="noreferrer" className="muted text-sm hover:text-brand-600">
          ↗ Trang tra cứu của khách
        </a>
        <button type="button" onClick={remove} className="text-sm text-red-600 hover:underline">
          🗑 Xoá đơn
        </button>
      </div>
    </article>
  );
}
