import Link from "next/link";
import { BarList, DailyColumns, StatTile } from "@/components/admin/analytics/charts";
import { compact } from "@/lib/format-number";
import { listOrders } from "@/lib/shop/orders";
import { listProducts } from "@/lib/shop/store";
import { ACTIVE_ORDER_STATUSES, ORDER_STATUS_LABEL, formatVnd, type ShopOrder, type ShopProduct } from "@/lib/shop/types";

export const metadata = { title: "Tổng quan bán hàng" };
export const dynamic = "force-dynamic";

const DAYS = 30;
// Ngày theo giờ Việt Nam (UTC+7) để đơn lúc 23h không bị tính sang hôm sau.
const vnDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);

function timeAgo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `${Math.max(1, min)} phút trước`;
  if (min < 1440) return `${Math.floor(min / 60)} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export default async function AdminShopOverviewPage() {
  let orders: ShopOrder[] = [];
  let products: ShopProduct[] = [];
  let error = "";
  try {
    [orders, products] = await Promise.all([listOrders(), listProducts()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Không đọc được dữ liệu cửa hàng.";
  }

  if (error) {
    return (
      <section className="card space-y-2">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Tổng quan bán hàng</h1>
        <p className="text-sm text-red-600">{error}</p>
        <p className="muted text-sm">
          Kiểm tra migration <code>202610200001_shop.sql</code> đã chạy trên Supabase chưa.
        </p>
      </section>
    );
  }

  const since = Date.now() - DAYS * 86400_000;
  const counted = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned");
  const recent = counted.filter((o) => new Date(o.createdAt).getTime() >= since);
  const revenue = recent.reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter((o) => o.status === "pending");
  const unpaidTransfers = orders.filter((o) => o.paymentMethod === "bank" && o.paymentStatus === "unpaid" && ACTIVE_ORDER_STATUSES.includes(o.status));
  const inProgress = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status));

  const daily = Array.from({ length: DAYS }, (_, i) => {
    const date = vnDate(new Date(Date.now() - (DAYS - 1 - i) * 86400_000).toISOString());
    const day = recent.filter((o) => vnDate(o.createdAt) === date);
    return { date, views: day.reduce((s, o) => s + o.total, 0), visitors: day.length };
  });

  const published = products.filter((p) => p.status === "published");
  const lowStock = published.filter((p) => p.stock !== null && p.stock <= 5).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  const bestSellers = [...products]
    .filter((p) => p.soldCount > 0)
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 8)
    .map((p) => ({ label: p.name.vi || p.name.en, value: p.soldCount }));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Tổng quan bán hàng</h1>
          <p className="muted text-sm">Số liệu {DAYS} ngày gần nhất, không tính đơn đã huỷ / hoàn trả.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/shop" target="_blank" rel="noreferrer" className="btn-ghost">
            ↗ Xem cửa hàng
          </a>
          <Link href="/admin/shop/products/new" className="btn-primary">
            + Đăng sản phẩm
          </Link>
        </div>
      </div>

      {pending.length > 0 && (
        <Link href="/admin/shop/orders?status=pending" className="flex items-center justify-between gap-3 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200">
          <span>🔔 Có {pending.length} đơn mới chờ bạn xác nhận</span>
          <span>Xử lý ngay →</span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={`Doanh thu ${DAYS} ngày`} value={`${compact(revenue)}₫`} hint={formatVnd(revenue)} />
        <StatTile label={`Đơn hàng ${DAYS} ngày`} value={String(recent.length)} hint={`Giá trị TB: ${recent.length ? formatVnd(Math.round(revenue / recent.length)) : "—"}`} />
        <StatTile label="Đang xử lý" value={String(inProgress.length)} hint={`${pending.length} chờ xác nhận · ${unpaidTransfers.length} chờ chuyển khoản`} />
        <StatTile label="Sản phẩm đang bán" value={String(published.length)} hint={`${products.length - published.length} nháp / ẩn · ${lowStock.length} sắp hết`} />
      </div>

      <div className="card">
        <DailyColumns data={daily} title={`Doanh thu theo ngày (${DAYS} ngày)`} unit="doanh thu" secondaryUnit="đơn" valueFormat="vnd" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Đơn gần nhất</h2>
            <Link href="/admin/shop/orders" className="text-sm font-semibold text-brand-600 dark:text-brand-300">
              Tất cả đơn →
            </Link>
          </div>
          {orders.length ? (
            <ul className="divide-y text-sm" style={{ borderColor: "var(--border)" }}>
              {orders.slice(0, 8).map((o) => (
                <li key={o.id} style={{ borderColor: "var(--border)" }}>
                  <Link href={`/admin/shop/orders?code=${o.code}`} className="flex items-center justify-between gap-3 py-2 hover:text-brand-600">
                    <span className="min-w-0">
                      <b className="font-mono">{o.code}</b> · {o.customerName}
                      <span className="muted block text-xs">
                        {timeAgo(o.createdAt)} · {ORDER_STATUS_LABEL[o.status].vi}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatVnd(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted text-sm">Chưa có đơn nào. Chia sẻ link /shop để bắt đầu bán nhé.</p>
          )}
        </section>

        <div className="space-y-4">
          <BarList title="Bán chạy (tổng số lượng đã bán)" items={bestSellers} unit="sản phẩm" empty="Chưa bán được sản phẩm nào." />
          <section className="card space-y-2">
            <h2 className="font-semibold">Sắp hết hàng (≤ 5)</h2>
            {lowStock.length ? (
              <ul className="space-y-1 text-sm">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/shop/products/${p.id}`} className="min-w-0 truncate hover:text-brand-600">
                      {p.name.vi}
                    </Link>
                    <span className={`shrink-0 font-semibold tabular-nums ${p.stock ? "text-amber-600" : "text-red-600"}`}>{p.stock ? `còn ${p.stock}` : "hết hàng"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted text-sm">Không có sản phẩm nào sắp hết.</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
