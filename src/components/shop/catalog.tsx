"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { ProductCard } from "@/components/shop/product-card";
import { useShop } from "@/components/shop/shop-provider";
import type { ShopProduct } from "@/lib/shop/types";

type Sort = "featured" | "newest" | "price-asc" | "price-desc" | "best";

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

// Danh mục + tìm kiếm (gõ không dấu vẫn tìm được) + sắp xếp. Lưu bộ lọc trên URL để chia sẻ link.
export function Catalog({ products }: { products: ShopProduct[] }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const { settings } = useShop();
  const params = useSearchParams();
  const [category, setCategory] = useState(params.get("dm") ?? "all");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>((params.get("sx") as Sort) || "featured");

  // Chỉ ghi bộ lọc lên URL sau khi khách đổi bộ lọc (không chạy lúc tải trang, để giữ utm_source... cho thống kê).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const next = new URLSearchParams(window.location.search);
    for (const [key, value, empty] of [["dm", category, "all"], ["q", query.trim(), ""], ["sx", sort, "featured"]] as const) {
      if (value && value !== empty) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    // Chỉ đổi URL, không tải lại trang từ server mỗi lần gõ phím.
    window.history.replaceState(window.history.state, "", qs ? `/shop?${qs}` : "/shop");
  }, [category, query, sort]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [products]);

  const visible = useMemo(() => {
    const q = fold(query.trim());
    const list = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return fold([p.name.vi, p.name.en, p.summary.vi, p.summary.en, p.tags.join(" ")].join(" ")).includes(q);
    });
    const sorted = [...list];
    if (sort === "featured") sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder);
    if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "best") sorted.sort((a, b) => b.soldCount - a.soldCount);
    return sorted;
  }, [products, category, query, sort]);

  const categories = settings.categories.filter((c) => counts.has(c.id));

  return (
    <section id="san-pham" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{vi ? "Cửa hàng" : "Shop"}</p>
          <h2 className="section-title mt-1">{vi ? "Tất cả sản phẩm" : "All products"}</h2>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <span className="sr-only">{vi ? "Tìm sản phẩm" : "Search products"}</span>
            <span className="muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm" aria-hidden>
              🔍
            </span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={vi ? "Tìm theo tên, công dụng..." : "Search name, use..."} className="input pl-9" type="search" />
          </label>
          <label>
            <span className="sr-only">{vi ? "Sắp xếp" : "Sort"}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input w-auto">
              <option value="featured">{vi ? "Nổi bật" : "Featured"}</option>
              <option value="best">{vi ? "Bán chạy" : "Best selling"}</option>
              <option value="newest">{vi ? "Mới nhất" : "Newest"}</option>
              <option value="price-asc">{vi ? "Giá thấp → cao" : "Price: low to high"}</option>
              <option value="price-desc">{vi ? "Giá cao → thấp" : "Price: high to low"}</option>
            </select>
          </label>
        </div>
      </div>

      {categories.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label={vi ? "Danh mục" : "Categories"}>
          {[{ id: "all", icon: "✨", label: { vi: "Tất cả", en: "All" } }, ...categories].map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-brand-600 bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
                style={active ? undefined : { borderColor: "var(--border)" }}
              >
                {c.icon} {c.label[lang] || c.label.vi}
                <span className={`ml-1.5 text-xs ${active ? "text-white/80" : "muted"}`}>{c.id === "all" ? products.length : counts.get(c.id)}</span>
              </button>
            );
          })}
        </div>
      )}

      {visible.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} interval={Math.max(3, settings.slideInterval - 1)} />
          ))}
        </div>
      ) : (
        <div className="shop-panel border-dashed py-16 text-center">
          <p className="text-3xl">🔎</p>
          <p className="muted mt-2 text-sm">{vi ? "Không có sản phẩm phù hợp." : "No matching products."}</p>
          <button
            type="button"
            className="btn-ghost mt-4"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            {vi ? "Xoá bộ lọc" : "Clear filters"}
          </button>
        </div>
      )}
    </section>
  );
}
