"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { moveItem } from "@/components/admin/fields";
import { PRODUCT_STATUS_LABEL, discountPercent, formatVnd, productImage, type ProductStatus, type ShopCategory, type ShopProduct } from "@/lib/shop/types";

const STATUS_STYLE: Record<ProductStatus, string> = {
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  hidden: "bg-amber-500/15 text-amber-700 dark:text-amber-300"
};

// Danh sách sản phẩm: lọc, sửa nhanh (trạng thái / tồn kho / nổi bật), sắp xếp thứ tự, nhân bản, xoá.
export function ProductsAdmin() {
  const [items, setItems] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProductStatus>("all");
  const [category, setCategory] = useState("all");
  const [orderDirty, setOrderDirty] = useState(false);

  async function load() {
    const [res, settingsRes] = await Promise.all([fetch("/api/admin/shop/products", { cache: "no-store" }), fetch("/api/admin/shop/settings", { cache: "no-store" })]);
    const data = (await res.json().catch(() => null)) as { items?: ShopProduct[]; message?: string } | null;
    const settings = (await settingsRes.json().catch(() => null)) as { settings?: { categories: ShopCategory[] } } | null;
    if (!res.ok) setNotice({ type: "error", text: data?.message ?? "Không tải được sản phẩm." });
    setItems(data?.items ?? []);
    setCategories(settings?.settings?.categories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtering = Boolean(query.trim()) || status !== "all" || category !== "all";
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (p) =>
        (status === "all" || p.status === status) &&
        (category === "all" || p.category === category) &&
        (!q || `${p.name.vi} ${p.name.en} ${p.slug} ${p.tags.join(" ")}`.toLowerCase().includes(q))
    );
  }, [items, query, status, category]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, published: 0, draft: 0, hidden: 0 };
    for (const p of items) c[p.status] += 1;
    return c;
  }, [items]);

  async function patch(id: string, body: Record<string, unknown>, okText?: string) {
    const res = await fetch("/api/admin/shop/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    const data = (await res.json().catch(() => null)) as { product?: ShopProduct; message?: string } | null;
    if (!res.ok || !data?.product) return setNotice({ type: "error", text: data?.message ?? "Cập nhật thất bại." });
    setItems((prev) => prev.map((p) => (p.id === id ? data.product! : p)));
    if (okText) setNotice({ type: "success", text: okText });
  }

  async function duplicate(product: ShopProduct) {
    const copy: Partial<ShopProduct> = {
      ...product,
      id: crypto.randomUUID(),
      slug: `${product.slug}-ban-sao`,
      status: "draft",
      name: { vi: `${product.name.vi} (bản sao)`, en: product.name.en ? `${product.name.en} (copy)` : "" },
      featured: false
    };
    const res = await fetch("/api/admin/shop/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: copy }) });
    const data = (await res.json().catch(() => null)) as { product?: ShopProduct; message?: string } | null;
    if (!res.ok || !data?.product) return setNotice({ type: "error", text: data?.message ?? "Nhân bản thất bại." });
    setItems((prev) => [...prev, data.product!]);
    setNotice({ type: "success", text: `Đã tạo bản nháp "${data.product.name.vi}". Sửa rồi chuyển sang Đang bán khi sẵn sàng.` });
  }

  async function remove(product: ShopProduct) {
    if (!window.confirm(`Xoá vĩnh viễn "${product.name.vi}"?\nNếu chỉ muốn ngừng bán tạm thời, hãy chọn trạng thái "Tạm ẩn".`)) return;
    const res = await fetch(`/api/admin/shop/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
    if (!res.ok) return setNotice({ type: "error", text: "Xoá thất bại." });
    setItems((prev) => prev.filter((p) => p.id !== product.id));
    setNotice({ type: "success", text: "Đã xoá sản phẩm." });
  }

  async function saveOrder() {
    const res = await fetch("/api/admin/shop/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: items.map((p) => p.id) }) });
    if (!res.ok) return setNotice({ type: "error", text: "Lưu thứ tự thất bại." });
    setOrderDirty(false);
    setNotice({ type: "success", text: "Đã lưu thứ tự hiển thị trên cửa hàng." });
  }

  const move = (id: string, delta: number) => {
    const from = items.findIndex((p) => p.id === id);
    setItems((prev) => moveItem(prev, from, from + delta));
    setOrderDirty(true);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Sản phẩm</h1>
          <p className="muted text-sm">Đăng, sửa, ẩn/hiện sản phẩm trên trang /shop. Thứ tự ở đây = thứ tự “Nổi bật” trên cửa hàng.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {orderDirty && (
            <button type="button" onClick={saveOrder} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
              💾 Lưu thứ tự
            </button>
          )}
          <Link href="/admin/shop/products/new" className="btn-primary">
            + Đăng sản phẩm
          </Link>
        </div>
      </div>

      {notice && (
        <p className={`rounded-lg border px-4 py-2.5 text-sm ${notice.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`} role="status">
          {notice.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex gap-1 rounded-xl border p-1" style={{ borderColor: "var(--border)" }} aria-label="Lọc trạng thái">
          {(["all", "published", "draft", "hidden"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === s ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
            >
              {s === "all" ? "Tất cả" : PRODUCT_STATUS_LABEL[s]} <span className="opacity-70">{counts[s]}</span>
            </button>
          ))}
        </nav>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-auto" aria-label="Danh mục">
          <option value="all">Mọi danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label.vi}
            </option>
          ))}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên, tag, slug..." className="input w-full sm:w-64" type="search" aria-label="Tìm sản phẩm" />
      </div>

      {loading ? (
        <p className="card muted text-sm">Đang tải...</p>
      ) : visible.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-3xl">🏷️</p>
          <p className="muted mt-2 text-sm">{items.length ? "Không có sản phẩm khớp bộ lọc." : "Chưa có sản phẩm nào."}</p>
          {!items.length && (
            <Link href="/admin/shop/products/new" className="btn-primary mt-4">
              + Đăng sản phẩm đầu tiên
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="muted border-b text-left text-xs" style={{ borderColor: "var(--border)" }}>
                {!filtering && <th className="w-16 px-3 py-2">Thứ tự</th>}
                <th className="px-3 py-2">Sản phẩm</th>
                <th className="px-3 py-2 text-right">Giá bán</th>
                <th className="px-3 py-2 text-center">Tồn kho</th>
                <th className="px-3 py-2 text-right">Đã bán</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p, idx) => {
                const off = discountPercent(p);
                const cat = categories.find((c) => c.id === p.category);
                return (
                  <tr key={p.id} className="border-b align-middle last:border-0" style={{ borderColor: "var(--border)" }}>
                    {!filtering && (
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => move(p.id, -1)} disabled={idx === 0} className="rounded border px-1.5 text-xs disabled:opacity-30" style={{ borderColor: "var(--border)" }} aria-label="Đưa lên">
                            ↑
                          </button>
                          <button type="button" onClick={() => move(p.id, 1)} disabled={idx === visible.length - 1} className="rounded border px-1.5 text-xs disabled:opacity-30" style={{ borderColor: "var(--border)" }} aria-label="Đưa xuống">
                            ↓
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">{productImage(p) && <img src={productImage(p)} alt="" className="h-full w-full object-cover" />}</div>
                        <div className="min-w-0">
                          <Link href={`/admin/shop/products/${p.id}`} className="font-semibold hover:text-brand-600">
                            {p.name.vi || p.name.en || "(chưa đặt tên)"}
                          </Link>
                          <p className="muted truncate text-xs">
                            {cat ? `${cat.icon} ${cat.label.vi} · ` : ""}/{p.slug} · {p.media.length} ảnh
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      <b>{p.price ? formatVnd(p.price) : "Liên hệ"}</b>
                      {off > 0 && <span className="block text-xs text-rose-600">-{off}% · {formatVnd(p.compareAtPrice)}</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StockCell product={p} onSave={(stock) => patch(p.id, { stock }, "Đã cập nhật tồn kho.")} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.soldCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={p.status}
                          onChange={(e) => patch(p.id, { status: e.target.value }, `"${p.name.vi}" → ${PRODUCT_STATUS_LABEL[e.target.value as ProductStatus]}`)}
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[p.status]}`}
                          aria-label="Trạng thái"
                        >
                          {(["published", "draft", "hidden"] as const).map((s) => (
                            <option key={s} value={s}>
                              {PRODUCT_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => patch(p.id, { featured: !p.featured })}
                          className={`text-lg ${p.featured ? "" : "opacity-25 hover:opacity-60"}`}
                          aria-pressed={p.featured}
                          aria-label={p.featured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
                          title={p.featured ? "Đang hiện ở mục Nổi bật" : "Hiện ở mục Nổi bật"}
                        >
                          ⭐
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Link href={`/admin/shop/products/${p.id}`} className="rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-brand-50 dark:hover:bg-slate-800" style={{ borderColor: "var(--border)" }}>
                          Sửa
                        </Link>
                        <a href={`/shop/san-pham/${p.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border px-2 py-1 text-xs hover:bg-brand-50 dark:hover:bg-slate-800" style={{ borderColor: "var(--border)" }} title="Xem trên cửa hàng">
                          ↗
                        </a>
                        <button type="button" onClick={() => duplicate(p)} className="rounded-lg border px-2 py-1 text-xs hover:bg-brand-50 dark:hover:bg-slate-800" style={{ borderColor: "var(--border)" }} title="Nhân bản">
                          ⧉
                        </button>
                        <button type="button" onClick={() => remove(p)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" aria-label={`Xoá ${p.name.vi}`}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Sửa tồn kho ngay trên bảng. Để trống = không theo dõi (làm theo đơn / luôn có hàng).
function StockCell({ product, onSave }: { product: ShopProduct; onSave: (stock: number | null) => void }) {
  const [value, setValue] = useState(product.stock === null ? "" : String(product.stock));
  useEffect(() => setValue(product.stock === null ? "" : String(product.stock)), [product.stock]);
  const commit = () => {
    const next = value.trim() === "" ? null : Math.max(0, Math.floor(Number(value) || 0));
    if (next !== product.stock) onSave(next);
  };
  const low = product.stock !== null && product.stock <= 5;
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      placeholder="∞"
      inputMode="numeric"
      title="Để trống = không giới hạn"
      aria-label={`Tồn kho ${product.name.vi}`}
      className={`w-16 rounded-lg border bg-transparent px-2 py-1 text-center tabular-nums ${low ? "border-amber-400 text-amber-700 dark:text-amber-300" : ""}`}
      style={low ? undefined : { borderColor: "var(--border)" }}
    />
  );
}
