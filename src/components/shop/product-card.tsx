"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { useShop } from "@/components/shop/shop-provider";
import { discountPercent, formatVnd, isInStock, productImage, type ShopProduct } from "@/lib/shop/types";

// Thẻ sản phẩm: ảnh tự chuyển (lệch nhịp theo vị trí), nhãn giảm giá, nút thêm vào giỏ.
export function ProductCard({ product, index = 0, interval = 4 }: { product: ShopProduct; index?: number; interval?: number }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const { settings, add } = useShop();
  const href = `/shop/san-pham/${product.slug}`;
  const name = product.name[lang] || product.name.vi;
  const off = discountPercent(product);
  const inStock = isInStock(product);
  const lowStock = product.stock !== null && product.stock > 0 && product.stock <= 5;
  const category = settings.categories.find((c) => c.id === product.category);
  const badge = product.badge[lang] || product.badge.vi;
  const stockNote = product.stockNote[lang] || product.stockNote.vi;
  const media = product.media.length ? product.media : [{ url: "" }];

  return (
    <article className="group/card flex flex-col overflow-hidden shop-panel shadow-sm transition hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none">
      <MediaCarousel
        items={media}
        alt={name}
        interval={interval}
        startDelay={(index % 4) * 900}
        frameClassName="rounded-none border-b"
        aspectClassName="aspect-[4/3]"
      >
        {/* Bấm vào ảnh = mở trang sản phẩm; nút ‹ › và chấm chuyển ảnh vẫn nằm trên lớp này. */}
        <Link href={href} className="absolute inset-0 z-[15]" aria-label={name} tabIndex={-1} />
        <div className="pointer-events-none absolute left-3 top-3 z-[16] flex flex-wrap gap-1.5">
          {off > 0 && <span className="rounded-lg bg-rose-600 px-2 py-0.5 text-xs font-bold text-white shadow">-{off}%</span>}
          {badge && <span className="rounded-lg bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900 shadow">{badge}</span>}
          {!inStock && <span className="rounded-lg bg-slate-900/80 px-2 py-0.5 text-xs font-bold text-white">{vi ? "Hết hàng" : "Sold out"}</span>}
        </div>
      </MediaCarousel>

      <div className="flex flex-1 flex-col p-4">
        {category && (
          <p className="muted text-xs">
            {category.icon} {category.label[lang] || category.label.vi}
          </p>
        )}
        <h3 className="mt-1 font-semibold leading-snug">
          <Link href={href} className="line-clamp-2 hover:text-brand-600">
            {name}
          </Link>
        </h3>
        <p className="muted mt-1 line-clamp-2 text-sm">{product.summary[lang] || product.summary.vi}</p>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold text-brand-700 dark:text-brand-300">{product.price ? formatVnd(product.price) : vi ? "Liên hệ" : "Contact"}</span>
            {off > 0 && <span className="muted text-sm line-through">{formatVnd(product.compareAtPrice)}</span>}
          </div>
          <p className={`mt-0.5 text-xs ${!inStock ? "text-rose-600" : lowStock ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {!inStock ? (vi ? "Tạm hết hàng" : "Out of stock") : lowStock ? (vi ? `Chỉ còn ${product.stock}` : `Only ${product.stock} left`) : stockNote || (vi ? "Còn hàng" : "In stock")}
            {product.soldCount > 0 && <span className="muted"> · {vi ? `Đã bán ${product.soldCount}` : `${product.soldCount} sold`}</span>}
          </p>

          {product.options.length > 0 || !product.price ? (
            <Link href={href} className="btn-ghost mt-3 w-full">
              {product.price ? (vi ? "Chọn phân loại" : "Choose options") : vi ? "Xem chi tiết" : "View details"}
            </Link>
          ) : (
            <button
              type="button"
              disabled={!inStock}
              onClick={() =>
                add({ productId: product.id, slug: product.slug, name, image: productImage(product), price: product.price, options: {}, maxQuantity: product.stock })
              }
              className="btn-primary mt-3 w-full"
            >
              {inStock ? (vi ? "🛒 Thêm vào giỏ" : "🛒 Add to cart") : vi ? "Hết hàng" : "Sold out"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
